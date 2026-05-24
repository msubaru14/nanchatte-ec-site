package cart

import (
	"net/http"
	"testing"

	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

func TestToResult(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name            string
		cart            Cart
		wantItemCount   int
		wantTotalAmount int
	}{
		{
			name:            "空カートなら合計金額は0",
			cart:            Cart{},
			wantItemCount:   0,
			wantTotalAmount: 0,
		},
		{
			name: "複数商品なら現在税込価格で合計する",
			cart: Cart{
				Items: []CartItem{
					{
						Quantity: 2,
						Product: product.Product{
							PriceExcludingTax: 1000,
							TaxRate:           product.TaxRate{Rate: 0.10},
						},
					},
					{
						Quantity: 1,
						Product: product.Product{
							PriceExcludingTax: 500,
							TaxRate:           product.TaxRate{Rate: 0.10},
						},
					},
				},
			},
			wantItemCount:   2,
			wantTotalAmount: 2750,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := toResult(tt.cart)

			if len(got.Items) != tt.wantItemCount {
				t.Fatalf("len(toResult().Items) = %d, want %d", len(got.Items), tt.wantItemCount)
			}
			if got.TotalAmount != tt.wantTotalAmount {
				t.Fatalf("toResult().TotalAmount = %d, want %d", got.TotalAmount, tt.wantTotalAmount)
			}
		})
	}
}

func TestToItemResult(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name                  string
		item                  CartItem
		wantPriceIncludingTax int
		wantStockStatus       product.StockStatus
		wantMaxSelectable     int
		wantCanBePurchased    bool
	}{
		{
			name: "販売中で在庫が足りる商品は購入可能",
			item: CartItem{
				Quantity: 2,
				Product: product.Product{
					PriceExcludingTax: 1000,
					StockQuantity:     3,
					LowStockThreshold: 3,
					Status:            product.ProductStatusActive,
					TaxRate:           product.TaxRate{Rate: 0.10},
				},
			},
			wantPriceIncludingTax: 1100,
			wantStockStatus:       product.StockStatusLowStock,
			wantMaxSelectable:     3,
			wantCanBePurchased:    true,
		},
		{
			name: "販売停止商品は購入不可",
			item: CartItem{
				Quantity: 1,
				Product: product.Product{
					StockQuantity:     5,
					LowStockThreshold: 1,
					Status:            product.ProductStatusStopped,
				},
			},
			wantStockStatus:    product.StockStatusInStock,
			wantMaxSelectable:  5,
			wantCanBePurchased: false,
		},
		{
			name: "カート数量が在庫を超える商品は購入不可",
			item: CartItem{
				Quantity: 2,
				Product: product.Product{
					StockQuantity:     1,
					LowStockThreshold: 1,
					Status:            product.ProductStatusActive,
				},
			},
			wantStockStatus:    product.StockStatusLowStock,
			wantMaxSelectable:  1,
			wantCanBePurchased: false,
		},
		{
			name: "在庫なしの商品は購入不可",
			item: CartItem{
				Quantity: 1,
				Product: product.Product{
					StockQuantity:     0,
					LowStockThreshold: 1,
					Status:            product.ProductStatusActive,
				},
			},
			wantStockStatus:    product.StockStatusOutOfStock,
			wantMaxSelectable:  0,
			wantCanBePurchased: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := toItemResult(tt.item)

			if got.PriceIncludingTax != tt.wantPriceIncludingTax {
				t.Fatalf("toItemResult().PriceIncludingTax = %d, want %d", got.PriceIncludingTax, tt.wantPriceIncludingTax)
			}
			if got.StockStatus != tt.wantStockStatus {
				t.Fatalf("toItemResult().StockStatus = %s, want %s", got.StockStatus, tt.wantStockStatus)
			}
			if got.MaxSelectableQuantity != tt.wantMaxSelectable {
				t.Fatalf("toItemResult().MaxSelectableQuantity = %d, want %d", got.MaxSelectableQuantity, tt.wantMaxSelectable)
			}
			if got.CanBePurchased != tt.wantCanBePurchased {
				t.Fatalf("toItemResult().CanBePurchased = %t, want %t", got.CanBePurchased, tt.wantCanBePurchased)
			}
		})
	}
}

func TestServiceAddItem(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		setup        func(*fakeRepository)
		quantity     int
		wantCode     string
		wantQuantity int
	}{
		{
			name:         "商品をカートへ追加できる",
			quantity:     2,
			wantQuantity: 2,
		},
		{
			name: "同一商品を追加すると数量を加算する",
			setup: func(repository *fakeRepository) {
				repository.items[1] = CartItem{CartID: 10, ProductID: 1, Quantity: 2}
			},
			quantity:     1,
			wantQuantity: 3,
		},
		{
			name: "販売停止商品は追加できない",
			setup: func(repository *fakeRepository) {
				repository.products[1].Status = product.ProductStatusStopped
			},
			quantity: 1,
			wantCode: apperror.CodeValidationError,
		},
		{
			name: "追加後数量が在庫を超えると在庫不足を返す",
			setup: func(repository *fakeRepository) {
				repository.items[1] = CartItem{CartID: 10, ProductID: 1, Quantity: 4}
			},
			quantity:     2,
			wantCode:     apperror.CodeOutOfStock,
			wantQuantity: 4,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := newFakeRepository()
			if tt.setup != nil {
				tt.setup(repository)
			}
			service := &Service{repository: repository}

			apiErr := service.AddItem(1, 1, tt.quantity)

			assertAPIErrorCode(t, apiErr, tt.wantCode)
			if got := repository.items[1].Quantity; got != tt.wantQuantity {
				t.Fatalf("quantity = %d, want %d", got, tt.wantQuantity)
			}
		})
	}
}

func TestServiceUpdateItemQuantity(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name         string
		setup        func(*fakeRepository)
		quantity     int
		wantCode     string
		wantQuantity int
	}{
		{
			name:         "数量を指定値へ変更できる",
			quantity:     3,
			wantQuantity: 3,
		},
		{
			name:         "在庫を超える数量へ変更すると在庫不足を返す",
			quantity:     6,
			wantCode:     apperror.CodeOutOfStock,
			wantQuantity: 1,
		},
		{
			name: "販売停止商品は数量を変更できない",
			setup: func(repository *fakeRepository) {
				repository.products[1].Status = product.ProductStatusStopped
			},
			quantity:     2,
			wantCode:     apperror.CodeValidationError,
			wantQuantity: 1,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := newFakeRepository()
			repository.items[1] = CartItem{CartID: 10, ProductID: 1, Quantity: 1}
			if tt.setup != nil {
				tt.setup(repository)
			}
			service := &Service{repository: repository}

			apiErr := service.UpdateItemQuantity(1, 1, tt.quantity)

			assertAPIErrorCode(t, apiErr, tt.wantCode)
			if repository.transactionCalls != 1 {
				t.Fatalf("transaction calls = %d, want %d", repository.transactionCalls, 1)
			}
			if repository.findForUpdateCalls != 1 {
				t.Fatalf("find for update calls = %d, want %d", repository.findForUpdateCalls, 1)
			}
			if got := repository.items[1].Quantity; got != tt.wantQuantity {
				t.Fatalf("quantity = %d, want %d", got, tt.wantQuantity)
			}
		})
	}
}

func TestServiceDeleteItems(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name          string
		delete        func(*Service) *apperror.APIError
		wantRemaining int
		wantProduct2  bool
	}{
		{
			name: "指定商品だけを削除できる",
			delete: func(service *Service) *apperror.APIError {
				return service.DeleteItem(1, 1)
			},
			wantRemaining: 1,
			wantProduct2:  true,
		},
		{
			name: "カート内商品をすべて削除できる",
			delete: func(service *Service) *apperror.APIError {
				return service.DeleteAllItems(1)
			},
			wantRemaining: 0,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := newFakeRepository()
			repository.items[1] = CartItem{CartID: 10, ProductID: 1, Quantity: 1}
			repository.items[2] = CartItem{CartID: 10, ProductID: 2, Quantity: 1}
			service := &Service{repository: repository}

			apiErr := tt.delete(service)

			assertAPIErrorCode(t, apiErr, "")
			if got := len(repository.items); got != tt.wantRemaining {
				t.Fatalf("remaining item count = %d, want %d", got, tt.wantRemaining)
			}
			if _, ok := repository.items[2]; ok != tt.wantProduct2 {
				t.Fatalf("product 2 exists = %t, want %t", ok, tt.wantProduct2)
			}
		})
	}
}

func TestOutOfStockMapsToConflict(t *testing.T) {
	t.Parallel()

	if got := apperror.MapErrorCodeToStatus(apperror.CodeOutOfStock); got != http.StatusConflict {
		t.Fatalf("MapErrorCodeToStatus(CodeOutOfStock) = %d, want %d", got, http.StatusConflict)
	}
}

type fakeRepository struct {
	cart               Cart
	products           map[int64]*product.Product
	items              map[int64]CartItem
	transactionCalls   int
	findForUpdateCalls int
}

func newFakeRepository() *fakeRepository {
	return &fakeRepository{
		cart: Cart{ID: 10, UserID: 1},
		products: map[int64]*product.Product{
			1: {
				ID:            1,
				StockQuantity: 5,
				Status:        product.ProductStatusActive,
			},
		},
		items: make(map[int64]CartItem),
	}
}

func (r *fakeRepository) Transaction(fn func(repository) error) error {
	r.transactionCalls++
	return fn(r)
}

func (r *fakeRepository) FindByUserID(userID int64) (*Cart, error) {
	if r.cart.UserID != userID {
		return nil, gorm.ErrRecordNotFound
	}

	return &r.cart, nil
}

func (r *fakeRepository) FindByUserIDForUpdate(userID int64) (*Cart, error) {
	r.findForUpdateCalls++
	return r.FindByUserID(userID)
}

func (r *fakeRepository) FindProductByID(productID int64) (*product.Product, error) {
	itemProduct, ok := r.products[productID]
	if !ok {
		return nil, gorm.ErrRecordNotFound
	}

	return itemProduct, nil
}

func (r *fakeRepository) FindItem(cartID int64, productID int64) (*CartItem, error) {
	item, ok := r.items[productID]
	if !ok || item.CartID != cartID {
		return nil, gorm.ErrRecordNotFound
	}

	return &item, nil
}

func (r *fakeRepository) AddItem(cartID int64, productID int64, quantity int) error {
	item := r.items[productID]
	item.CartID = cartID
	item.ProductID = productID
	item.Quantity += quantity
	r.items[productID] = item
	return nil
}

func (r *fakeRepository) UpdateItemQuantity(cartID int64, productID int64, quantity int) (int64, error) {
	item, ok := r.items[productID]
	if !ok || item.CartID != cartID {
		return 0, nil
	}

	item.Quantity = quantity
	r.items[productID] = item
	return 1, nil
}

func (r *fakeRepository) DeleteItem(cartID int64, productID int64) (int64, error) {
	item, ok := r.items[productID]
	if !ok || item.CartID != cartID {
		return 0, nil
	}

	delete(r.items, productID)
	return 1, nil
}

func (r *fakeRepository) DeleteAllItems(cartID int64) error {
	for productID, item := range r.items {
		if item.CartID == cartID {
			delete(r.items, productID)
		}
	}

	return nil
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
