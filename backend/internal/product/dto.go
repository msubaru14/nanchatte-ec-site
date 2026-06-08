package product

import "time"

type ProductListQuery struct{}

type ProductResponse struct {
	ID                int64            `json:"id"`
	Name              string           `json:"name"`
	Description       *string          `json:"description"`
	PriceIncludingTax int              `json:"priceIncludingTax"`
	Category          CategoryResponse `json:"category"`
	Status            ProductStatus    `json:"status"`
	StockStatus       StockStatus      `json:"stockStatus"`
	ImageURL          *string          `json:"imageUrl"`
	ReleasedAt        *string          `json:"releasedAt"`
	MakerName         *string          `json:"makerName"`
	ModelNumber       *string          `json:"modelNumber"`
}

type AdminProductListResponse struct {
	Products []AdminProductResponse `json:"products"`
}

type AdminProductResponse struct {
	ProductID         int64         `json:"productId"`
	Name              string        `json:"name"`
	Description       *string       `json:"description"`
	Price             int           `json:"price"`
	TaxRateID         int64         `json:"taxRateId"`
	TaxRate           float64       `json:"taxRate"`
	CategoryID        int64         `json:"categoryId"`
	StockQuantity     int           `json:"stockQuantity"`
	LowStockThreshold int           `json:"lowStockThreshold"`
	Status            ProductStatus `json:"status"`
	CreatedAt         time.Time     `json:"createdAt"`
	UpdatedAt         time.Time     `json:"updatedAt"`
}

type AdminProductCreateInput struct {
	Name              string
	Description       *string
	Price             *int
	TaxRateID         *int64
	CategoryID        *int64
	StockQuantity     *int
	LowStockThreshold *int
	Status            ProductStatus
}

type AdminProductUpdateInput struct {
	Name              *string
	Description       *string
	Price             *int
	TaxRateID         *int64
	CategoryID        *int64
	StockQuantity     *int
	LowStockThreshold *int
}

type adminProductCreateRequest struct {
	Name              string        `json:"name"`
	Description       *string       `json:"description"`
	Price             *int          `json:"price"`
	TaxRateID         *int64        `json:"taxRateId"`
	CategoryID        *int64        `json:"categoryId"`
	StockQuantity     *int          `json:"stockQuantity"`
	LowStockThreshold *int          `json:"lowStockThreshold"`
	Status            ProductStatus `json:"status"`
}

type adminProductUpdateRequest struct {
	Name              *string `json:"name"`
	Description       *string `json:"description"`
	Price             *int    `json:"price"`
	TaxRateID         *int64  `json:"taxRateId"`
	CategoryID        *int64  `json:"categoryId"`
	StockQuantity     *int    `json:"stockQuantity"`
	LowStockThreshold *int    `json:"lowStockThreshold"`
}

type CategoryResponse struct {
	ID   int64  `json:"id"`
	Name string `json:"name"`
}

type StockStatus string

const (
	StockStatusInStock    StockStatus = "in_stock"
	StockStatusLowStock   StockStatus = "low_stock"
	StockStatusOutOfStock StockStatus = "out_of_stock"
)
