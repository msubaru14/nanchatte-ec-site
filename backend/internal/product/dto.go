package product

type ProductListQuery struct{}

type ProductResponse struct {
	ID                int64            `json:"id"`
	Name              string           `json:"name"`
	Description       *string          `json:"description"`
	PriceExcludingTax int              `json:"priceExcludingTax"`
	PriceIncludingTax int              `json:"priceIncludingTax"`
	Category          CategoryResponse `json:"category"`
	TaxRate           TaxRateResponse  `json:"taxRate"`
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

type TaxRateResponse struct {
	ID   int64   `json:"id"`
	Name string  `json:"name"`
	Rate float64 `json:"rate"`
}

type StockStatus string

const (
	StockStatusInStock    StockStatus = "in_stock"
	StockStatusLowStock   StockStatus = "low_stock"
	StockStatusOutOfStock StockStatus = "out_of_stock"
)
