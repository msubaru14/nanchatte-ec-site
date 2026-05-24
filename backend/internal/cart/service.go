package cart

import (
	"errors"
	"math"

	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

type Service struct {
	repository repository
}

type repository interface {
	Transaction(fn func(repository) error) error
	FindByUserID(userID int64) (*Cart, error)
	FindByUserIDForUpdate(userID int64) (*Cart, error)
	FindProductByID(productID int64) (*product.Product, error)
	FindItem(cartID int64, productID int64) (*CartItem, error)
	AddItem(cartID int64, productID int64, quantity int) error
	UpdateItemQuantity(cartID int64, productID int64, quantity int) (int64, error)
	DeleteItem(cartID int64, productID int64) (int64, error)
	DeleteAllItems(cartID int64) error
}

type Result struct {
	Items       []ItemResult
	TotalAmount int
}

type ItemResult struct {
	ProductID         int64
	Name              string
	ImageURL          *string
	PriceIncludingTax int
	StockStatus       product.StockStatus
	Quantity          int
	CanBePurchased    bool
}

func NewService(db *gorm.DB) *Service {
	return &Service{
		repository: NewRepository(db),
	}
}

func (s *Service) GetCart(userID int64) (*Result, *apperror.APIError) {
	cart, err := s.repository.FindByUserID(userID)
	if err != nil {
		return nil, mapRepositoryError(err, "cart not found")
	}

	result := toResult(*cart)
	return &result, nil
}

func (s *Service) AddItem(userID int64, productID int64, quantity int) *apperror.APIError {
	err := s.repository.Transaction(func(repository repository) error {
		cart, err := repository.FindByUserIDForUpdate(userID)
		if err != nil {
			return mapRepositoryError(err, "cart not found")
		}

		itemProduct, err := repository.FindProductByID(productID)
		if err != nil {
			return mapRepositoryError(err, "product not found")
		}
		if itemProduct.Status != product.ProductStatusActive {
			return productNotActiveValidationError()
		}

		currentQuantity := 0
		item, err := repository.FindItem(cart.ID, productID)
		if err == nil {
			currentQuantity = item.Quantity
		} else if !errors.Is(err, gorm.ErrRecordNotFound) {
			return err
		}
		if currentQuantity+quantity > itemProduct.StockQuantity {
			return apperror.NewOutOfStock()
		}

		return repository.AddItem(cart.ID, productID, quantity)
	})
	if err != nil {
		return toAPIError(err)
	}

	return nil
}

func (s *Service) UpdateItemQuantity(userID int64, productID int64, quantity int) *apperror.APIError {
	err := s.repository.Transaction(func(repository repository) error {
		cart, err := repository.FindByUserIDForUpdate(userID)
		if err != nil {
			return mapRepositoryError(err, "cart not found")
		}

		itemProduct, err := repository.FindProductByID(productID)
		if err != nil {
			return mapRepositoryError(err, "product not found")
		}
		if itemProduct.Status != product.ProductStatusActive {
			return productNotActiveValidationError()
		}
		if quantity > itemProduct.StockQuantity {
			return apperror.NewOutOfStock()
		}

		rowsAffected, err := repository.UpdateItemQuantity(cart.ID, productID, quantity)
		if err != nil {
			return err
		}
		if rowsAffected == 0 {
			return apperror.NewNotFound("cart item not found")
		}

		return nil
	})
	if err != nil {
		return toAPIError(err)
	}

	return nil
}

func (s *Service) DeleteItem(userID int64, productID int64) *apperror.APIError {
	cart, err := s.repository.FindByUserID(userID)
	if err != nil {
		return mapRepositoryError(err, "cart not found")
	}

	rowsAffected, err := s.repository.DeleteItem(cart.ID, productID)
	if err != nil {
		return apperror.NewInternalServerError()
	}
	if rowsAffected == 0 {
		return apperror.NewNotFound("cart item not found")
	}

	return nil
}

func (s *Service) DeleteAllItems(userID int64) *apperror.APIError {
	cart, err := s.repository.FindByUserID(userID)
	if err != nil {
		return mapRepositoryError(err, "cart not found")
	}

	if err := s.repository.DeleteAllItems(cart.ID); err != nil {
		return apperror.NewInternalServerError()
	}

	return nil
}

func toResult(cart Cart) Result {
	result := Result{
		Items: make([]ItemResult, 0, len(cart.Items)),
	}

	for _, item := range cart.Items {
		itemResult := toItemResult(item)
		result.Items = append(result.Items, itemResult)
		result.TotalAmount += itemResult.PriceIncludingTax * itemResult.Quantity
	}

	return result
}

func toItemResult(item CartItem) ItemResult {
	itemProduct := item.Product
	canBePurchased := itemProduct.Status == product.ProductStatusActive &&
		itemProduct.StockQuantity >= item.Quantity &&
		itemProduct.StockQuantity > 0

	return ItemResult{
		ProductID:         itemProduct.ID,
		Name:              itemProduct.Name,
		ImageURL:          itemProduct.ImageURL,
		PriceIncludingTax: priceIncludingTax(itemProduct.PriceExcludingTax, itemProduct.TaxRate.Rate),
		StockStatus:       stockStatus(itemProduct.StockQuantity, itemProduct.LowStockThreshold),
		Quantity:          item.Quantity,
		CanBePurchased:    canBePurchased,
	}
}

func priceIncludingTax(priceExcludingTax int, taxRate float64) int {
	return int(math.Floor(float64(priceExcludingTax) * (1 + taxRate)))
}

func stockStatus(stockQuantity int, lowStockThreshold int) product.StockStatus {
	if stockQuantity == 0 {
		return product.StockStatusOutOfStock
	}
	if stockQuantity <= lowStockThreshold {
		return product.StockStatusLowStock
	}

	return product.StockStatusInStock
}

func mapRepositoryError(err error, notFoundMessage string) *apperror.APIError {
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return apperror.NewNotFound(notFoundMessage)
	}

	return apperror.NewInternalServerError()
}

func toAPIError(err error) *apperror.APIError {
	var apiErr *apperror.APIError
	if errors.As(err, &apiErr) {
		return apiErr
	}

	return apperror.NewInternalServerError()
}

func productNotActiveValidationError() *apperror.APIError {
	return apperror.NewValidationError("validation error", []apperror.ErrorDetail{
		{Field: "productId", Code: apperror.DetailInvalidFormat, Message: "product is not available"},
	})
}
