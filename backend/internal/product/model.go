package product

import "time"

type ProductStatus string

const (
	ProductStatusActive  ProductStatus = "active"
	ProductStatusStopped ProductStatus = "stopped"
)

type Product struct {
	ID                int64  `gorm:"primaryKey"`
	Name              string `gorm:"not null"`
	Description       *string
	PriceExcludingTax int   `gorm:"not null"`
	TaxRateID         int64 `gorm:"not null"`
	CategoryID        int64 `gorm:"not null"`
	MakerName         *string
	ModelNumber       *string
	StockQuantity     int           `gorm:"not null"`
	LowStockThreshold int           `gorm:"not null"`
	Status            ProductStatus `gorm:"not null"`
	ImageURL          *string
	ReleasedAt        *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	Category          Category
	TaxRate           TaxRate
}

type Category struct {
	ID        int64  `gorm:"primaryKey"`
	Name      string `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}

type TaxRate struct {
	ID        int64   `gorm:"primaryKey"`
	Name      string  `gorm:"not null"`
	Rate      float64 `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
}
