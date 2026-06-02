package review

import (
	"errors"
	"testing"
	"time"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"gorm.io/gorm"
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

func TestServiceListPublishedReviews(t *testing.T) {
	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name          string
		productExists bool
		reviews       []PublishedReviewResult
		wantErrCode   string
	}{
		{
			name:          "商品のpublishedレビュー一覧を取得できる",
			productExists: true,
			reviews: []PublishedReviewResult{
				{ReviewID: 2, ReviewerName: "Bob", Rating: 4, CreatedAt: createdAt, UpdatedAt: createdAt},
				{ReviewID: 1, ReviewerName: "Alice", Rating: 5, CreatedAt: createdAt.Add(-time.Hour), UpdatedAt: createdAt.Add(-time.Hour)},
			},
		},
		{
			name:          "レビューがない場合は空配列を返す",
			productExists: true,
			reviews:       []PublishedReviewResult{},
		},
		{
			name:          "商品が存在しないならNot Found",
			productExists: false,
			wantErrCode:   apperror.CodeNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{
				productExists:    tt.productExists,
				publishedReviews: tt.reviews,
			}
			service := &Service{repository: repository}

			result, apiErr := service.ListPublishedReviews(20)

			if tt.wantErrCode != "" {
				if apiErr == nil {
					t.Fatalf("apiErr = nil, want %s", tt.wantErrCode)
				}
				if apiErr.Code != tt.wantErrCode {
					t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, tt.wantErrCode)
				}
				return
			}

			if apiErr != nil {
				t.Fatalf("apiErr = %#v, want nil", apiErr)
			}
			if len(result.Reviews) != len(tt.reviews) {
				t.Fatalf("reviews length = %d, want %d", len(result.Reviews), len(tt.reviews))
			}
		})
	}
}

func TestServiceListPublishedReviewsRepositoryError(t *testing.T) {
	tests := []struct {
		name      string
		configure func(*fakeRepository)
	}{
		{
			name: "商品確認でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productErr = errors.New("db error")
			},
		},
		{
			name: "レビュー一覧取得でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productExists = true
				r.listReviewsErr = errors.New("db error")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{}
			tt.configure(repository)
			service := &Service{repository: repository}

			_, apiErr := service.ListPublishedReviews(20)

			if apiErr == nil {
				t.Fatal("apiErr = nil, want error")
			}
			if apiErr.Code != apperror.CodeInternalServerError {
				t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, apperror.CodeInternalServerError)
			}
		})
	}
}

func TestServiceGetReviewSummary(t *testing.T) {
	tests := []struct {
		name          string
		productExists bool
		summary       *SummaryResult
		wantErrCode   string
	}{
		{
			name:          "商品のpublishedレビュー概要を取得できる",
			productExists: true,
			summary:       &SummaryResult{AverageRating: 4.5, ReviewCount: 2},
		},
		{
			name:          "レビューがない場合は0を返す",
			productExists: true,
			summary:       &SummaryResult{AverageRating: 0, ReviewCount: 0},
		},
		{
			name:          "商品が存在しないならNot Found",
			productExists: false,
			wantErrCode:   apperror.CodeNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{
				productExists: tt.productExists,
				summary:       tt.summary,
			}
			service := &Service{repository: repository}

			result, apiErr := service.GetReviewSummary(20)

			if tt.wantErrCode != "" {
				if apiErr == nil {
					t.Fatalf("apiErr = nil, want %s", tt.wantErrCode)
				}
				if apiErr.Code != tt.wantErrCode {
					t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, tt.wantErrCode)
				}
				return
			}

			if apiErr != nil {
				t.Fatalf("apiErr = %#v, want nil", apiErr)
			}
			if result.AverageRating != tt.summary.AverageRating {
				t.Fatalf("AverageRating = %v, want %v", result.AverageRating, tt.summary.AverageRating)
			}
			if result.ReviewCount != tt.summary.ReviewCount {
				t.Fatalf("ReviewCount = %d, want %d", result.ReviewCount, tt.summary.ReviewCount)
			}
		})
	}
}

func TestServiceGetReviewSummaryRepositoryError(t *testing.T) {
	tests := []struct {
		name      string
		configure func(*fakeRepository)
	}{
		{
			name: "商品確認でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productErr = errors.New("db error")
			},
		},
		{
			name: "概要取得でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.productExists = true
				r.summaryErr = errors.New("db error")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{}
			tt.configure(repository)
			service := &Service{repository: repository}

			_, apiErr := service.GetReviewSummary(20)

			if apiErr == nil {
				t.Fatal("apiErr = nil, want error")
			}
			if apiErr.Code != apperror.CodeInternalServerError {
				t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, apperror.CodeInternalServerError)
			}
		})
	}
}

func TestServiceListMyReviews(t *testing.T) {
	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name    string
		reviews []MyReviewResult
	}{
		{
			name: "自分のレビュー一覧を取得できる",
			reviews: []MyReviewResult{
				{
					ReviewID:    1,
					ProductID:   20,
					ProductName: "HHKB",
					Rating:      5,
					Status:      StatusDraft,
					CreatedAt:   createdAt,
					UpdatedAt:   createdAt,
				},
			},
		},
		{
			name:    "レビューがない場合は空配列を返す",
			reviews: []MyReviewResult{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{myReviews: tt.reviews}
			service := &Service{repository: repository}

			result, apiErr := service.ListMyReviews(10)

			if apiErr != nil {
				t.Fatalf("apiErr = %#v, want nil", apiErr)
			}
			if len(result.Reviews) != len(tt.reviews) {
				t.Fatalf("reviews length = %d, want %d", len(result.Reviews), len(tt.reviews))
			}
		})
	}
}

func TestServiceListMyReviewsRepositoryError(t *testing.T) {
	repository := &fakeRepository{myReviewsErr: errors.New("db error")}
	service := &Service{repository: repository}

	_, apiErr := service.ListMyReviews(10)

	if apiErr == nil {
		t.Fatal("apiErr = nil, want error")
	}
	if apiErr.Code != apperror.CodeInternalServerError {
		t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, apperror.CodeInternalServerError)
	}
}

func TestServiceGetMyReviewDetail(t *testing.T) {
	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name        string
		review      *MyReviewDetailResult
		reviewErr   error
		wantErrCode string
	}{
		{
			name: "自分のレビュー詳細を取得できる",
			review: &MyReviewDetailResult{
				ReviewID:    1,
				ProductID:   20,
				ProductName: "HHKB",
				Rating:      5,
				Status:      StatusDraft,
				CreatedAt:   createdAt,
				UpdatedAt:   createdAt,
			},
		},
		{
			name:        "レビューが存在しないならNot Found",
			reviewErr:   gorm.ErrRecordNotFound,
			wantErrCode: apperror.CodeNotFound,
		},
		{
			name:        "RepositoryエラーならInternal Server Error",
			reviewErr:   errors.New("db error"),
			wantErrCode: apperror.CodeInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{
				myReviewDetail: tt.review,
				myReviewErr:    tt.reviewErr,
			}
			service := &Service{repository: repository}

			result, apiErr := service.GetMyReviewDetail(10, 1)

			if tt.wantErrCode != "" {
				if apiErr == nil {
					t.Fatalf("apiErr = nil, want %s", tt.wantErrCode)
				}
				if apiErr.Code != tt.wantErrCode {
					t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, tt.wantErrCode)
				}
				return
			}

			if apiErr != nil {
				t.Fatalf("apiErr = %#v, want nil", apiErr)
			}
			if result.ReviewID != tt.review.ReviewID {
				t.Fatalf("ReviewID = %d, want %d", result.ReviewID, tt.review.ReviewID)
			}
			if result.ProductName != tt.review.ProductName {
				t.Fatalf("ProductName = %s, want %s", result.ProductName, tt.review.ProductName)
			}
		})
	}
}

func TestServiceUpdateMyReview(t *testing.T) {
	title := "  更新タイトル  "
	comment := "  更新コメント  "
	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	updatedAt := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)

	tests := []struct {
		name        string
		input       UpdateInput
		review      *Review
		detail      *MyReviewDetailResult
		wantErrCode string
		wantRating  int
		wantTitle   string
	}{
		{
			name:  "draftレビューを更新できる",
			input: UpdateInput{Rating: 4, Title: &title, Comment: &comment},
			review: &Review{
				ID:        1,
				UserID:    10,
				ProductID: 20,
				Rating:    5,
				Status:    StatusDraft,
				CreatedAt: createdAt,
				UpdatedAt: createdAt,
			},
			detail: &MyReviewDetailResult{
				ReviewID:    1,
				ProductID:   20,
				ProductName: "HHKB",
				Rating:      4,
				Title:       stringPtr("更新タイトル"),
				Comment:     stringPtr("更新コメント"),
				Status:      StatusDraft,
				CreatedAt:   createdAt,
				UpdatedAt:   updatedAt,
			},
			wantRating: 4,
			wantTitle:  "更新タイトル",
		},
		{
			name:        "ratingが0ならエラー",
			input:       UpdateInput{Rating: 0},
			wantErrCode: apperror.CodeValidationError,
		},
		{
			name:        "commentありtitleなしならエラー",
			input:       UpdateInput{Rating: 4, Comment: stringPtr("本文")},
			wantErrCode: apperror.CodeValidationError,
		},
		{
			name:        "レビューが存在しないならNot Found",
			input:       UpdateInput{Rating: 4},
			wantErrCode: apperror.CodeNotFound,
		},
		{
			name:  "publishedレビューは編集不可",
			input: UpdateInput{Rating: 4},
			review: &Review{
				ID:        1,
				UserID:    10,
				ProductID: 20,
				Rating:    5,
				Status:    StatusPublished,
			},
			wantErrCode: apperror.CodeValidationError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{
				reviewModel:    tt.review,
				myReviewDetail: tt.detail,
			}
			if tt.review == nil && tt.wantErrCode == apperror.CodeNotFound {
				repository.reviewModelErr = gorm.ErrRecordNotFound
			}
			service := &Service{repository: repository}

			result, apiErr := service.UpdateMyReview(10, 1, tt.input)

			if tt.wantErrCode != "" {
				if apiErr == nil {
					t.Fatalf("apiErr = nil, want %s", tt.wantErrCode)
				}
				if apiErr.Code != tt.wantErrCode {
					t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, tt.wantErrCode)
				}
				if repository.updatedRating != 0 {
					t.Fatalf("updatedRating = %d, want 0", repository.updatedRating)
				}
				return
			}

			if apiErr != nil {
				t.Fatalf("apiErr = %#v, want nil", apiErr)
			}
			if repository.updatedRating != tt.wantRating {
				t.Fatalf("updatedRating = %d, want %d", repository.updatedRating, tt.wantRating)
			}
			if stringValue(repository.updatedTitle) != tt.wantTitle {
				t.Fatalf("updatedTitle = %q, want %q", stringValue(repository.updatedTitle), tt.wantTitle)
			}
			if result.Rating != tt.wantRating {
				t.Fatalf("result.Rating = %d, want %d", result.Rating, tt.wantRating)
			}
		})
	}
}

func TestServiceUpdateMyReviewRepositoryError(t *testing.T) {
	tests := []struct {
		name      string
		configure func(*fakeRepository)
	}{
		{
			name: "レビュー取得でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.reviewModelErr = errors.New("db error")
			},
		},
		{
			name: "更新でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.reviewModel = &Review{ID: 1, UserID: 10, ProductID: 20, Rating: 5, Status: StatusDraft}
				r.updateErr = errors.New("db error")
			},
		},
		{
			name: "詳細再取得でRepositoryエラーならInternal Server Error",
			configure: func(r *fakeRepository) {
				r.reviewModel = &Review{ID: 1, UserID: 10, ProductID: 20, Rating: 5, Status: StatusDraft}
				r.myReviewErr = errors.New("db error")
			},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			repository := &fakeRepository{}
			tt.configure(repository)
			service := &Service{repository: repository}

			_, apiErr := service.UpdateMyReview(10, 1, UpdateInput{Rating: 4})

			if apiErr == nil {
				t.Fatal("apiErr = nil, want error")
			}
			if apiErr.Code != apperror.CodeInternalServerError {
				t.Fatalf("apiErr.Code = %s, want %s", apiErr.Code, apperror.CodeInternalServerError)
			}
		})
	}
}

type fakeRepository struct {
	productExists    bool
	reviewExists     bool
	purchased        bool
	publishedReviews []PublishedReviewResult
	myReviews        []MyReviewResult
	myReviewDetail   *MyReviewDetailResult
	reviewModel      *Review
	summary          *SummaryResult
	now              time.Time
	productErr       error
	reviewErr        error
	listReviewsErr   error
	myReviewsErr     error
	myReviewErr      error
	reviewModelErr   error
	updateErr        error
	summaryErr       error
	purchaseErr      error
	createErr        error
	createdReview    *Review
	updatedRating    int
	updatedTitle     *string
	updatedComment   *string
}

func (r *fakeRepository) ProductExists(productID int64) (bool, error) {
	return r.productExists, r.productErr
}

func (r *fakeRepository) ReviewExists(userID int64, productID int64) (bool, error) {
	return r.reviewExists, r.reviewErr
}

func (r *fakeRepository) ListPublishedReviewsByProductID(productID int64) ([]PublishedReviewResult, error) {
	return r.publishedReviews, r.listReviewsErr
}

func (r *fakeRepository) ListReviewsByUserID(userID int64) ([]MyReviewResult, error) {
	return r.myReviews, r.myReviewsErr
}

func (r *fakeRepository) FindReviewByIDAndUserID(reviewID int64, userID int64) (*MyReviewDetailResult, error) {
	return r.myReviewDetail, r.myReviewErr
}

func (r *fakeRepository) FindReviewModelByIDAndUserID(reviewID int64, userID int64) (*Review, error) {
	return r.reviewModel, r.reviewModelErr
}

func (r *fakeRepository) UpdateReviewContent(reviewID int64, userID int64, rating int, title *string, comment *string) (*Review, error) {
	r.updatedRating = rating
	r.updatedTitle = title
	r.updatedComment = comment
	if r.updateErr != nil {
		return nil, r.updateErr
	}

	if r.reviewModel == nil {
		return nil, gorm.ErrRecordNotFound
	}

	r.reviewModel.Rating = rating
	r.reviewModel.Title = title
	r.reviewModel.Comment = comment
	return r.reviewModel, nil
}

func (r *fakeRepository) GetPublishedReviewSummary(productID int64) (*SummaryResult, error) {
	return r.summary, r.summaryErr
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
