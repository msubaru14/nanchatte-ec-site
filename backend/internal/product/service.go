package product

import (
	"errors"
	"math"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

type Service struct {
	repository *Repository
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
