package review

import (
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
