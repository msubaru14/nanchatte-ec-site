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

func (r *Repository) ListPublishedReviewsByProductID(productID int64) ([]PublishedReviewResult, error) {
	var reviews []PublishedReviewResult
	err := r.db.Table("reviews").
		Select(`
			reviews.id AS review_id,
			CASE
				WHEN users.deleted_at IS NULL THEN users.name
				ELSE '退会済みユーザー'
			END AS reviewer_name,
			reviews.rating,
			reviews.title,
			reviews.comment,
			reviews.created_at,
			reviews.updated_at
		`).
		Joins("JOIN users ON users.id = reviews.user_id").
		Where("reviews.product_id = ?", productID).
		Where("reviews.status = ?", StatusPublished).
		Order("reviews.created_at DESC").
		Scan(&reviews).Error
	if err != nil {
		return nil, err
	}

	return reviews, nil
}

func (r *Repository) ListReviewsByUserID(userID int64) ([]MyReviewResult, error) {
	var reviews []MyReviewResult
	err := r.db.Table("reviews").
		Select(`
			reviews.id AS review_id,
			reviews.product_id,
			products.name AS product_name,
			reviews.rating,
			reviews.title,
			reviews.comment,
			reviews.status,
			reviews.created_at,
			reviews.updated_at
		`).
		Joins("JOIN products ON products.id = reviews.product_id").
		Where("reviews.user_id = ?", userID).
		Order("reviews.created_at DESC").
		Scan(&reviews).Error
	if err != nil {
		return nil, err
	}

	return reviews, nil
}

func (r *Repository) FindReviewByIDAndUserID(reviewID int64, userID int64) (*MyReviewDetailResult, error) {
	var review MyReviewDetailResult
	err := r.db.Table("reviews").
		Select(`
			reviews.id AS review_id,
			reviews.product_id,
			products.name AS product_name,
			reviews.rating,
			reviews.title,
			reviews.comment,
			reviews.status,
			reviews.created_at,
			reviews.updated_at
		`).
		Joins("JOIN products ON products.id = reviews.product_id").
		Where("reviews.id = ? AND reviews.user_id = ?", reviewID, userID).
		First(&review).Error
	if err != nil {
		return nil, err
	}

	return &review, nil
}

func (r *Repository) FindReviewModelByIDAndUserID(reviewID int64, userID int64) (*Review, error) {
	var review Review
	err := r.db.
		Where("id = ? AND user_id = ?", reviewID, userID).
		First(&review).Error
	if err != nil {
		return nil, err
	}

	return &review, nil
}

func (r *Repository) UpdateReviewContent(reviewID int64, userID int64, rating int, title *string, comment *string) (*Review, error) {
	values := map[string]any{
		"rating":  rating,
		"title":   title,
		"comment": comment,
	}

	if err := r.db.Model(&Review{}).
		Where("id = ? AND user_id = ?", reviewID, userID).
		Updates(values).
		Error; err != nil {
		return nil, err
	}

	return r.FindReviewModelByIDAndUserID(reviewID, userID)
}

func (r *Repository) GetPublishedReviewSummary(productID int64) (*SummaryResult, error) {
	var result SummaryResult
	err := r.db.Model(&Review{}).
		Select("COALESCE(AVG(rating), 0) AS average_rating, COUNT(*) AS review_count").
		Where("product_id = ?", productID).
		Where("status = ?", StatusPublished).
		Scan(&result).Error
	if err != nil {
		return nil, err
	}

	return &result, nil
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
