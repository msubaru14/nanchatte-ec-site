package order

import (
	"time"

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

func (r *Repository) ListOrdersByUserID(userID int64) ([]OrderSummaryResult, error) {
	var orders []OrderSummaryResult
	err := r.db.Table("orders").
		Select(`
			orders.id AS order_id,
			orders.order_number,
			orders.order_status,
			orders.total_including_tax,
			orders.ordered_at,
			COALESCE(SUM(order_items.quantity), 0) AS item_count
		`).
		Joins("LEFT JOIN order_items ON order_items.order_id = orders.id").
		Where("orders.user_id = ?", userID).
		Group("orders.id, orders.order_number, orders.order_status, orders.total_including_tax, orders.ordered_at").
		Order("orders.ordered_at DESC").
		Scan(&orders).Error
	if err != nil {
		return nil, err
	}

	return orders, nil
}

func (r *Repository) ListAdminOrders() ([]AdminOrderSummaryResult, error) {
	var orders []AdminOrderSummaryResult
	err := r.db.Table("orders").
		Select(`
			orders.id AS order_id,
			orders.order_number,
			orders.user_id,
			users.name AS user_name,
			users.email AS user_email,
			orders.order_status,
			orders.total_including_tax,
			orders.ordered_at,
			orders.canceled_at,
			COALESCE(SUM(order_items.quantity), 0) AS item_count
		`).
		Joins("JOIN users ON users.id = orders.user_id").
		Joins("LEFT JOIN order_items ON order_items.order_id = orders.id").
		Group("orders.id, orders.order_number, orders.user_id, users.name, users.email, orders.order_status, orders.total_including_tax, orders.ordered_at, orders.canceled_at").
		Order("orders.ordered_at DESC").
		Order("orders.id DESC").
		Scan(&orders).Error
	if err != nil {
		return nil, err
	}

	return orders, nil
}

func (r *Repository) FindOrderByIDAndUserID(orderID int64, userID int64) (*Order, error) {
	var order Order
	err := r.db.
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("id ASC")
		}).
		Where("id = ? AND user_id = ?", orderID, userID).
		First(&order).
		Error
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *Repository) FindAdminOrderByID(orderID int64) (*AdminOrderRecord, error) {
	var order AdminOrderRecord
	err := r.db.Table("orders").
		Select(`
			orders.id AS order_id,
			orders.order_number,
			orders.user_id,
			users.name AS user_name,
			users.email AS user_email,
			orders.order_status,
			orders.total_excluding_tax,
			orders.total_tax,
			orders.total_including_tax,
			orders.ordered_at,
			orders.canceled_at
		`).
		Joins("JOIN users ON users.id = orders.user_id").
		Where("orders.id = ?", orderID).
		Take(&order).Error
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *Repository) ListOrderItemsByOrderID(orderID int64) ([]OrderItem, error) {
	var items []OrderItem
	err := r.db.
		Where("order_id = ?", orderID).
		Order("id ASC").
		Find(&items).Error
	if err != nil {
		return nil, err
	}

	return items, nil
}

func (r *Repository) FindOrderByIDForUpdate(orderID int64) (*Order, error) {
	var order Order
	err := r.db.
		Clauses(clause.Locking{Strength: "UPDATE"}).
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("id ASC")
		}).
		Where("id = ?", orderID).
		First(&order).Error
	if err != nil {
		return nil, err
	}

	return &order, nil
}

func (r *Repository) UpdateOrderCanceled(orderID int64, canceledAt time.Time) (int64, error) {
	result := r.db.Model(&Order{}).
		Where("id = ?", orderID).
		Updates(map[string]interface{}{
			"order_status": OrderStatusCanceled,
			"canceled_at":  canceledAt,
		})

	return result.RowsAffected, result.Error
}

func (r *Repository) IncrementProductStock(productID int64, quantity int) (int64, error) {
	result := r.db.Model(&product.Product{}).
		Where("id = ?", productID).
		Update("stock_quantity", gorm.Expr("stock_quantity + ?", quantity))

	return result.RowsAffected, result.Error
}
