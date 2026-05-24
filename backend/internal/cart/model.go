package cart

import (
	"time"

	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
)

type Cart struct {
	ID        int64 `gorm:"primaryKey"`
	UserID    int64 `gorm:"not null;unique"`
	CreatedAt time.Time
	UpdatedAt time.Time
	Items     []CartItem `gorm:"foreignKey:CartID"`
}

type CartItem struct {
	ID        int64 `gorm:"primaryKey"`
	CartID    int64 `gorm:"not null;uniqueIndex:uq_cart_items_cart_product"`
	ProductID int64 `gorm:"not null;uniqueIndex:uq_cart_items_cart_product"`
	Quantity  int   `gorm:"not null"`
	CreatedAt time.Time
	UpdatedAt time.Time
	Product   product.Product
}
