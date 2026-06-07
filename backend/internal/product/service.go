package product

import (
	"errors"
	"math"
	"strings"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

type productRepository interface {
	FindActiveProducts(criteria ProductSearchCriteria) ([]Product, error)
	FindActiveProductByID(id int64) (*Product, error)
	FindAdminProducts() ([]Product, error)
	FindAdminProductByID(id int64) (*Product, error)
	CreateProduct(product *Product) error
	UpdateProduct(productID int64, updates map[string]interface{}) (*Product, error)
	UpdateProductStatus(productID int64, status ProductStatus) (*Product, error)
}

type Service struct {
	repository productRepository
}

func NewService(db *gorm.DB) *Service {
	return &Service{
		repository: NewRepository(db),
	}
}

func (s *Service) ListProducts(query ProductListQuery) ([]ProductResponse, *apperror.APIError) {
	products, err := s.repository.FindActiveProducts(ProductSearchCriteria{
		Query: query,
	})
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	responses := make([]ProductResponse, 0, len(products))
	for _, product := range products {
		responses = append(responses, toProductResponse(product))
	}

	return responses, nil
}

func (s *Service) GetProduct(id int64) (*ProductResponse, *apperror.APIError) {
	product, err := s.repository.FindActiveProductByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewNotFound("product not found")
		}
		return nil, apperror.NewInternalServerError()
	}

	response := toProductResponse(*product)
	return &response, nil
}

func (s *Service) ListAdminProducts() (*AdminProductListResponse, *apperror.APIError) {
	products, err := s.repository.FindAdminProducts()
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	responses := make([]AdminProductResponse, 0, len(products))
	for _, product := range products {
		responses = append(responses, toAdminProductResponse(product))
	}

	return &AdminProductListResponse{Products: responses}, nil
}

func (s *Service) GetAdminProduct(id int64) (*AdminProductResponse, *apperror.APIError) {
	product, apiErr := s.findAdminProduct(id)
	if apiErr != nil {
		return nil, apiErr
	}

	response := toAdminProductResponse(*product)
	return &response, nil
}

func (s *Service) CreateAdminProduct(input AdminProductCreateInput) (*AdminProductResponse, *apperror.APIError) {
	if details := validateAdminProductCreateInput(input); len(details) > 0 {
		return nil, apperror.NewValidationError("validation error", details)
	}

	product := &Product{
		Name:              strings.TrimSpace(input.Name),
		Description:       normalizeOptionalString(input.Description),
		PriceExcludingTax: *input.Price,
		TaxRateID:         *input.TaxRateID,
		CategoryID:        *input.CategoryID,
		StockQuantity:     *input.StockQuantity,
		LowStockThreshold: *input.LowStockThreshold,
		Status:            input.Status,
	}
	if err := s.repository.CreateProduct(product); err != nil {
		return nil, apperror.NewInternalServerError()
	}

	created, apiErr := s.findAdminProduct(product.ID)
	if apiErr != nil {
		return nil, apiErr
	}
	response := toAdminProductResponse(*created)
	return &response, nil
}

func (s *Service) UpdateAdminProduct(productID int64, input AdminProductUpdateInput) (*AdminProductResponse, *apperror.APIError) {
	if details := validateAdminProductUpdateInput(input); len(details) > 0 {
		return nil, apperror.NewValidationError("validation error", details)
	}

	if _, apiErr := s.findAdminProduct(productID); apiErr != nil {
		return nil, apiErr
	}

	updates := adminProductUpdates(input)
	if len(updates) == 0 {
		product, apiErr := s.findAdminProduct(productID)
		if apiErr != nil {
			return nil, apiErr
		}
		response := toAdminProductResponse(*product)
		return &response, nil
	}

	product, err := s.repository.UpdateProduct(productID, updates)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewNotFound("product not found")
		}
		return nil, apperror.NewInternalServerError()
	}

	response := toAdminProductResponse(*product)
	return &response, nil
}

func (s *Service) StopSellingAdminProduct(productID int64) (*AdminProductResponse, *apperror.APIError) {
	return s.updateAdminProductStatus(productID, ProductStatusStopped)
}

func (s *Service) ResumeSellingAdminProduct(productID int64) (*AdminProductResponse, *apperror.APIError) {
	return s.updateAdminProductStatus(productID, ProductStatusActive)
}

func (s *Service) updateAdminProductStatus(productID int64, status ProductStatus) (*AdminProductResponse, *apperror.APIError) {
	product, err := s.repository.UpdateProductStatus(productID, status)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewNotFound("product not found")
		}
		return nil, apperror.NewInternalServerError()
	}

	response := toAdminProductResponse(*product)
	return &response, nil
}

func (s *Service) findAdminProduct(id int64) (*Product, *apperror.APIError) {
	product, err := s.repository.FindAdminProductByID(id)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewNotFound("product not found")
		}
		return nil, apperror.NewInternalServerError()
	}

	return product, nil
}

func toProductResponse(product Product) ProductResponse {
	var releasedAt *string
	if product.ReleasedAt != nil {
		formatted := product.ReleasedAt.Format("2006-01-02")
		releasedAt = &formatted
	}

	return ProductResponse{
		ID:                product.ID,
		Name:              product.Name,
		Description:       product.Description,
		PriceIncludingTax: priceIncludingTax(product.PriceExcludingTax, product.TaxRate.Rate),
		Category: CategoryResponse{
			ID:   product.Category.ID,
			Name: product.Category.Name,
		},
		Status:      product.Status,
		StockStatus: stockStatus(product.StockQuantity, product.LowStockThreshold),
		ImageURL:    product.ImageURL,
		ReleasedAt:  releasedAt,
		MakerName:   product.MakerName,
		ModelNumber: product.ModelNumber,
	}
}

func toAdminProductResponse(product Product) AdminProductResponse {
	return AdminProductResponse{
		ProductID:         product.ID,
		Name:              product.Name,
		Description:       product.Description,
		Price:             product.PriceExcludingTax,
		TaxRateID:         product.TaxRateID,
		TaxRate:           product.TaxRate.Rate,
		CategoryID:        product.CategoryID,
		StockQuantity:     product.StockQuantity,
		LowStockThreshold: product.LowStockThreshold,
		Status:            product.Status,
		CreatedAt:         product.CreatedAt,
		UpdatedAt:         product.UpdatedAt,
	}
}

func validateAdminProductCreateInput(input AdminProductCreateInput) []apperror.ErrorDetail {
	var details []apperror.ErrorDetail
	if strings.TrimSpace(input.Name) == "" {
		details = append(details, apperror.ErrorDetail{Field: "name", Code: apperror.DetailRequired, Message: "name is required"})
	}
	details = append(details, validatePositiveIntPointer("price", input.Price, true)...)
	details = append(details, validatePositiveInt64Pointer("taxRateId", input.TaxRateID, true)...)
	details = append(details, validatePositiveInt64Pointer("categoryId", input.CategoryID, true)...)
	details = append(details, validateNonNegativeIntPointer("stockQuantity", input.StockQuantity, true)...)
	details = append(details, validateNonNegativeIntPointer("lowStockThreshold", input.LowStockThreshold, true)...)
	if !validProductStatus(input.Status) {
		details = append(details, apperror.ErrorDetail{Field: "status", Code: apperror.DetailInvalidFormat, Message: "status must be active or stopped"})
	}

	return details
}

func validateAdminProductUpdateInput(input AdminProductUpdateInput) []apperror.ErrorDetail {
	var details []apperror.ErrorDetail
	if input.Name != nil && strings.TrimSpace(*input.Name) == "" {
		details = append(details, apperror.ErrorDetail{Field: "name", Code: apperror.DetailRequired, Message: "name is required"})
	}
	details = append(details, validatePositiveIntPointer("price", input.Price, false)...)
	details = append(details, validatePositiveInt64Pointer("taxRateId", input.TaxRateID, false)...)
	details = append(details, validatePositiveInt64Pointer("categoryId", input.CategoryID, false)...)
	details = append(details, validateNonNegativeIntPointer("stockQuantity", input.StockQuantity, false)...)
	details = append(details, validateNonNegativeIntPointer("lowStockThreshold", input.LowStockThreshold, false)...)

	return details
}

func validatePositiveIntPointer(field string, value *int, required bool) []apperror.ErrorDetail {
	if value == nil {
		if required {
			return []apperror.ErrorDetail{{Field: field, Code: apperror.DetailRequired, Message: field + " is required"}}
		}
		return nil
	}
	if *value <= 0 {
		return []apperror.ErrorDetail{{Field: field, Code: apperror.DetailOutOfRange, Message: field + " must be greater than 0"}}
	}

	return nil
}

func validatePositiveInt64Pointer(field string, value *int64, required bool) []apperror.ErrorDetail {
	if value == nil {
		if required {
			return []apperror.ErrorDetail{{Field: field, Code: apperror.DetailRequired, Message: field + " is required"}}
		}
		return nil
	}
	if *value <= 0 {
		return []apperror.ErrorDetail{{Field: field, Code: apperror.DetailOutOfRange, Message: field + " must be greater than 0"}}
	}

	return nil
}

func validateNonNegativeIntPointer(field string, value *int, required bool) []apperror.ErrorDetail {
	if value == nil {
		if required {
			return []apperror.ErrorDetail{{Field: field, Code: apperror.DetailRequired, Message: field + " is required"}}
		}
		return nil
	}
	if *value < 0 {
		return []apperror.ErrorDetail{{Field: field, Code: apperror.DetailOutOfRange, Message: field + " must be greater than or equal to 0"}}
	}

	return nil
}

func validProductStatus(status ProductStatus) bool {
	return status == ProductStatusActive || status == ProductStatusStopped
}

func normalizeOptionalString(value *string) *string {
	if value == nil {
		return nil
	}
	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func adminProductUpdates(input AdminProductUpdateInput) map[string]interface{} {
	updates := map[string]interface{}{}
	if input.Name != nil {
		updates["name"] = strings.TrimSpace(*input.Name)
	}
	if input.Description != nil {
		updates["description"] = normalizeOptionalString(input.Description)
	}
	if input.Price != nil {
		updates["price_excluding_tax"] = *input.Price
	}
	if input.TaxRateID != nil {
		updates["tax_rate_id"] = *input.TaxRateID
	}
	if input.CategoryID != nil {
		updates["category_id"] = *input.CategoryID
	}
	if input.StockQuantity != nil {
		updates["stock_quantity"] = *input.StockQuantity
	}
	if input.LowStockThreshold != nil {
		updates["low_stock_threshold"] = *input.LowStockThreshold
	}

	return updates
}

func priceIncludingTax(priceExcludingTax int, taxRate float64) int {
	return int(math.Floor(float64(priceExcludingTax) * (1 + taxRate)))
}

func stockStatus(stockQuantity int, lowStockThreshold int) StockStatus {
	if stockQuantity == 0 {
		return StockStatusOutOfStock
	}
	if stockQuantity <= lowStockThreshold {
		return StockStatusLowStock
	}

	return StockStatusInStock
}
