package cart

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
)

func TestValidateAddItemRequest(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name        string
		req         addItemRequest
		wantDetails int
		wantField   string
		wantCode    string
	}{
		{
			name:        "正しい入力はエラーなし",
			req:         addItemRequest{ProductID: 1, Quantity: 1},
			wantDetails: 0,
		},
		{
			name:        "商品IDが未指定ならエラー",
			req:         addItemRequest{Quantity: 1},
			wantDetails: 1,
			wantField:   "productId",
			wantCode:    apperror.DetailRequired,
		},
		{
			name:        "数量が0ならエラー",
			req:         addItemRequest{ProductID: 1, Quantity: 0},
			wantDetails: 1,
			wantField:   "quantity",
			wantCode:    apperror.DetailOutOfRange,
		},
		{
			name:        "数量が負数ならエラー",
			req:         addItemRequest{ProductID: 1, Quantity: -1},
			wantDetails: 1,
			wantField:   "quantity",
			wantCode:    apperror.DetailOutOfRange,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := validateAddItemRequest(tt.req)
			if len(got) != tt.wantDetails {
				t.Fatalf("len(validateAddItemRequest()) = %d, want %d", len(got), tt.wantDetails)
			}
			if tt.wantDetails == 0 {
				return
			}
			if got[0].Field != tt.wantField || got[0].Code != tt.wantCode {
				t.Fatalf("validateAddItemRequest()[0] = %+v, want field=%q code=%q", got[0], tt.wantField, tt.wantCode)
			}
		})
	}
}

func TestAddItemInvalidRequestBody(t *testing.T) {
	tests := []struct {
		name string
		body string
	}{
		{
			name: "商品IDが空文字なら不正なリクエスト",
			body: `{"productId":"","quantity":1}`,
		},
		{
			name: "数量が空文字なら不正なリクエスト",
			body: `{"productId":1,"quantity":""}`,
		},
		{
			name: "数量が文字列なら不正なリクエスト",
			body: `{"productId":1,"quantity":"one"}`,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			handler := NewHandler(nil)
			router.POST("/api/cart/items", func(c *gin.Context) {
				c.Set("auth.userID", int64(1))
				handler.AddItem(c)
			})

			req := httptest.NewRequest(http.MethodPost, "/api/cart/items", strings.NewReader(tt.body))
			req.Header.Set("Content-Type", "application/json")
			res := httptest.NewRecorder()
			router.ServeHTTP(res, req)

			if res.Code != http.StatusBadRequest {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusBadRequest)
			}

			var body struct {
				Error apperror.APIError `json:"error"`
			}
			if err := json.NewDecoder(res.Body).Decode(&body); err != nil {
				t.Fatalf("response body decode failed: %v", err)
			}
			if body.Error.Code != apperror.CodeInvalidRequest {
				t.Fatalf("error code = %q, want %q", body.Error.Code, apperror.CodeInvalidRequest)
			}
		})
	}
}
