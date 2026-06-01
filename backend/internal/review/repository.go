package review

import (
	"github.com/msubaru14/nanchatte-ec-backend/internal/order"
	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) ProductExists(productID int64) (bool, error) {
	var count int64
	if err := r.db.Model(&product.Product{}).
		Where("id = ?", productID).
		Count(&count).
		Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *Repository) ReviewExists(userID int64, productID int64) (bool, error) {
	var count int64
	if err := r.db.Model(&Review{}).
		Where("user_id = ? AND product_id = ?", userID, productID).
		Count(&count).
		Error; err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *Repository) PurchasedOrderedProduct(userID int64, productID int64) (bool, error) {
	var count int64
	err := r.db.Model(&order.Order{}).
		Joins("JOIN order_items ON order_items.order_id = orders.id").
		Where("orders.user_id = ?", userID).
		Where("orders.order_status = ?", order.OrderStatusOrdered).
		Where("order_items.product_id = ?", productID).
		Count(&count).
		Error
	if err != nil {
		return false, err
	}

	return count > 0, nil
}

func (r *Repository) Create(review *Review) error {
	return r.db.Create(review).Error
}
