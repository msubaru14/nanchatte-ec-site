package cart

import (
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

func (r *Repository) Transaction(fn func(repository) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fn(NewRepository(tx))
	})
}

func (r *Repository) FindByUserID(userID int64) (*Cart, error) {
	return r.findByUserID(userID, clause.Locking{})
}

func (r *Repository) FindByUserIDForUpdate(userID int64) (*Cart, error) {
	return r.findByUserID(userID, clause.Locking{Strength: "UPDATE"})
}

func (r *Repository) findByUserID(userID int64, locking clause.Locking) (*Cart, error) {
	var cart Cart
	query := r.db.
		Preload("Items", func(db *gorm.DB) *gorm.DB {
			return db.Order("id ASC")
		}).
		Preload("Items.Product").
		Preload("Items.Product.TaxRate").
		Where("user_id = ?", userID)
	if locking.Strength != "" {
		query = query.Clauses(locking)
	}
	if err := query.
		First(&cart).
		Error; err != nil {
		return nil, err
	}

	return &cart, nil
}

func (r *Repository) FindProductByID(productID int64) (*product.Product, error) {
	var itemProduct product.Product
	if err := r.db.
		Preload("TaxRate").
		First(&itemProduct, productID).
		Error; err != nil {
		return nil, err
	}

	return &itemProduct, nil
}

func (r *Repository) FindItem(cartID int64, productID int64) (*CartItem, error) {
	var item CartItem
	if err := r.db.
		Where("cart_id = ? AND product_id = ?", cartID, productID).
		First(&item).
		Error; err != nil {
		return nil, err
	}

	return &item, nil
}

func (r *Repository) AddItem(cartID int64, productID int64, quantity int) error {
	item := CartItem{
		CartID:    cartID,
		ProductID: productID,
		Quantity:  quantity,
	}

	return r.db.Clauses(clause.OnConflict{
		Columns: []clause.Column{
			{Name: "cart_id"},
			{Name: "product_id"},
		},
		DoUpdates: clause.Assignments(map[string]interface{}{
			"quantity":   gorm.Expr("cart_items.quantity + EXCLUDED.quantity"),
			"updated_at": gorm.Expr("CURRENT_TIMESTAMP"),
		}),
	}).Create(&item).Error
}

func (r *Repository) UpdateItemQuantity(cartID int64, productID int64, quantity int) (int64, error) {
	result := r.db.Model(&CartItem{}).
		Where("cart_id = ? AND product_id = ?", cartID, productID).
		Update("quantity", quantity)

	return result.RowsAffected, result.Error
}

func (r *Repository) DeleteItem(cartID int64, productID int64) (int64, error) {
	result := r.db.
		Where("cart_id = ? AND product_id = ?", cartID, productID).
		Delete(&CartItem{})

	return result.RowsAffected, result.Error
}

func (r *Repository) DeleteAllItems(cartID int64) error {
	return r.db.
		Where("cart_id = ?", cartID).
		Delete(&CartItem{}).
		Error
}
