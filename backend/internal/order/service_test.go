package order

import (
	"errors"
	"testing"
	"time"

	"github.com/msubaru14/nanchatte-ec-backend/internal/cart"
	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

func TestServiceCreateOrder(t *testing.T) {
	t.Parallel()

	orderedAt := time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name                     string
		setup                    func(*fakeRepository)
		wantCode                 string
		wantOrderCount           int
		wantOrderItemCount       int
		wantDeletedCartItemCount int
		wantStock                int
		wantTotalIncludingTax    int
	}{
		{
			name:                     "カート内商品を注文確定できる",
			wantOrderCount:           1,
			wantOrderItemCount:       1,
			wantDeletedCartItemCount: 1,
			wantStock:                3,
			wantTotalIncludingTax:    2200,
		},
		{
			name: "空カートならEMPTY_CARTを返す",
			setup: func(repository *fakeRepository) {
				repository.cart.Items = nil
			},
			wantCode:  apperror.CodeEmptyCart,
			wantStock: 5,
		},
		{
			name: "販売停止商品が含まれる場合は注文失敗する",
			setup: func(repository *fakeRepository) {
				repository.cart.Items[0].Product.Status = product.ProductStatusStopped
			},
			wantCode:  apperror.CodeValidationError,
			wantStock: 5,
		},
		{
			name: "在庫不足ならOUT_OF_STOCKを返し部分更新しない",
			setup: func(repository *fakeRepository) {
				repository.cart.Items[0].Quantity = 6
			},
			wantCode:  apperror.CodeOutOfStock,
			wantStock: 5,
		},
		{
			name: "在庫減算が失敗した場合もOUT_OF_STOCKを返しtransactionを巻き戻す",
			setup: func(repository *fakeRepository) {
				repository.decrementRowsAffected = 0
			},
			wantCode:  apperror.CodeOutOfStock,
			wantStock: 5,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := newFakeRepository()
			if tt.setup != nil {
				tt.setup(repository)
			}
			service := &Service{
				repository: repository,
				now:        func() time.Time { return orderedAt },
				orderNumberGenerator: func(time.Time) (string, error) {
					return "ORD-20260528-A8K3D2", nil
				},
			}

			result, apiErr := service.CreateOrder(1)

			assertAPIErrorCode(t, apiErr, tt.wantCode)
			if tt.wantCode == "" {
				if result == nil {
					t.Fatal("result = nil, want order result")
				}
				if result.TotalIncludingTax != tt.wantTotalIncludingTax {
					t.Fatalf("total including tax = %d, want %d", result.TotalIncludingTax, tt.wantTotalIncludingTax)
				}
			}
			if got := len(repository.orders); got != tt.wantOrderCount {
				t.Fatalf("order count = %d, want %d", got, tt.wantOrderCount)
			}
			if got := len(repository.orderItems); got != tt.wantOrderItemCount {
				t.Fatalf("order item count = %d, want %d", got, tt.wantOrderItemCount)
			}
			if got := len(repository.deletedCartItemIDs); got != tt.wantDeletedCartItemCount {
				t.Fatalf("deleted cart item count = %d, want %d", got, tt.wantDeletedCartItemCount)
			}
			if got := repository.stockByProductID[1]; got != tt.wantStock {
				t.Fatalf("stock = %d, want %d", got, tt.wantStock)
			}
		})
	}
}

func TestBuildOrderItems(t *testing.T) {
	t.Parallel()

	imageURL := "https://example.com/product.png"
	makerName := "PFU"
	modelNumber := "PD-KB800"
	items := []cart.CartItem{
		{
			ID:        10,
			ProductID: 1,
			Quantity:  2,
			Product: product.Product{
				ID:                1,
				Name:              "HHKB Professional",
				ImageURL:          &imageURL,
				MakerName:         &makerName,
				ModelNumber:       &modelNumber,
				PriceExcludingTax: 2000,
				StockQuantity:     5,
				Status:            product.ProductStatusActive,
				TaxRate:           product.TaxRate{Rate: 0.10},
			},
		},
	}

	orderItems, itemIDs, totalExcludingTax, totalTax, totalIncludingTax, err := buildOrderItems(items)
	if err != nil {
		t.Fatalf("buildOrderItems() error = %v", err)
	}

	if len(orderItems) != 1 {
		t.Fatalf("order item count = %d, want 1", len(orderItems))
	}
	if itemIDs[0] != 10 {
		t.Fatalf("item ID = %d, want 10", itemIDs[0])
	}

	orderItem := orderItems[0]
	if orderItem.ProductName != "HHKB Professional" {
		t.Fatalf("product name = %q, want %q", orderItem.ProductName, "HHKB Professional")
	}
	if orderItem.ProductImageURL != &imageURL {
		t.Fatalf("product image URL pointer mismatch")
	}
	if orderItem.UnitPriceIncludingTax != 2200 {
		t.Fatalf("unit price including tax = %d, want 2200", orderItem.UnitPriceIncludingTax)
	}
	if orderItem.SubtotalExcludingTax != 4000 || orderItem.SubtotalTax != 400 || orderItem.SubtotalIncludingTax != 4400 {
		t.Fatalf("subtotal = (%d, %d, %d), want (4000, 400, 4400)", orderItem.SubtotalExcludingTax, orderItem.SubtotalTax, orderItem.SubtotalIncludingTax)
	}
	if totalExcludingTax != 4000 || totalTax != 400 || totalIncludingTax != 4400 {
		t.Fatalf("total = (%d, %d, %d), want (4000, 400, 4400)", totalExcludingTax, totalTax, totalIncludingTax)
	}
}

func TestGenerateUniqueOrderNumber(t *testing.T) {
	t.Parallel()

	orderedAt := time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)
	repository := newFakeRepository()
	repository.existingOrderNumbers["ORD-20260528-AAAAAA"] = true
	generatedNumbers := []string{"ORD-20260528-AAAAAA", "ORD-20260528-BBBBBB"}
	service := &Service{
		orderNumberGenerator: func(time.Time) (string, error) {
			generated := generatedNumbers[0]
			generatedNumbers = generatedNumbers[1:]
			return generated, nil
		},
	}

	got, err := service.generateUniqueOrderNumber(repository, orderedAt)
	if err != nil {
		t.Fatalf("generateUniqueOrderNumber() error = %v", err)
	}
	if got != "ORD-20260528-BBBBBB" {
		t.Fatalf("order number = %q, want %q", got, "ORD-20260528-BBBBBB")
	}
}

type fakeRepository struct {
	cart                  cart.Cart
	orders                []Order
	orderItems            []OrderItem
	stockByProductID      map[int64]int
	deletedCartItemIDs    []int64
	existingOrderNumbers  map[string]bool
	decrementRowsAffected int64
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		cart: cart.Cart{
			ID:     10,
			UserID: 1,
			Items: []cart.CartItem{
				{
					ID:        100,
					CartID:    10,
					ProductID: 1,
					Quantity:  2,
					Product: product.Product{
						ID:                1,
						Name:              "Keyboard",
						PriceExcludingTax: 1000,
						StockQuantity:     5,
						Status:            product.ProductStatusActive,
						TaxRate:           product.TaxRate{Rate: 0.10},
					},
				},
			},
		},
		stockByProductID:      map[int64]int{1: 5},
		existingOrderNumbers:  make(map[string]bool),
		decrementRowsAffected: 1,
	}
}

func (r *fakeRepository) Transaction(fn func(orderRepository) error) error {
	snapshot := r.snapshot()
	if err := fn(r); err != nil {
		r.restore(snapshot)
		return err
	}

	return nil
}

func (r *fakeRepository) FindCartByUserIDForUpdate(userID int64) (*cart.Cart, error) {
	if r.cart.UserID != userID {
		return nil, gorm.ErrRecordNotFound
	}

	return &r.cart, nil
}

func (r *fakeRepository) CreateOrder(order *Order) error {
	if r.existingOrderNumbers[order.OrderNumber] {
		return errors.New("duplicate order number")
	}

	order.ID = int64(len(r.orders) + 1)
	r.orders = append(r.orders, *order)
	r.existingOrderNumbers[order.OrderNumber] = true
	return nil
}

func (r *fakeRepository) CreateOrderItems(items []OrderItem) error {
	r.orderItems = append(r.orderItems, items...)
	return nil
}

func (r *fakeRepository) DecrementProductStock(productID int64, quantity int) (int64, error) {
	if r.decrementRowsAffected == 0 {
		return 0, nil
	}
	if r.stockByProductID[productID] < quantity {
		return 0, nil
	}

	r.stockByProductID[productID] -= quantity
	return 1, nil
}

func (r *fakeRepository) DeleteCartItems(cartID int64, itemIDs []int64) error {
	r.deletedCartItemIDs = append(r.deletedCartItemIDs, itemIDs...)
	return nil
}

func (r *fakeRepository) OrderNumberExists(orderNumber string) (bool, error) {
	return r.existingOrderNumbers[orderNumber], nil
}

type fakeRepositorySnapshot struct {
	orders               []Order
	orderItems           []OrderItem
	stockByProductID     map[int64]int
	deletedCartItemIDs   []int64
	existingOrderNumbers map[string]bool
}

func (r *fakeRepository) snapshot() fakeRepositorySnapshot {
	return fakeRepositorySnapshot{
		orders:               append([]Order(nil), r.orders...),
		orderItems:           append([]OrderItem(nil), r.orderItems...),
		stockByProductID:     cloneIntMap(r.stockByProductID),
		deletedCartItemIDs:   append([]int64(nil), r.deletedCartItemIDs...),
		existingOrderNumbers: cloneBoolMap(r.existingOrderNumbers),
	}
}

func (r *fakeRepository) restore(snapshot fakeRepositorySnapshot) {
	r.orders = snapshot.orders
	r.orderItems = snapshot.orderItems
	r.stockByProductID = snapshot.stockByProductID
	r.deletedCartItemIDs = snapshot.deletedCartItemIDs
	r.existingOrderNumbers = snapshot.existingOrderNumbers
}

func cloneIntMap(source map[int64]int) map[int64]int {
	cloned := make(map[int64]int, len(source))
	for key, value := range source {
		cloned[key] = value
	}

	return cloned
}

func cloneBoolMap(source map[string]bool) map[string]bool {
	cloned := make(map[string]bool, len(source))
	for key, value := range source {
		cloned[key] = value
	}

	return cloned
}

func assertAPIErrorCode(t *testing.T, apiErr *apperror.APIError, wantCode string) {
	t.Helper()

	if wantCode == "" {
		if apiErr != nil {
			t.Fatalf("api error = %+v, want nil", apiErr)
		}
		return
	}
	if apiErr == nil {
		t.Fatalf("api error = nil, want code %q", wantCode)
	}
	if apiErr.Code != wantCode {
		t.Fatalf("api error code = %q, want %q", apiErr.Code, wantCode)
	}
}
