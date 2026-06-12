package router

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/msubaru14/nanchatte-ec-backend/internal/auth"
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

func TestReviewRoutesRequireAuthentication(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "レビュー作成は認証必須", method: http.MethodPost, path: "/api/products/1/reviews"},
		{name: "自分のレビュー一覧は認証必須", method: http.MethodGet, path: "/api/me/reviews"},
		{name: "自分のレビュー詳細は認証必須", method: http.MethodGet, path: "/api/me/reviews/1"},
		{name: "自分のレビュー更新は認証必須", method: http.MethodPatch, path: "/api/me/reviews/1"},
		{name: "自分のレビュー公開は認証必須", method: http.MethodPost, path: "/api/me/reviews/1/publish"},
		{name: "自分のレビュー削除は認証必須", method: http.MethodDelete, path: "/api/me/reviews/1"},
		{name: "管理者レビュー一覧は認証必須", method: http.MethodGet, path: "/api/admin/reviews"},
		{name: "管理者レビュー非表示化は認証必須", method: http.MethodPost, path: "/api/admin/reviews/1/hide"},
		{name: "管理者レビュー再公開は認証必須", method: http.MethodPost, path: "/api/admin/reviews/1/publish"},
		{name: "管理者商品一覧は認証必須", method: http.MethodGet, path: "/api/admin/products"},
		{name: "管理者商品詳細は認証必須", method: http.MethodGet, path: "/api/admin/products/1"},
		{name: "管理者商品登録は認証必須", method: http.MethodPost, path: "/api/admin/products"},
		{name: "管理者商品編集は認証必須", method: http.MethodPatch, path: "/api/admin/products/1"},
		{name: "管理者商品販売停止は認証必須", method: http.MethodPost, path: "/api/admin/products/1/stop-selling"},
		{name: "管理者商品販売再開は認証必須", method: http.MethodPost, path: "/api/admin/products/1/resume-selling"},
		{name: "管理者注文一覧は認証必須", method: http.MethodGet, path: "/api/admin/orders"},
		{name: "管理者注文詳細は認証必須", method: http.MethodGet, path: "/api/admin/orders/1"},
		{name: "管理者注文キャンセルは認証必須", method: http.MethodPost, path: "/api/admin/orders/1/cancel"},
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

func TestAdminReviewRoutesRequireAdminRole(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "管理者レビュー一覧はadmin role必須", method: http.MethodGet, path: "/api/admin/reviews"},
		{name: "管理者レビュー非表示化はadmin role必須", method: http.MethodPost, path: "/api/admin/reviews/1/hide"},
		{name: "管理者レビュー再公開はadmin role必須", method: http.MethodPost, path: "/api/admin/reviews/1/publish"},
	}

	tokenService := auth.NewTokenService()
	token, err := tokenService.GenerateAccessToken(1, []string{auth.CustomerRole})
	if err != nil {
		t.Fatalf("GenerateAccessToken returned error: %v", err)
	}

	r := SetupRouter(nil)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			res := httptest.NewRecorder()

			r.ServeHTTP(res, req)

			if res.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
			}
		})
	}
}

func TestAdminProductRoutesRequireAdminRole(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "管理者商品一覧はadmin role必須", method: http.MethodGet, path: "/api/admin/products"},
		{name: "管理者商品詳細はadmin role必須", method: http.MethodGet, path: "/api/admin/products/1"},
		{name: "管理者商品登録はadmin role必須", method: http.MethodPost, path: "/api/admin/products"},
		{name: "管理者商品編集はadmin role必須", method: http.MethodPatch, path: "/api/admin/products/1"},
		{name: "管理者商品販売停止はadmin role必須", method: http.MethodPost, path: "/api/admin/products/1/stop-selling"},
		{name: "管理者商品販売再開はadmin role必須", method: http.MethodPost, path: "/api/admin/products/1/resume-selling"},
	}

	tokenService := auth.NewTokenService()
	token, err := tokenService.GenerateAccessToken(1, []string{auth.CustomerRole})
	if err != nil {
		t.Fatalf("GenerateAccessToken returned error: %v", err)
	}

	r := SetupRouter(nil)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			res := httptest.NewRecorder()

			r.ServeHTTP(res, req)

			if res.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
			}
		})
	}
}

func TestAdminOrderRoutesRequireAdminRole(t *testing.T) {
	tests := []struct {
		name   string
		method string
		path   string
	}{
		{name: "管理者注文一覧はadmin role必須", method: http.MethodGet, path: "/api/admin/orders"},
		{name: "管理者注文詳細はadmin role必須", method: http.MethodGet, path: "/api/admin/orders/1"},
		{name: "管理者注文キャンセルはadmin role必須", method: http.MethodPost, path: "/api/admin/orders/1/cancel"},
	}

	tokenService := auth.NewTokenService()
	token, err := tokenService.GenerateAccessToken(1, []string{auth.CustomerRole})
	if err != nil {
		t.Fatalf("GenerateAccessToken returned error: %v", err)
	}

	r := SetupRouter(nil)

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, tt.path, nil)
			req.Header.Set("Authorization", "Bearer "+token)
			res := httptest.NewRecorder()

			r.ServeHTTP(res, req)

			if res.Code != http.StatusForbidden {
				t.Fatalf("status = %d, want %d", res.Code, http.StatusForbidden)
			}
		})
	}
}
