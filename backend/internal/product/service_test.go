package product

import (
	"errors"
	"testing"
	"time"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

func TestPriceIncludingTax(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		priceExcludingTax int
		taxRate           float64
		want              int
	}{
		{
			name:              "税率適用確認1",
			priceExcludingTax: 1000,
			taxRate:           0.10,
			want:              1100,
		},
		{
			name:              "税率適用確認2",
			priceExcludingTax: 1000,
			taxRate:           0.08,
			want:              1080,
		},
		{
			name:              "小数点以下を切り捨てる",
			priceExcludingTax: 999,
			taxRate:           0.10,
			want:              1098,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := priceIncludingTax(tt.priceExcludingTax, tt.taxRate)
			if got != tt.want {
				t.Fatalf("priceIncludingTax() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestStockStatus(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		stockQuantity     int
		lowStockThreshold int
		want              StockStatus
	}{
		{
			name:              "在庫なし",
			stockQuantity:     0,
			lowStockThreshold: 3,
			want:              StockStatusOutOfStock,
		},
		{
			name:              "閾値未満なら残りわずか",
			stockQuantity:     2,
			lowStockThreshold: 3,
			want:              StockStatusLowStock,
		},
		{
			name:              "閾値ちょうどなら残りわずか",
			stockQuantity:     3,
			lowStockThreshold: 3,
			want:              StockStatusLowStock,
		},
		{
			name:              "閾値を超えていれば在庫あり",
			stockQuantity:     4,
			lowStockThreshold: 3,
			want:              StockStatusInStock,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := stockStatus(tt.stockQuantity, tt.lowStockThreshold)
			if got != tt.want {
				t.Fatalf("stockStatus() = %s, want %s", got, tt.want)
			}
		})
	}
}

func TestServiceListAdminProducts(t *testing.T) {
	t.Parallel()

	repository := &fakeProductRepository{
		adminProducts: []Product{
			newProductForTest(1, ProductStatusActive),
			newProductForTest(2, ProductStatusStopped),
		},
	}
	service := &Service{repository: repository}

	got, apiErr := service.ListAdminProducts()
	if apiErr != nil {
		t.Fatalf("ListAdminProducts returned error: %v", apiErr)
	}
	if len(got.Products) != 2 {
		t.Fatalf("products length = %d, want 2", len(got.Products))
	}
	if got.Products[1].Status != ProductStatusStopped {
		t.Fatalf("status = %s, want %s", got.Products[1].Status, ProductStatusStopped)
	}
}

func TestServiceGetAdminProduct(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		product    *Product
		err        error
		wantStatus string
	}{
		{
			name:       "販売停止商品も取得できる",
			product:    ptrProduct(newProductForTest(1, ProductStatusStopped)),
			wantStatus: "",
		},
		{
			name:       "存在しない商品ならNot Found",
			err:        gorm.ErrRecordNotFound,
			wantStatus: apperror.CodeNotFound,
		},
		{
			name:       "RepositoryエラーならInternal Server Error",
			err:        errors.New("db error"),
			wantStatus: apperror.CodeInternalServerError,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			service := &Service{repository: &fakeProductRepository{adminProduct: tt.product, findAdminProductErr: tt.err}}
			got, apiErr := service.GetAdminProduct(1)

			if tt.wantStatus != "" {
				if apiErr == nil || apiErr.Code != tt.wantStatus {
					t.Fatalf("apiErr = %v, want code %s", apiErr, tt.wantStatus)
				}
				return
			}
			if apiErr != nil {
				t.Fatalf("GetAdminProduct returned error: %v", apiErr)
			}
			if got.Status != ProductStatusStopped {
				t.Fatalf("status = %s, want %s", got.Status, ProductStatusStopped)
			}
		})
	}
}

func TestServiceCreateAdminProduct(t *testing.T) {
	t.Parallel()

	input := AdminProductCreateInput{
		Name:              "  Keyboard  ",
		Description:       stringPtr("  Good  "),
		Price:             intPtr(12000),
		TaxRateID:         int64Ptr(1),
		CategoryID:        int64Ptr(2),
		StockQuantity:     intPtr(8),
		LowStockThreshold: intPtr(2),
		Status:            ProductStatusActive,
	}
	repository := &fakeProductRepository{}
	service := &Service{repository: repository}

	got, apiErr := service.CreateAdminProduct(input)
	if apiErr != nil {
		t.Fatalf("CreateAdminProduct returned error: %v", apiErr)
	}
	if repository.createdProduct.Name != "Keyboard" {
		t.Fatalf("created name = %q, want Keyboard", repository.createdProduct.Name)
	}
	if got.ProductID != repository.createdProduct.ID {
		t.Fatalf("productId = %d, want %d", got.ProductID, repository.createdProduct.ID)
	}
}

func TestServiceCreateAdminProductValidation(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name      string
		input     AdminProductCreateInput
		wantField string
	}{
		{
			name: "nameが空ならValidation Error",
			input: validAdminProductCreateInput(func(input *AdminProductCreateInput) {
				input.Name = " "
			}),
			wantField: "name",
		},
		{
			name: "priceが0以下ならValidation Error",
			input: validAdminProductCreateInput(func(input *AdminProductCreateInput) {
				input.Price = intPtr(0)
			}),
			wantField: "price",
		},
		{
			name: "stockQuantityが負数ならValidation Error",
			input: validAdminProductCreateInput(func(input *AdminProductCreateInput) {
				input.StockQuantity = intPtr(-1)
			}),
			wantField: "stockQuantity",
		},
		{
			name: "lowStockThresholdが負数ならValidation Error",
			input: validAdminProductCreateInput(func(input *AdminProductCreateInput) {
				input.LowStockThreshold = intPtr(-1)
			}),
			wantField: "lowStockThreshold",
		},
		{
			name: "statusが不正ならValidation Error",
			input: validAdminProductCreateInput(func(input *AdminProductCreateInput) {
				input.Status = ProductStatus("draft")
			}),
			wantField: "status",
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			service := &Service{repository: &fakeProductRepository{}}
			_, apiErr := service.CreateAdminProduct(tt.input)

			if apiErr == nil || apiErr.Code != apperror.CodeValidationError {
				t.Fatalf("apiErr = %v, want Validation Error", apiErr)
			}
			details, ok := apiErr.Details.([]apperror.ErrorDetail)
			if !ok || len(details) == 0 {
				t.Fatalf("details = %#v, want ErrorDetail", apiErr.Details)
			}
			if details[0].Field != tt.wantField {
				t.Fatalf("field = %s, want %s", details[0].Field, tt.wantField)
			}
		})
	}
}

func TestServiceUpdateAdminProduct(t *testing.T) {
	t.Parallel()

	name := "  New Keyboard  "
	stock := 0
	threshold := 0
	repository := &fakeProductRepository{adminProduct: ptrProduct(newProductForTest(1, ProductStatusActive))}
	service := &Service{repository: repository}

	got, apiErr := service.UpdateAdminProduct(1, AdminProductUpdateInput{
		Name:              &name,
		StockQuantity:     &stock,
		LowStockThreshold: &threshold,
	})
	if apiErr != nil {
		t.Fatalf("UpdateAdminProduct returned error: %v", apiErr)
	}
	if repository.updates["name"] != "New Keyboard" {
		t.Fatalf("updated name = %v, want New Keyboard", repository.updates["name"])
	}
	if repository.updates["stock_quantity"] != 0 {
		t.Fatalf("stockQuantity = %v, want 0", repository.updates["stock_quantity"])
	}
	if got.StockQuantity != 0 {
		t.Fatalf("response stockQuantity = %d, want 0", got.StockQuantity)
	}
}

func TestServiceUpdateAdminProductValidation(t *testing.T) {
	t.Parallel()

	emptyName := ""
	price := 0
	stock := -1
	tests := []struct {
		name      string
		input     AdminProductUpdateInput
		wantField string
	}{
		{name: "nameを空にできない", input: AdminProductUpdateInput{Name: &emptyName}, wantField: "name"},
		{name: "priceが0以下ならValidation Error", input: AdminProductUpdateInput{Price: &price}, wantField: "price"},
		{name: "stockQuantityが負数ならValidation Error", input: AdminProductUpdateInput{StockQuantity: &stock}, wantField: "stockQuantity"},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			service := &Service{repository: &fakeProductRepository{adminProduct: ptrProduct(newProductForTest(1, ProductStatusActive))}}
			_, apiErr := service.UpdateAdminProduct(1, tt.input)

			if apiErr == nil || apiErr.Code != apperror.CodeValidationError {
				t.Fatalf("apiErr = %v, want Validation Error", apiErr)
			}
			details := apiErr.Details.([]apperror.ErrorDetail)
			if details[0].Field != tt.wantField {
				t.Fatalf("field = %s, want %s", details[0].Field, tt.wantField)
			}
		})
	}
}

func TestServiceUpdateAdminProductNotFound(t *testing.T) {
	t.Parallel()

	service := &Service{repository: &fakeProductRepository{findAdminProductErr: gorm.ErrRecordNotFound}}
	_, apiErr := service.UpdateAdminProduct(1, AdminProductUpdateInput{Name: stringPtr("Keyboard")})

	if apiErr == nil || apiErr.Code != apperror.CodeNotFound {
		t.Fatalf("apiErr = %v, want Not Found", apiErr)
	}
}

func TestServiceAdminProductStatus(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		current    ProductStatus
		action     func(*Service, int64) (*AdminProductResponse, *apperror.APIError)
		wantStatus ProductStatus
	}{
		{
			name:       "販売中商品を販売停止にできる",
			current:    ProductStatusActive,
			action:     (*Service).StopSellingAdminProduct,
			wantStatus: ProductStatusStopped,
		},
		{
			name:       "販売停止は冪等に扱える",
			current:    ProductStatusStopped,
			action:     (*Service).StopSellingAdminProduct,
			wantStatus: ProductStatusStopped,
		},
		{
			name:       "販売停止商品を販売再開できる",
			current:    ProductStatusStopped,
			action:     (*Service).ResumeSellingAdminProduct,
			wantStatus: ProductStatusActive,
		},
		{
			name:       "販売再開は冪等に扱える",
			current:    ProductStatusActive,
			action:     (*Service).ResumeSellingAdminProduct,
			wantStatus: ProductStatusActive,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			repository := &fakeProductRepository{adminProduct: ptrProduct(newProductForTest(1, tt.current))}
			service := &Service{repository: repository}

			got, apiErr := tt.action(service, 1)
			if apiErr != nil {
				t.Fatalf("status update returned error: %v", apiErr)
			}
			if got.Status != tt.wantStatus {
				t.Fatalf("status = %s, want %s", got.Status, tt.wantStatus)
			}
		})
	}
}

type fakeProductRepository struct {
	adminProducts       []Product
	adminProduct        *Product
	createdProduct      *Product
	updates             map[string]interface{}
	findAdminProductErr error
	createErr           error
	updateErr           error
	statusUpdateErr     error
}

func (r *fakeProductRepository) FindActiveProducts(criteria ProductSearchCriteria) ([]Product, error) {
	return nil, nil
}

func (r *fakeProductRepository) FindActiveProductByID(id int64) (*Product, error) {
	return nil, nil
}

func (r *fakeProductRepository) FindAdminProducts() ([]Product, error) {
	return r.adminProducts, nil
}

func (r *fakeProductRepository) FindAdminProductByID(id int64) (*Product, error) {
	if r.findAdminProductErr != nil {
		return nil, r.findAdminProductErr
	}
	if r.adminProduct == nil {
		product := newProductForTest(id, ProductStatusActive)
		r.adminProduct = &product
	}
	return r.adminProduct, nil
}

func (r *fakeProductRepository) CreateProduct(product *Product) error {
	if r.createErr != nil {
		return r.createErr
	}
	product.ID = 99
	now := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	product.CreatedAt = now
	product.UpdatedAt = now
	product.TaxRate = TaxRate{ID: product.TaxRateID, Rate: 0.1}
	r.createdProduct = product
	r.adminProduct = product
	return nil
}

func (r *fakeProductRepository) UpdateProduct(productID int64, updates map[string]interface{}) (*Product, error) {
	if r.updateErr != nil {
		return nil, r.updateErr
	}
	r.updates = updates
	product, err := r.FindAdminProductByID(productID)
	if err != nil {
		return nil, err
	}
	if name, ok := updates["name"].(string); ok {
		product.Name = name
	}
	if stock, ok := updates["stock_quantity"].(int); ok {
		product.StockQuantity = stock
	}
	if threshold, ok := updates["low_stock_threshold"].(int); ok {
		product.LowStockThreshold = threshold
	}
	return product, nil
}

func (r *fakeProductRepository) UpdateProductStatus(productID int64, status ProductStatus) (*Product, error) {
	if r.statusUpdateErr != nil {
		return nil, r.statusUpdateErr
	}
	product, err := r.FindAdminProductByID(productID)
	if err != nil {
		return nil, err
	}
	product.Status = status
	return product, nil
}

func newProductForTest(productID int64, status ProductStatus) Product {
	now := time.Date(2026, 6, 7, 12, 0, 0, 0, time.UTC)
	return Product{
		ID:                productID,
		Name:              "Keyboard",
		PriceExcludingTax: 12000,
		TaxRateID:         1,
		CategoryID:        2,
		StockQuantity:     8,
		LowStockThreshold: 2,
		Status:            status,
		CreatedAt:         now,
		UpdatedAt:         now,
		TaxRate:           TaxRate{ID: 1, Rate: 0.1},
	}
}

func validAdminProductCreateInput(modify func(*AdminProductCreateInput)) AdminProductCreateInput {
	input := AdminProductCreateInput{
		Name:              "Keyboard",
		Price:             intPtr(12000),
		TaxRateID:         int64Ptr(1),
		CategoryID:        int64Ptr(2),
		StockQuantity:     intPtr(8),
		LowStockThreshold: intPtr(2),
		Status:            ProductStatusActive,
	}
	modify(&input)
	return input
}

func ptrProduct(product Product) *Product {
	return &product
}

func stringPtr(value string) *string {
	return &value
}

func intPtr(value int) *int {
	return &value
}

func int64Ptr(value int64) *int64 {
	return &value
}
