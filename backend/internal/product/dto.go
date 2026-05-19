package product

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
