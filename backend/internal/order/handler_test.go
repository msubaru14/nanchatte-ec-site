package order

import (
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

type fakeOrderService struct {
	result *CreateResult
	apiErr *apperror.APIError
}

func (s *fakeOrderService) CreateOrder(userID int64) (*CreateResult, *apperror.APIError) {
	if s.apiErr != nil {
		return nil, s.apiErr
	}

	return s.result, nil
}
