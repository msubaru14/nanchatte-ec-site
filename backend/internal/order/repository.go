package order

import (
	"github.com/msubaru14/nanchatte-ec-backend/internal/cart"
	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"gorm.io/gorm"
	"gorm.io/gorm/clause"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Transaction(fn func(orderRepository) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fn(NewRepository(tx))
	})
}

func (r *Repository) FindCartByUserIDForUpdate(userID int64) (*cart.Cart, error) {
	var userCart cart.Cart
	if err := r.db.
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("id ASC")
		}).
		Preload("Items.Product").
		Preload("Items.Product.TaxRate").
		Where("user_id = ?", userID).
		First(&userCart).
		Error; err != nil {
		return nil, err
	}

	return &userCart, nil
}

func (r *Repository) CreateOrder(order *Order) error {
	return r.db.Create(order).Error
}

func (r *Repository) CreateOrderItems(items []OrderItem) error {
	if len(items) == 0 {
		return nil
	}

	return r.db.Create(&items).Error
}

func (r *Repository) DecrementProductStock(productID int64, quantity int) (int64, error) {
	result := r.db.Model(&product.Product{}).
		Where("id = ? AND status = ? AND stock_quantity >= ?", productID, product.ProductStatusActive, quantity).
		Update("stock_quantity", gorm.Expr("stock_quantity - ?", quantity))

	return result.RowsAffected, result.Error
}

func (r *Repository) DeleteCartItems(cartID int64, itemIDs []int64) error {
	if len(itemIDs) == 0 {
		return nil
	}

	return r.db.
		Where("cart_id = ? AND id IN ?", cartID, itemIDs).
		Delete(&cart.CartItem{}).
		Error
}

func (r *Repository) OrderNumberExists(orderNumber string) (bool, error) {
	var count int64
	if err := r.db.Model(&Order{}).
		Where("order_number = ?", orderNumber).
		Count(&count).
		Error; err != nil {
		return false, err
	}

	return count > 0, nil
}
