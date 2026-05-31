package router

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCartRoutesRequireAuthentication(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "カート取得は認証必須", method: http.MethodGet, path: "/api/cart"},
		{name: "商品追加は認証必須", method: http.MethodPost, path: "/api/cart/items"},
		{name: "数量変更は認証必須", method: http.MethodPatch, path: "/api/cart/items/1"},
		{name: "単体削除は認証必須", method: http.MethodDelete, path: "/api/cart/items/1"},
		{name: "全削除は認証必須", method: http.MethodDelete, path: "/api/cart/items"},
	}

	r := SetupRouter(nil)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			res := httptest.NewRecorder()

			r.ServeHTTP(res, req)

			if res.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
			}
		})
	}
}

func TestOrderRoutesRequireAuthentication(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "注文作成は認証必須", method: http.MethodPost, path: "/api/orders"},
		{name: "注文履歴一覧は認証必須", method: http.MethodGet, path: "/api/orders"},
		{name: "注文履歴詳細は認証必須", method: http.MethodGet, path: "/api/orders/1"},
	}

	r := SetupRouter(nil)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			res := httptest.NewRecorder()

			r.ServeHTTP(res, req)

			if res.Code != http.StatusUnauthorized {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusUnauthorized)
			}
		})
	}
}
