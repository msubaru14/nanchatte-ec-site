package order

import "time"

type OrderStatus string

const (
	OrderStatusOrdered  OrderStatus = "ordered"
	OrderStatusCanceled OrderStatus = "canceled"
)

type Order struct {
	ID                int64       `gorm:"primaryKey"`
	OrderNumber       string      `gorm:"not null;unique"`
	UserID            int64       `gorm:"not null"`
	OrderStatus       OrderStatus `gorm:"not null"`
	TotalExcludingTax int         `gorm:"not null"`
	TotalTax          int         `gorm:"not null"`
	TotalIncludingTax int         `gorm:"not null"`
	OrderedAt         time.Time   `gorm:"not null"`
	CanceledAt        *time.Time
	CreatedAt         time.Time
	UpdatedAt         time.Time
	Items             []OrderItem `gorm:"foreignKey:OrderID"`
}

type OrderItem struct {
	ID                    int64  `gorm:"primaryKey"`
	OrderID               int64  `gorm:"not null"`
	ProductID             int64  `gorm:"not null"`
	ProductName           string `gorm:"not null"`
	ProductImageURL       *string
	MakerName             *string
	ModelNumber           *string
	UnitPriceExcludingTax int     `gorm:"not null"`
	TaxRate               float64 `gorm:"not null"`
	UnitPriceIncludingTax int     `gorm:"not null"`
	Quantity              int     `gorm:"not null"`
	SubtotalExcludingTax  int     `gorm:"not null"`
	SubtotalTax           int     `gorm:"not null"`
	SubtotalIncludingTax  int     `gorm:"not null"`
	CreatedAt             time.Time
}
