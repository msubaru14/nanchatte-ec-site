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
	tests := []struct {
		name             string
		path             string
		listResult       *ListResult
		wantStatus       int
		wantProductID    int64
		wantReviewCount  int
		wantReviewerName string
	}{
		{
			name:          "publishedレビュー一覧を取得できる",
			path:          "/api/products/20/reviews",
			wantStatus:    http.StatusOK,
			wantProductID: 20,
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
			wantReviewCount:  1,
			wantReviewerName: "Alice",
		},
		{
			name:       "productIdが不正ならBad Request",
			path:       "/api/products/invalid/reviews",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{listResult: tt.listResult}
			handler := NewHandler(service)
			router := gin.New()
			router.GET("/api/products/:id/reviews", handler.List)

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.productID != tt.wantProductID {
				t.Fatalf("productID = %d, want %d", service.productID, tt.wantProductID)
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
			if len(body.Data.Reviews) != tt.wantReviewCount {
				t.Fatalf("reviews length = %d, want %d", len(body.Data.Reviews), tt.wantReviewCount)
			}
			if body.Data.Reviews[0].ReviewerName != tt.wantReviewerName {
				t.Fatalf("reviewerName = %s, want %s", body.Data.Reviews[0].ReviewerName, tt.wantReviewerName)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerSummary(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name              string
		path              string
		summaryResult     *SummaryResult
		wantStatus        int
		wantProductID     int64
		wantAverageRating float64
		wantReviewCount   int64
	}{
		{
			name:              "レビュー概要を取得できる",
			path:              "/api/products/20/reviews/summary",
			summaryResult:     &SummaryResult{AverageRating: 4.5, ReviewCount: 2},
			wantStatus:        http.StatusOK,
			wantProductID:     20,
			wantAverageRating: 4.5,
			wantReviewCount:   2,
		},
		{
			name:       "productIdが不正ならBad Request",
			path:       "/api/products/invalid/reviews/summary",
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{summaryResult: tt.summaryResult}
			handler := NewHandler(service)
			router := gin.New()
			router.GET("/api/products/:id/reviews/summary", handler.Summary)

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.productID != tt.wantProductID {
				t.Fatalf("productID = %d, want %d", service.productID, tt.wantProductID)
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
			if body.Data.AverageRating != tt.wantAverageRating {
				t.Fatalf("averageRating = %v, want %v", body.Data.AverageRating, tt.wantAverageRating)
			}
			if body.Data.ReviewCount != tt.wantReviewCount {
				t.Fatalf("reviewCount = %d, want %d", body.Data.ReviewCount, tt.wantReviewCount)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerListMine(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name            string
		setUserID       bool
		myReviewsResult *MyReviewsResult
		wantStatus      int
		wantUserID      int64
		wantReviewCount int
		wantProductName string
	}{
		{
			name:       "自分のレビュー一覧を取得できる",
			setUserID:  true,
			wantStatus: http.StatusOK,
			wantUserID: 10,
			myReviewsResult: &MyReviewsResult{
				Reviews: []MyReviewResult{
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
			wantReviewCount: 1,
			wantProductName: "HHKB",
		},
		{
			name:       "userIDがなければUnauthorized",
			wantStatus: http.StatusUnauthorized,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{myReviewsResult: tt.myReviewsResult}
			handler := NewHandler(service)
			router := gin.New()
			router.GET("/api/me/reviews", func(c *gin.Context) {
				if tt.setUserID {
					c.Set("auth.userID", tt.wantUserID)
				}
				handler.ListMine(c)
			})

			req := httptest.NewRequest(http.MethodGet, "/api/me/reviews", nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.userID != tt.wantUserID {
				t.Fatalf("userID = %d, want %d", service.userID, tt.wantUserID)
			}

			var body struct {
				Data struct {
					Reviews []struct {
						ReviewID    int64  `json:"reviewId"`
						ProductID   int64  `json:"productId"`
						ProductName string `json:"productName"`
						Status      Status `json:"status"`
					} `json:"reviews"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if len(body.Data.Reviews) != tt.wantReviewCount {
				t.Fatalf("reviews length = %d, want %d", len(body.Data.Reviews), tt.wantReviewCount)
			}
			if body.Data.Reviews[0].ProductName != tt.wantProductName {
				t.Fatalf("productName = %s, want %s", body.Data.Reviews[0].ProductName, tt.wantProductName)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerListAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name            string
		adminResult     *AdminReviewsResult
		apiErr          *apperror.APIError
		wantStatus      int
		wantReviewCount int
		wantStatusValue Status
	}{
		{
			name:       "管理者レビュー一覧を取得できる",
			wantStatus: http.StatusOK,
			adminResult: &AdminReviewsResult{
				Reviews: []AdminReviewResult{
					{
						ReviewID:     1,
						UserID:       10,
						ReviewerName: "Alice",
						ProductID:    20,
						ProductName:  "HHKB",
						Rating:       5,
						Status:       StatusHidden,
						CreatedAt:    createdAt,
						UpdatedAt:    createdAt,
					},
				},
			},
			wantReviewCount: 1,
			wantStatusValue: StatusHidden,
		},
		{
			name:       "serviceがエラーならエラーレスポンスを返す",
			apiErr:     apperror.NewInternalServerError(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{
				adminReviewsResult: tt.adminResult,
				adminReviewsAPIErr: tt.apiErr,
			}
			handler := NewHandler(service)
			router := gin.New()
			router.GET("/api/admin/reviews", handler.ListAdmin)

			req := httptest.NewRequest(http.MethodGet, "/api/admin/reviews", nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}

			var body struct {
				Data struct {
					Reviews []struct {
						ReviewID     int64  `json:"reviewId"`
						UserID       int64  `json:"userId"`
						ReviewerName string `json:"reviewerName"`
						ProductID    int64  `json:"productId"`
						ProductName  string `json:"productName"`
						Status       Status `json:"status"`
					} `json:"reviews"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if len(body.Data.Reviews) != tt.wantReviewCount {
				t.Fatalf("reviews length = %d, want %d", len(body.Data.Reviews), tt.wantReviewCount)
			}
			if body.Data.Reviews[0].Status != tt.wantStatusValue {
				t.Fatalf("status = %s, want %s", body.Data.Reviews[0].Status, tt.wantStatusValue)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerShowMine(t *testing.T) {
	gin.SetMode(gin.TestMode)

	createdAt := time.Date(2026, 6, 1, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name            string
		path            string
		setUserID       bool
		myReviewDetail  *MyReviewDetailResult
		wantStatus      int
		wantUserID      int64
		wantReviewID    int64
		wantProductName string
	}{
		{
			name:       "自分のレビュー詳細を取得できる",
			path:       "/api/me/reviews/1",
			setUserID:  true,
			wantStatus: http.StatusOK,
			wantUserID: 10,
			myReviewDetail: &MyReviewDetailResult{
				ReviewID:    1,
				ProductID:   20,
				ProductName: "HHKB",
				Rating:      5,
				Status:      StatusDraft,
				CreatedAt:   createdAt,
				UpdatedAt:   createdAt,
			},
			wantReviewID:    1,
			wantProductName: "HHKB",
		},
		{
			name:       "userIDがなければUnauthorized",
			path:       "/api/me/reviews/1",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "reviewIdが不正ならBad Request",
			path:       "/api/me/reviews/invalid",
			setUserID:  true,
			wantUserID: 10,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{myReviewDetail: tt.myReviewDetail}
			handler := NewHandler(service)
			router := gin.New()
			router.GET("/api/me/reviews/:id", func(c *gin.Context) {
				if tt.setUserID {
					c.Set("auth.userID", tt.wantUserID)
				}
				handler.ShowMine(c)
			})

			req := httptest.NewRequest(http.MethodGet, tt.path, nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.userID != tt.wantUserID {
				t.Fatalf("userID = %d, want %d", service.userID, tt.wantUserID)
			}
			if service.reviewID != tt.wantReviewID {
				t.Fatalf("reviewID = %d, want %d", service.reviewID, tt.wantReviewID)
			}

			var body struct {
				Data struct {
					ReviewID    int64  `json:"reviewId"`
					ProductName string `json:"productName"`
					Status      Status `json:"status"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if body.Data.ReviewID != tt.wantReviewID {
				t.Fatalf("reviewId = %d, want %d", body.Data.ReviewID, tt.wantReviewID)
			}
			if body.Data.ProductName != tt.wantProductName {
				t.Fatalf("productName = %s, want %s", body.Data.ProductName, tt.wantProductName)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerUpdateMine(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updatedAt := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name            string
		path            string
		body            string
		setUserID       bool
		result          *MyReviewDetailResult
		wantStatus      int
		wantUserID      int64
		wantReviewID    int64
		wantRating      int
		wantProductName string
	}{
		{
			name:         "自分のdraftレビューを更新できる",
			path:         "/api/me/reviews/1",
			body:         `{"rating":4,"title":"更新タイトル","comment":"更新コメント"}`,
			setUserID:    true,
			wantStatus:   http.StatusOK,
			wantUserID:   10,
			wantReviewID: 1,
			result: &MyReviewDetailResult{
				ReviewID:    1,
				ProductID:   20,
				ProductName: "HHKB",
				Rating:      4,
				Title:       stringPtr("更新タイトル"),
				Comment:     stringPtr("更新コメント"),
				Status:      StatusDraft,
				UpdatedAt:   updatedAt,
			},
			wantRating:      4,
			wantProductName: "HHKB",
		},
		{
			name:       "userIDがなければUnauthorized",
			path:       "/api/me/reviews/1",
			body:       `{"rating":4}`,
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "reviewIdが不正ならBad Request",
			path:       "/api/me/reviews/invalid",
			body:       `{"rating":4}`,
			setUserID:  true,
			wantUserID: 10,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "JSONが不正ならBad Request",
			path:       "/api/me/reviews/1",
			body:       `{`,
			setUserID:  true,
			wantUserID: 10,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{updatedReview: tt.result}
			handler := NewHandler(service)
			router := gin.New()
			router.PATCH("/api/me/reviews/:id", func(c *gin.Context) {
				if tt.setUserID {
					c.Set("auth.userID", tt.wantUserID)
				}
				handler.UpdateMine(c)
			})

			req := httptest.NewRequest(http.MethodPatch, tt.path, bytes.NewBufferString(tt.body))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.userID != tt.wantUserID {
				t.Fatalf("userID = %d, want %d", service.userID, tt.wantUserID)
			}
			if service.reviewID != tt.wantReviewID {
				t.Fatalf("reviewID = %d, want %d", service.reviewID, tt.wantReviewID)
			}
			if service.updateInput.Rating != tt.wantRating {
				t.Fatalf("rating = %d, want %d", service.updateInput.Rating, tt.wantRating)
			}

			var body struct {
				Data struct {
					ReviewID    int64  `json:"reviewId"`
					ProductName string `json:"productName"`
					Rating      int    `json:"rating"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if body.Data.ReviewID != tt.wantReviewID {
				t.Fatalf("reviewId = %d, want %d", body.Data.ReviewID, tt.wantReviewID)
			}
			if body.Data.ProductName != tt.wantProductName {
				t.Fatalf("productName = %s, want %s", body.Data.ProductName, tt.wantProductName)
			}
			if body.Data.Rating != tt.wantRating {
				t.Fatalf("rating = %d, want %d", body.Data.Rating, tt.wantRating)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerPublishMine(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updatedAt := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name             string
		path             string
		setUserID        bool
		result           *MyReviewDetailResult
		wantStatus       int
		wantUserID       int64
		wantReviewID     int64
		wantReviewStatus Status
	}{
		{
			name:         "自分のdraftレビューを公開できる",
			path:         "/api/me/reviews/1/publish",
			setUserID:    true,
			wantStatus:   http.StatusOK,
			wantUserID:   10,
			wantReviewID: 1,
			result: &MyReviewDetailResult{
				ReviewID:    1,
				ProductID:   20,
				ProductName: "HHKB",
				Rating:      5,
				Status:      StatusPublished,
				UpdatedAt:   updatedAt,
			},
			wantReviewStatus: StatusPublished,
		},
		{
			name:       "userIDがなければUnauthorized",
			path:       "/api/me/reviews/1/publish",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "reviewIdが不正ならBad Request",
			path:       "/api/me/reviews/invalid/publish",
			setUserID:  true,
			wantUserID: 10,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{publishedReview: tt.result}
			handler := NewHandler(service)
			router := gin.New()
			router.POST("/api/me/reviews/:id/publish", func(c *gin.Context) {
				if tt.setUserID {
					c.Set("auth.userID", tt.wantUserID)
				}
				handler.PublishMine(c)
			})

			req := httptest.NewRequest(http.MethodPost, tt.path, nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.userID != tt.wantUserID {
				t.Fatalf("userID = %d, want %d", service.userID, tt.wantUserID)
			}
			if service.reviewID != tt.wantReviewID {
				t.Fatalf("reviewID = %d, want %d", service.reviewID, tt.wantReviewID)
			}

			var body struct {
				Data struct {
					ReviewID int64  `json:"reviewId"`
					Status   Status `json:"status"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if body.Data.ReviewID != tt.wantReviewID {
				t.Fatalf("reviewId = %d, want %d", body.Data.ReviewID, tt.wantReviewID)
			}
			if body.Data.Status != tt.wantReviewStatus {
				t.Fatalf("status = %s, want %s", body.Data.Status, tt.wantReviewStatus)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerHideAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updatedAt := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name             string
		path             string
		result           *AdminReviewResult
		apiErr           *apperror.APIError
		wantStatus       int
		wantReviewID     int64
		wantReviewStatus Status
	}{
		{
			name:         "管理者がレビューをhiddenにできる",
			path:         "/api/admin/reviews/1/hide",
			wantStatus:   http.StatusOK,
			wantReviewID: 1,
			result: &AdminReviewResult{
				ReviewID:     1,
				UserID:       10,
				ReviewerName: "Alice",
				ProductID:    20,
				ProductName:  "HHKB",
				Rating:       5,
				Status:       StatusHidden,
				UpdatedAt:    updatedAt,
			},
			wantReviewStatus: StatusHidden,
		},
		{
			name:       "reviewIdが不正ならBad Request",
			path:       "/api/admin/reviews/invalid/hide",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "serviceがNot FoundならNot Foundを返す",
			path:       "/api/admin/reviews/1/hide",
			apiErr:     apperror.NewNotFound("review not found"),
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{
				adminReview:     tt.result,
				hideAdminAPIErr: tt.apiErr,
			}
			handler := NewHandler(service)
			router := gin.New()
			router.POST("/api/admin/reviews/:id/hide", handler.HideAdmin)

			req := httptest.NewRequest(http.MethodPost, tt.path, nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.reviewID != tt.wantReviewID {
				t.Fatalf("reviewID = %d, want %d", service.reviewID, tt.wantReviewID)
			}

			var body struct {
				Data struct {
					ReviewID int64  `json:"reviewId"`
					Status   Status `json:"status"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if body.Data.ReviewID != tt.wantReviewID {
				t.Fatalf("reviewId = %d, want %d", body.Data.ReviewID, tt.wantReviewID)
			}
			if body.Data.Status != tt.wantReviewStatus {
				t.Fatalf("status = %s, want %s", body.Data.Status, tt.wantReviewStatus)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerPublishAdmin(t *testing.T) {
	gin.SetMode(gin.TestMode)

	updatedAt := time.Date(2026, 6, 2, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name             string
		path             string
		result           *AdminReviewResult
		apiErr           *apperror.APIError
		wantStatus       int
		wantReviewID     int64
		wantReviewStatus Status
	}{
		{
			name:         "管理者がhiddenレビューをpublishedに戻せる",
			path:         "/api/admin/reviews/1/publish",
			wantStatus:   http.StatusOK,
			wantReviewID: 1,
			result: &AdminReviewResult{
				ReviewID:     1,
				UserID:       10,
				ReviewerName: "Alice",
				ProductID:    20,
				ProductName:  "HHKB",
				Rating:       5,
				Status:       StatusPublished,
				UpdatedAt:    updatedAt,
			},
			wantReviewStatus: StatusPublished,
		},
		{
			name:       "reviewIdが不正ならBad Request",
			path:       "/api/admin/reviews/invalid/publish",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "serviceがValidation ErrorならBad Requestを返す",
			path:       "/api/admin/reviews/1/publish",
			apiErr:     apperror.NewValidationError("validation error", []apperror.ErrorDetail{{Field: "status", Code: apperror.DetailInvalidFormat, Message: "draft review cannot be published by admin"}}),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "serviceがNot FoundならNot Foundを返す",
			path:       "/api/admin/reviews/1/publish",
			apiErr:     apperror.NewNotFound("review not found"),
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{
				adminReview:        tt.result,
				publishAdminAPIErr: tt.apiErr,
			}
			handler := NewHandler(service)
			router := gin.New()
			router.POST("/api/admin/reviews/:id/publish", handler.PublishAdmin)

			req := httptest.NewRequest(http.MethodPost, tt.path, nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.reviewID != tt.wantReviewID {
				t.Fatalf("reviewID = %d, want %d", service.reviewID, tt.wantReviewID)
			}

			var body struct {
				Data struct {
					ReviewID int64  `json:"reviewId"`
					Status   Status `json:"status"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if body.Data.ReviewID != tt.wantReviewID {
				t.Fatalf("reviewId = %d, want %d", body.Data.ReviewID, tt.wantReviewID)
			}
			if body.Data.Status != tt.wantReviewStatus {
				t.Fatalf("status = %s, want %s", body.Data.Status, tt.wantReviewStatus)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

func TestHandlerDeleteMine(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tests := []struct {
		name         string
		path         string
		setUserID    bool
		wantStatus   int
		wantUserID   int64
		wantReviewID int64
	}{
		{
			name:         "自分のレビューを削除できる",
			path:         "/api/me/reviews/1",
			setUserID:    true,
			wantStatus:   http.StatusOK,
			wantUserID:   10,
			wantReviewID: 1,
		},
		{
			name:       "userIDがなければUnauthorized",
			path:       "/api/me/reviews/1",
			wantStatus: http.StatusUnauthorized,
		},
		{
			name:       "reviewIdが不正ならBad Request",
			path:       "/api/me/reviews/invalid",
			setUserID:  true,
			wantUserID: 10,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			service := &fakeReviewService{}
			handler := NewHandler(service)
			router := gin.New()
			router.DELETE("/api/me/reviews/:id", func(c *gin.Context) {
				if tt.setUserID {
					c.Set("auth.userID", tt.wantUserID)
				}
				handler.DeleteMine(c)
			})

			req := httptest.NewRequest(http.MethodDelete, tt.path, nil)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}
			if service.userID != tt.wantUserID {
				t.Fatalf("userID = %d, want %d", service.userID, tt.wantUserID)
			}
			if service.reviewID != tt.wantReviewID {
				t.Fatalf("reviewID = %d, want %d", service.reviewID, tt.wantReviewID)
			}

			var body struct {
				Data struct {
					Message string `json:"message"`
				} `json:"data"`
				Error any `json:"error"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("json.Unmarshal returned error: %v", err)
			}
			if body.Data.Message != "review deleted" {
				t.Fatalf("message = %s, want review deleted", body.Data.Message)
			}
			if body.Error != nil {
				t.Fatalf("error = %#v, want nil", body.Error)
			}
		})
	}
}

type fakeReviewService struct {
	userID             int64
	productID          int64
	reviewID           int64
	input              CreateInput
	updateInput        UpdateInput
	result             *CreateResult
	listResult         *ListResult
	myReviewsResult    *MyReviewsResult
	adminReviewsResult *AdminReviewsResult
	adminReview        *AdminReviewResult
	myReviewDetail     *MyReviewDetailResult
	updatedReview      *MyReviewDetailResult
	publishedReview    *MyReviewDetailResult
	summaryResult      *SummaryResult
	apiErr             *apperror.APIError
	listAPIError       *apperror.APIError
	myReviewsAPIError  *apperror.APIError
	adminReviewsAPIErr *apperror.APIError
	hideAdminAPIErr    *apperror.APIError
	publishAdminAPIErr *apperror.APIError
	myReviewAPIError   *apperror.APIError
	updateAPIError     *apperror.APIError
	publishAPIError    *apperror.APIError
	deleteAPIError     *apperror.APIError
	summaryAPIError    *apperror.APIError
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

func (s *fakeReviewService) ListMyReviews(userID int64) (*MyReviewsResult, *apperror.APIError) {
	s.userID = userID
	return s.myReviewsResult, s.myReviewsAPIError
}

func (s *fakeReviewService) ListAdminReviews() (*AdminReviewsResult, *apperror.APIError) {
	return s.adminReviewsResult, s.adminReviewsAPIErr
}

func (s *fakeReviewService) HideAdminReview(reviewID int64) (*AdminReviewResult, *apperror.APIError) {
	s.reviewID = reviewID
	return s.adminReview, s.hideAdminAPIErr
}

func (s *fakeReviewService) PublishAdminReview(reviewID int64) (*AdminReviewResult, *apperror.APIError) {
	s.reviewID = reviewID
	return s.adminReview, s.publishAdminAPIErr
}

func (s *fakeReviewService) GetMyReviewDetail(userID int64, reviewID int64) (*MyReviewDetailResult, *apperror.APIError) {
	s.userID = userID
	s.reviewID = reviewID
	return s.myReviewDetail, s.myReviewAPIError
}

func (s *fakeReviewService) UpdateMyReview(userID int64, reviewID int64, input UpdateInput) (*MyReviewDetailResult, *apperror.APIError) {
	s.userID = userID
	s.reviewID = reviewID
	s.updateInput = input
	return s.updatedReview, s.updateAPIError
}

func (s *fakeReviewService) PublishMyReview(userID int64, reviewID int64) (*MyReviewDetailResult, *apperror.APIError) {
	s.userID = userID
	s.reviewID = reviewID
	return s.publishedReview, s.publishAPIError
}

func (s *fakeReviewService) DeleteMyReview(userID int64, reviewID int64) *apperror.APIError {
	s.userID = userID
	s.reviewID = reviewID
	return s.deleteAPIError
}

func (s *fakeReviewService) GetReviewSummary(productID int64) (*SummaryResult, *apperror.APIError) {
	s.productID = productID
	return s.summaryResult, s.summaryAPIError
}
