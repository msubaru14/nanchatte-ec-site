package review

import (
	"errors"
	"testing"
	"time"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
)

func TestServiceCreateReview(t *testing.T) {
	title := "  良い商品  "
	comment := "  使いやすい  "

	tests := []struct {
		name              string
		input             CreateInput
		productExists     bool
		reviewExists      bool
		purchased         bool
		wantErrCode       string
		wantCreatedReview *Review
	}{
		{
			name:          "購入済み商品ならdraftレビューを作成できる",
			input:         CreateInput{Rating: 5, Title: &title, Comment: &comment},
			productExists: true,
			purchased:     true,
			wantCreatedReview: &Review{
				UserID:    10,
				ProductID: 20,
				Rating:    5,
				Title:     stringPtr("良い商品"),
				Comment:   stringPtr("使いやすい"),
				Status:    StatusDraft,
			},
		},
		{
			name:        "ratingが0ならエラー",
			input:       CreateInput{Rating: 0},
			wantErrCode: apperror.CodeValidationError,
		},
		{
			name:        "ratingが6ならエラー",
			input:       CreateInput{Rating: 6},
			wantErrCode: apperror.CodeValidationError,
		},
		{
			name:        "commentありtitleなしならエラー",
			input:       CreateInput{Rating: 4, Comment: stringPtr("本文")},
			wantErrCode: apperror.CodeValidationError,
		},
		{
			name:          "商品が存在しないならNot Found",
			input:         CreateInput{Rating: 4},
			productExists: false,
			wantErrCode:   apperror.CodeNotFound,
		},
		{
			name:          "同一ユーザー同一商品に既存レビューがあればConflict",
			input:         CreateInput{Rating: 4},
			productExists: true,
			reviewExists:  true,
			wantErrCode:   apperror.CodeConflict,
		},
		{
			name:          "未購入商品ならエラー",
			input:         CreateInput{Rating: 4},
			productExists: true,
			purchased:     false,
			wantErrCode:   apperror.CodeValidationError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{
				productExists: tt.productExists,
				reviewExists:  tt.reviewExists,
				purchased:     tt.purchased,
				now:           time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC),
			}
			service := &Service{repository: repository}

			result, apiErr := service.CreateReview(10, 20, tt.input)

			if tt.wantErrCode != "" {
				if apiErr == nil {
					t.Fatalf("apiErr = nil, want %s", tt.wantErrCode)
				}
				if apiErr.Code != tt.wantErrCode {
					t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, tt.wantErrCode)
				}
				if repository.createdReview != nil {
					t.Fatalf("createdReview = %#v, want nil", repository.createdReview)
				}
				return
			}

			if apiErr != nil {
				t.Fatalf("apiErr = %#v, want nil", apiErr)
			}
			assertReview(t, repository.createdReview, tt.wantCreatedReview)
			if result == nil {
				t.Fatal("result = nil")
			}
			if result.Status != StatusDraft {
				t.Fatalf("result.Status = %s, want %s", result.Status, StatusDraft)
			}
		})
	}
}

func TestServiceCreateReviewRepositoryError(t *testing.T) {
	tests := []struct {
		name       string
		configure  func(*fakeRepository)
		wantErr    string
		wantCreate bool
	}{
		{
			name: "商品確認でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productErr = errors.New("db error")
			},
			wantErr: apperror.CodeInternalServerError,
		},
		{
			name: "レビュー重複確認でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productExists = true
				r.reviewErr = errors.New("db error")
			},
			wantErr: apperror.CodeInternalServerError,
		},
		{
			name: "購入済み判定でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productExists = true
				r.purchaseErr = errors.New("db error")
			},
			wantErr: apperror.CodeInternalServerError,
		},
		{
			name: "作成でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productExists = true
				r.purchased = true
				r.createErr = errors.New("db error")
			},
			wantErr:    apperror.CodeInternalServerError,
			wantCreate: true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{}
			tt.configure(repository)
			service := &Service{repository: repository}

			_, apiErr := service.CreateReview(10, 20, CreateInput{Rating: 4})

			if apiErr == nil {
				t.Fatalf("apiErr = nil, want %s", tt.wantErr)
			}
			if apiErr.Code != tt.wantErr {
				t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, tt.wantErr)
			}
			if !tt.wantCreate && repository.createdReview != nil {
				t.Fatalf("createdReview = %#v, want nil", repository.createdReview)
			}
		})
	}
}

type fakeRepository struct {
	productExists bool
	reviewExists  bool
	purchased     bool
	now           time.Time
	productErr    error
	reviewErr     error
	purchaseErr   error
	createErr     error
	createdReview *Review
}

func (r *fakeRepository) ProductExists(productID int64) (bool, error) {
	return r.productExists, r.productErr
}

func (r *fakeRepository) ReviewExists(userID int64, productID int64) (bool, error) {
	return r.reviewExists, r.reviewErr
}

func (r *fakeRepository) PurchasedOrderedProduct(userID int64, productID int64) (bool, error) {
	return r.purchased, r.purchaseErr
}

func (r *fakeRepository) Create(review *Review) error {
	r.createdReview = review
	if r.createErr != nil {
		return r.createErr
	}

	review.ID = 1
	review.CreatedAt = r.now
	review.UpdatedAt = r.now
	return nil
}

func assertReview(t *testing.T, got *Review, want *Review) {
	t.Helper()
	if got == nil {
		t.Fatal("review = nil")
	}
	if got.UserID != want.UserID {
		t.Fatalf("UserID = %d, want %d", got.UserID, want.UserID)
	}
	if got.ProductID != want.ProductID {
		t.Fatalf("ProductID = %d, want %d", got.ProductID, want.ProductID)
	}
	if got.Rating != want.Rating {
		t.Fatalf("Rating = %d, want %d", got.Rating, want.Rating)
	}
	if stringValue(got.Title) != stringValue(want.Title) {
		t.Fatalf("Title = %q, want %q", stringValue(got.Title), stringValue(want.Title))
	}
	if stringValue(got.Comment) != stringValue(want.Comment) {
		t.Fatalf("Comment = %q, want %q", stringValue(got.Comment), stringValue(want.Comment))
	}
	if got.Status != want.Status {
		t.Fatalf("Status = %s, want %s", got.Status, want.Status)
	}
}

func stringPtr(value string) *string {
	return &value
}

func stringValue(value *string) string {
	if value == nil {
		return ""
	}

	return *value
}
