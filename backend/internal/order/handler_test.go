package order

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
)

func TestHandlerCreate(t *testing.T) {
	t.Parallel()

	orderedAt := time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name       string
		apiErr     *apperror.APIError
		wantStatus int
	}{
		{
			name:       "注文作成に成功すると201を返す",
			wantStatus: http.StatusCreated,
		},
		{
			name:       "空カートなら400を返す",
			apiErr:     apperror.NewEmptyCart(),
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "在庫不足なら409を返す",
			apiErr:     &apperror.APIError{Code: apperror.CodeOutOfStock, Message: "out of stock"},
			wantStatus: http.StatusConflict,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gin.SetMode(gin.TestMode)
			r := gin.New()
			handler := NewHandler(&fakeOrderService{
				result: &CreateResult{
					OrderID:           1,
					OrderNumber:       "ORD-20260528-A8K3D2",
					TotalIncludingTax: 2200,
					OrderedAt:         orderedAt,
					Items: []ItemResult{
						{
							ProductID:             1,
							ProductName:           "Keyboard",
							Quantity:              2,
							UnitPriceIncludingTax: 1100,
							SubtotalIncludingTax:  2200,
						},
					},
				},
				apiErr: tt.apiErr,
			})
			r.POST("/api/orders", func(c *gin.Context) {
				c.Set("auth.userID", int64(1))
				handler.Create(c)
			})

			req := httptest.NewRequest(http.MethodPost, "/api/orders", nil)
			res := httptest.NewRecorder()

			r.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
		})
	}
}

func TestHandlerCreateRequiresUserID(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	handler := NewHandler(&fakeOrderService{})
	r.POST("/api/orders", handler.Create)

	req := httptest.NewRequest(http.MethodPost, "/api/orders", nil)
	res := httptest.NewRecorder()

	r.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

func TestHandlerList(t *testing.T) {
	t.Parallel()

	orderedAt := time.Date(2026, 5, 30, 12, 0, 0, 0, time.UTC)
	tests := []struct {
		name           string
		result         *ListResult
		apiErr         *apperror.APIError
		wantStatus     int
		wantOrderCount int
		wantItemCount  int
	}{
		{
			name: "注文履歴一覧を取得できる",
			result: &ListResult{
				Orders: []OrderSummaryResult{
					{
						OrderID:           1,
						OrderNumber:       "ORD-20260530-A8K3D2",
						OrderStatus:       OrderStatusOrdered,
						TotalIncludingTax: 134000,
						OrderedAt:         orderedAt,
						ItemCount:         3,
					},
				},
			},
			wantStatus:     http.StatusOK,
			wantOrderCount: 1,
			wantItemCount:  3,
		},
		{
			name:           "注文が0件なら空配列を返す",
			result:         &ListResult{Orders: []OrderSummaryResult{}},
			wantStatus:     http.StatusOK,
			wantOrderCount: 0,
		},
		{
			name:       "serviceエラーなら500を返す",
			apiErr:     apperror.NewInternalServerError(),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			gin.SetMode(gin.TestMode)
			r := gin.New()
			handler := NewHandler(&fakeOrderService{
				listResult: tt.result,
				apiErr:     tt.apiErr,
			})
			r.GET("/api/orders", func(c *gin.Context) {
				c.Set("auth.userID", int64(1))
				handler.List(c)
			})

			req := httptest.NewRequest(http.MethodGet, "/api/orders", nil)
			res := httptest.NewRecorder()

			r.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
			if tt.wantStatus != http.StatusOK {
				return
			}

			var body struct {
				Data struct {
					Orders []struct {
						ItemCount int `json:"itemCount"`
					} `json:"orders"`
				} `json:"data"`
			}
			if err := json.Unmarshal(res.Body.Bytes(), &body); err != nil {
				t.Fatalf("response JSON decode error: %v", err)
			}
			if got := len(body.Data.Orders); got != tt.wantOrderCount {
				t.Fatalf("order count = %d, want %d", got, tt.wantOrderCount)
			}
			if tt.wantOrderCount > 0 && body.Data.Orders[0].ItemCount != tt.wantItemCount {
				t.Fatalf("item count = %d, want %d", body.Data.Orders[0].ItemCount, tt.wantItemCount)
			}
		})
	}
}

func TestHandlerListRequiresUserID(t *testing.T) {
	t.Parallel()

	gin.SetMode(gin.TestMode)
	r := gin.New()
	handler := NewHandler(&fakeOrderService{})
	r.GET("/api/orders", handler.List)

	req := httptest.NewRequest(http.MethodGet, "/api/orders", nil)
	res := httptest.NewRecorder()

	r.ServeHTTP(res, req)

	if res.Code != http.StatusUnauthorized {
		t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
	}
}

type fakeOrderService struct {
	result     *CreateResult
	listResult *ListResult
	apiErr     *apperror.APIError
}

func (s *fakeOrderService) CreateOrder(userID int64) (*CreateResult, *apperror.APIError) {
	if s.apiErr != nil {
		return nil, s.apiErr
	}

	return s.result, nil
}

func (s *fakeOrderService) ListOrders(userID int64) (*ListResult, *apperror.APIError) {
	if s.apiErr != nil {
		return nil, s.apiErr
	}

	return s.listResult, nil
}
