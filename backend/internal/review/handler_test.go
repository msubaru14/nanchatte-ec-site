package review

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
)

func TestHandlerCreate(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeReviewService{
		result: &CreateResult{
			ReviewID:  1,
			ProductID: 20,
			Rating:    5,
			Title:     stringPtr("良い商品"),
			Comment:   stringPtr("使いやすい"),
			Status:    StatusDraft,
			CreatedAt: time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC),
			UpdatedAt: time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC),
		},
	}
	handler := NewHandler(service)
	router := gin.New()
	router.POST("/api/products/:productId/reviews", func(c *gin.Context) {
		c.Set("auth.userID", int64(10))
		handler.Create(c)
	})

	req := httptest.NewRequest(http.MethodPost, "/api/products/20/reviews", bytes.NewBufferString(`{
		"rating": 5,
		"title": "良い商品",
		"comment": "使いやすい"
	}`))
	req.Header.Set("Content-Type", "application/json")
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusCreated {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusCreated)
	}
	if service.userID != 10 {
		t.Fatalf("userID = %d, want 10", service.userID)
	}
	if service.productID != 20 {
		t.Fatalf("productID = %d, want 20", service.productID)
	}
	if service.input.Rating != 5 {
		t.Fatalf("rating = %d, want 5", service.input.Rating)
	}

	var body struct {
		Data struct {
			ReviewID  int64  `json:"reviewId"`
			ProductID int64  `json:"productId"`
			Status    Status `json:"status"`
		} `json:"data"`
		Error any `json:"error"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("json.Unmarshal returned error: %v", err)
	}
	if body.Data.ReviewID != 1 || body.Data.ProductID != 20 || body.Data.Status != StatusDraft {
		t.Fatalf("response data = %#v", body.Data)
	}
	if body.Error != nil {
		t.Fatalf("error = %#v, want nil", body.Error)
	}
}

func TestHandlerCreateValidation(t *testing.T) {
	tests := []struct {
		name       string
		path       string
		body       string
		setUserID  bool
		wantStatus int
	}{
		{
			name:       "userIDがなければUnauthorized",
			path:       "/api/products/20/reviews",
			body:       `{"rating":5}`,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "productIdが不正ならBad Request",
			path:       "/api/products/invalid/reviews",
			body:       `{"rating":5}`,
			setUserID:  true,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "JSONが不正ならBad Request",
			path:       "/api/products/20/reviews",
			body:       `{`,
			setUserID:  true,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gin.SetMode(gin.TestMode)
			handler := NewHandler(&fakeReviewService{})
			router := gin.New()
			router.POST("/api/products/:productId/reviews", func(c *gin.Context) {
				if tt.setUserID {
					c.Set("auth.userID", int64(10))
				}
				handler.Create(c)
			})

			req := httptest.NewRequest(http.MethodPost, tt.path, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
		})
	}
}

func TestHandlerList(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	service := &fakeReviewService{
		listResult: &ListResult{
			Reviews: []PublishedReviewResult{
				{
					ReviewID:     1,
					ReviewerName: "Alice",
					Rating:       5,
					Title:        stringPtr("良い商品"),
					Comment:      stringPtr("使いやすい"),
					CreatedAt:    createdAt,
					UpdatedAt:    createdAt,
				},
			},
		},
	}
	handler := NewHandler(service)
	router := gin.New()
	router.GET("/api/products/:id/reviews", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/api/products/20/reviews", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if service.productID != 20 {
		t.Fatalf("productID = %d, want 20", service.productID)
	}

	var body struct {
		Data struct {
			Reviews []struct {
				ReviewID     int64  `json:"reviewId"`
				ReviewerName string `json:"reviewerName"`
				Rating       int    `json:"rating"`
			} `json:"reviews"`
		} `json:"data"`
		Error any `json:"error"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("json.Unmarshal returned error: %v", err)
	}
	if len(body.Data.Reviews) != 1 {
		t.Fatalf("reviews length = %d, want 1", len(body.Data.Reviews))
	}
	if body.Data.Reviews[0].ReviewerName != "Alice" {
		t.Fatalf("reviewerName = %s, want Alice", body.Data.Reviews[0].ReviewerName)
	}
	if body.Error != nil {
		t.Fatalf("error = %#v, want nil", body.Error)
	}
}

func TestHandlerListInvalidProductID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewHandler(&fakeReviewService{})
	router := gin.New()
	router.GET("/api/products/:id/reviews", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/api/products/invalid/reviews", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusBadRequest)
	}
}

func TestHandlerSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)

	service := &fakeReviewService{
		summaryResult: &SummaryResult{AverageRating: 4.5, ReviewCount: 2},
	}
	handler := NewHandler(service)
	router := gin.New()
	router.GET("/api/products/:id/reviews/summary", handler.Summary)

	req := httptest.NewRequest(http.MethodGet, "/api/products/20/reviews/summary", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusOK)
	}
	if service.productID != 20 {
		t.Fatalf("productID = %d, want 20", service.productID)
	}

	var body struct {
		Data struct {
			AverageRating float64 `json:"averageRating"`
			ReviewCount   int64   `json:"reviewCount"`
		} `json:"data"`
		Error any `json:"error"`
	}
	if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
		t.Fatalf("json.Unmarshal returned error: %v", err)
	}
	if body.Data.AverageRating != 4.5 {
		t.Fatalf("averageRating = %v, want 4.5", body.Data.AverageRating)
	}
	if body.Data.ReviewCount != 2 {
		t.Fatalf("reviewCount = %d, want 2", body.Data.ReviewCount)
	}
	if body.Error != nil {
		t.Fatalf("error = %#v, want nil", body.Error)
	}
}

func TestHandlerSummaryInvalidProductID(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewHandler(&fakeReviewService{})
	router := gin.New()
	router.GET("/api/products/:id/reviews/summary", handler.Summary)

	req := httptest.NewRequest(http.MethodGet, "/api/products/invalid/reviews/summary", nil)
	res := httptest.NewRecorder()

	router.ServeHTTP(res, req)

	if res.Code != http.StatusBadRequest {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusBadRequest)
	}
}

type fakeReviewService struct {
	userID          int64
	productID       int64
	input           CreateInput
	result          *CreateResult
	listResult      *ListResult
	summaryResult   *SummaryResult
	apiErr          *apperror.APIError
	listAPIError    *apperror.APIError
	summaryAPIError *apperror.APIError
}

func (s *fakeReviewService) CreateReview(userID int64, productID int64, input CreateInput) (*CreateResult, *apperror.APIError) {
	s.userID = userID
	s.productID = productID
	s.input = input
	return s.result, s.apiErr
}

func (s *fakeReviewService) ListPublishedReviews(productID int64) (*ListResult, *apperror.APIError) {
	s.productID = productID
	return s.listResult, s.listAPIError
}

func (s *fakeReviewService) GetReviewSummary(productID int64) (*SummaryResult, *apperror.APIError) {
	s.productID = productID
	return s.summaryResult, s.summaryAPIError
}
