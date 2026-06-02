package review

import (
	"errors"
	"strings"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
)

type Service struct {
	repository repository
}

type repository interface {
	ProductExists(productID int64) (bool, error)
	ReviewExists(userID int64, productID int64) (bool, error)
	ListPublishedReviewsByProductID(productID int64) ([]PublishedReviewResult, error)
	ListReviewsByUserID(userID int64) ([]MyReviewResult, error)
	FindReviewByIDAndUserID(reviewID int64, userID int64) (*MyReviewDetailResult, error)
	GetPublishedReviewSummary(productID int64) (*SummaryResult, error)
	PurchasedOrderedProduct(userID int64, productID int64) (bool, error)
	Create(review *Review) error
}

func NewService(db *gorm.DB) *Service {
	return &Service{repository: NewRepository(db)}
}

func (s *Service) CreateReview(userID int64, productID int64, input CreateInput) (*CreateResult, *apperror.APIError) {
	normalizedInput, details := validateCreateInput(input)
	if len(details) > 0 {
		return nil, apperror.NewValidationError("validation error", details)
	}

	exists, err := s.repository.ProductExists(productID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}
	if !exists {
		return nil, apperror.NewNotFound("product not found")
	}

	reviewExists, err := s.repository.ReviewExists(userID, productID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}
	if reviewExists {
		return nil, apperror.NewConflict("review already exists")
	}

	purchased, err := s.repository.PurchasedOrderedProduct(userID, productID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}
	if !purchased {
		return nil, notPurchasedValidationError()
	}

	newReview := Review{
		UserID:    userID,
		ProductID: productID,
		Rating:    normalizedInput.Rating,
		Title:     normalizedInput.Title,
		Comment:   normalizedInput.Comment,
		Status:    StatusDraft,
	}
	if err := s.repository.Create(&newReview); err != nil {
		return nil, apperror.NewInternalServerError()
	}

	return &CreateResult{
		ReviewID:  newReview.ID,
		ProductID: newReview.ProductID,
		Rating:    newReview.Rating,
		Title:     newReview.Title,
		Comment:   newReview.Comment,
		Status:    newReview.Status,
		CreatedAt: newReview.CreatedAt,
		UpdatedAt: newReview.UpdatedAt,
	}, nil
}

func (s *Service) ListPublishedReviews(productID int64) (*ListResult, *apperror.APIError) {
	exists, err := s.repository.ProductExists(productID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}
	if !exists {
		return nil, apperror.NewNotFound("product not found")
	}

	reviews, err := s.repository.ListPublishedReviewsByProductID(productID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	return &ListResult{Reviews: reviews}, nil
}

func (s *Service) ListMyReviews(userID int64) (*MyReviewsResult, *apperror.APIError) {
	reviews, err := s.repository.ListReviewsByUserID(userID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	return &MyReviewsResult{Reviews: reviews}, nil
}

func (s *Service) GetMyReviewDetail(userID int64, reviewID int64) (*MyReviewDetailResult, *apperror.APIError) {
	review, err := s.repository.FindReviewByIDAndUserID(reviewID, userID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewNotFound("review not found")
		}
		return nil, apperror.NewInternalServerError()
	}

	return review, nil
}

func (s *Service) GetReviewSummary(productID int64) (*SummaryResult, *apperror.APIError) {
	exists, err := s.repository.ProductExists(productID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}
	if !exists {
		return nil, apperror.NewNotFound("product not found")
	}

	summary, err := s.repository.GetPublishedReviewSummary(productID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	return summary, nil
}

func validateCreateInput(input CreateInput) (CreateInput, []apperror.ErrorDetail) {
	details := make([]apperror.ErrorDetail, 0)
	if input.Rating < 1 || input.Rating > 5 {
		details = append(details, apperror.ErrorDetail{
			Field: "rating", Code: apperror.DetailOutOfRange, Message: "rating must be between 1 and 5",
		})
	}

	title := normalizeOptionalText(input.Title)
	comment := normalizeOptionalText(input.Comment)
	if comment != nil && title == nil {
		details = append(details, apperror.ErrorDetail{
			Field: "title", Code: apperror.DetailRequired, Message: "title is required when comment is provided",
		})
	}

	return CreateInput{
		Rating:  input.Rating,
		Title:   title,
		Comment: comment,
	}, details
}

func normalizeOptionalText(value *string) *string {
	if value == nil {
		return nil
	}

	trimmed := strings.TrimSpace(*value)
	if trimmed == "" {
		return nil
	}

	return &trimmed
}

func notPurchasedValidationError() *apperror.APIError {
	return apperror.NewValidationError("validation error", []apperror.ErrorDetail{
		{Field: "productId", Code: apperror.DetailInvalidFormat, Message: "product has not been purchased"},
	})
}
