package order

import (
	"errors"
	"math"
	"time"

	"github.com/msubaru14/nanchatte-ec-backend/internal/cart"
	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

const maxOrderNumberGenerateAttempts = 10

type Service struct {
	repository           orderRepository
	now                  func() time.Time
	orderNumberGenerator func(time.Time) (string, error)
}

type orderRepository interface {
	Transaction(fn func(orderRepository) error) error
	FindCartByUserIDForUpdate(userID int64) (*cart.Cart, error)
	CreateOrder(order *Order) error
	CreateOrderItems(items []OrderItem) error
	DecrementProductStock(productID int64, quantity int) (int64, error)
	DeleteCartItems(cartID int64, itemIDs []int64) error
	OrderNumberExists(orderNumber string) (bool, error)
	ListOrdersByUserID(userID int64) ([]OrderSummaryResult, error)
	FindOrderByIDAndUserID(orderID int64, userID int64) (*Order, error)
}

func NewService(db *gorm.DB) *Service {
	return &Service{
		repository:           NewRepository(db),
		now:                  time.Now,
		orderNumberGenerator: generateOrderNumber,
	}
}

func (s *Service) CreateOrder(userID int64) (*CreateResult, *apperror.APIError) {
	var result *CreateResult
	err := s.repository.Transaction(func(repository orderRepository) error {
		userCart, err := repository.FindCartByUserIDForUpdate(userID)
		if err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				return apperror.NewEmptyCart()
			}
			return err
		}
		if len(userCart.Items) == 0 {
			return apperror.NewEmptyCart()
		}

		orderedAt := s.now()
		orderItems, itemIDs, totalExcludingTax, totalTax, totalIncludingTax, err := buildOrderItems(userCart.Items)
		if err != nil {
			return err
		}

		orderNumber, err := s.generateUniqueOrderNumber(repository, orderedAt)
		if err != nil {
			return err
		}

		newOrder := Order{
			OrderNumber:       orderNumber,
			UserID:            userID,
			OrderStatus:       OrderStatusOrdered,
			TotalExcludingTax: totalExcludingTax,
			TotalTax:          totalTax,
			TotalIncludingTax: totalIncludingTax,
			OrderedAt:         orderedAt,
		}
		if err := repository.CreateOrder(&newOrder); err != nil {
			return err
		}

		for i := range orderItems {
			orderItems[i].OrderID = newOrder.ID
		}
		if err := repository.CreateOrderItems(orderItems); err != nil {
			return err
		}

		for _, item := range userCart.Items {
			rowsAffected, err := repository.DecrementProductStock(item.ProductID, item.Quantity)
			if err != nil {
				return err
			}
			if rowsAffected == 0 {
				return outOfStockError()
			}
		}

		if err := repository.DeleteCartItems(userCart.ID, itemIDs); err != nil {
			return err
		}

		result = toCreateResult(newOrder, orderItems)
		return nil
	})
	if err != nil {
		return nil, toAPIError(err)
	}

	return result, nil
}

func (s *Service) ListOrders(userID int64) (*ListResult, *apperror.APIError) {
	orders, err := s.repository.ListOrdersByUserID(userID)
	if err != nil {
		return nil, toAPIError(err)
	}

	return &ListResult{Orders: orders}, nil
}

func (s *Service) GetOrderDetail(userID int64, orderID int64) (*DetailResult, *apperror.APIError) {
	order, err := s.repository.FindOrderByIDAndUserID(orderID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewNotFound("order not found")
		}
		return nil, toAPIError(err)
	}

	return toDetailResult(*order), nil
}

func (s *Service) generateUniqueOrderNumber(repository orderRepository, orderedAt time.Time) (string, error) {
	for range maxOrderNumberGenerateAttempts {
		orderNumber, err := s.orderNumberGenerator(orderedAt)
		if err != nil {
			return "", err
		}

		exists, err := repository.OrderNumberExists(orderNumber)
		if err != nil {
			return "", err
		}
		if !exists {
			return orderNumber, nil
		}
	}

	return "", errors.New("failed to generate unique order number")
}

func buildOrderItems(cartItems []cart.CartItem) ([]OrderItem, []int64, int, int, int, error) {
	orderItems := make([]OrderItem, 0, len(cartItems))
	itemIDs := make([]int64, 0, len(cartItems))
	var totalExcludingTax int
	var totalTax int
	var totalIncludingTax int

	for _, item := range cartItems {
		if item.Product.Status != product.ProductStatusActive {
			return nil, nil, 0, 0, 0, validationError()
		}
		if item.Product.StockQuantity < item.Quantity || item.Product.StockQuantity == 0 {
			return nil, nil, 0, 0, 0, outOfStockError()
		}

		orderItem := newOrderItem(item)
		orderItems = append(orderItems, orderItem)
		itemIDs = append(itemIDs, item.ID)
		totalExcludingTax += orderItem.SubtotalExcludingTax
		totalTax += orderItem.SubtotalTax
		totalIncludingTax += orderItem.SubtotalIncludingTax
	}

	return orderItems, itemIDs, totalExcludingTax, totalTax, totalIncludingTax, nil
}

func newOrderItem(item cart.CartItem) OrderItem {
	itemProduct := item.Product
	unitPriceIncludingTax := priceIncludingTax(itemProduct.PriceExcludingTax, itemProduct.TaxRate.Rate)
	subtotalExcludingTax := itemProduct.PriceExcludingTax * item.Quantity
	subtotalIncludingTax := unitPriceIncludingTax * item.Quantity

	return OrderItem{
		ProductID:             itemProduct.ID,
		ProductName:           itemProduct.Name,
		ProductImageURL:       itemProduct.ImageURL,
		MakerName:             itemProduct.MakerName,
		ModelNumber:           itemProduct.ModelNumber,
		UnitPriceExcludingTax: itemProduct.PriceExcludingTax,
		TaxRate:               itemProduct.TaxRate.Rate,
		UnitPriceIncludingTax: unitPriceIncludingTax,
		Quantity:              item.Quantity,
		SubtotalExcludingTax:  subtotalExcludingTax,
		SubtotalTax:           subtotalIncludingTax - subtotalExcludingTax,
		SubtotalIncludingTax:  subtotalIncludingTax,
	}
}

func toCreateResult(order Order, items []OrderItem) *CreateResult {
	resultItems := make([]ItemResult, 0, len(items))
	for _, item := range items {
		resultItems = append(resultItems, ItemResult{
			ProductID:             item.ProductID,
			ProductName:           item.ProductName,
			ProductImageURL:       item.ProductImageURL,
			Quantity:              item.Quantity,
			UnitPriceIncludingTax: item.UnitPriceIncludingTax,
			SubtotalIncludingTax:  item.SubtotalIncludingTax,
		})
	}

	return &CreateResult{
		OrderID:           order.ID,
		OrderNumber:       order.OrderNumber,
		TotalIncludingTax: order.TotalIncludingTax,
		OrderedAt:         order.OrderedAt,
		Items:             resultItems,
	}
}

func toDetailResult(order Order) *DetailResult {
	items := make([]DetailItemResult, 0, len(order.Items))
	for _, item := range order.Items {
		items = append(items, DetailItemResult{
			ProductID:             item.ProductID,
			ProductName:           item.ProductName,
			ProductImageURL:       item.ProductImageURL,
			MakerName:             item.MakerName,
			ModelNumber:           item.ModelNumber,
			UnitPriceExcludingTax: item.UnitPriceExcludingTax,
			TaxRate:               item.TaxRate,
			UnitPriceIncludingTax: item.UnitPriceIncludingTax,
			Quantity:              item.Quantity,
			SubtotalExcludingTax:  item.SubtotalExcludingTax,
			SubtotalTax:           item.SubtotalTax,
			SubtotalIncludingTax:  item.SubtotalIncludingTax,
		})
	}

	return &DetailResult{
		OrderID:           order.ID,
		OrderNumber:       order.OrderNumber,
		OrderStatus:       order.OrderStatus,
		TotalExcludingTax: order.TotalExcludingTax,
		TotalTax:          order.TotalTax,
		TotalIncludingTax: order.TotalIncludingTax,
		OrderedAt:         order.OrderedAt,
		Items:             items,
	}
}

func priceIncludingTax(priceExcludingTax int, taxRate float64) int {
	return int(math.Floor(float64(priceExcludingTax) * (1 + taxRate)))
}

func validationError() *apperror.APIError {
	return &apperror.APIError{
		Code:    apperror.CodeValidationError,
		Message: "validation error",
	}
}

func outOfStockError() *apperror.APIError {
	return &apperror.APIError{
		Code:    apperror.CodeOutOfStock,
		Message: "out of stock",
	}
}

func toAPIError(err error) *apperror.APIError {
	var apiErr *apperror.APIError
	if errors.As(err, &apiErr) {
		return apiErr
	}

	return apperror.NewInternalServerError()
}
