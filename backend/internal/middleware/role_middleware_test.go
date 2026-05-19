package middleware_test

import (
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/auth"
	"github.com/msubaru14/nanchatte-ec-backend/internal/middleware"
)

func TestRequireRole(t *testing.T) {
	gin.SetMode(gin.TestMode)

	tokenService := auth.NewTokenServiceWithSecret("test-secret", func() time.Time {
		return time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC)
	})
	token, err := tokenService.GenerateAccessToken(1, []string{"customer"})
	if err != nil {
		t.Fatalf("GenerateAccessToken returned error: %v", err)
	}

	tests := []struct {
		name         string
		requiredRole string
		wantStatus   int
	}{
		{
			name:         "必要なroleを持つ場合は通過する",
			requiredRole: "customer",
			wantStatus:   http.StatusOK,
		},
		{
			name:         "必要なroleを持たない場合はforbiddenを返す",
			requiredRole: "admin",
			wantStatus:   http.StatusForbidden,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			router := gin.New()
			router.GET("/test", middleware.AuthMiddleware(tokenService), middleware.RequireRole(tt.requiredRole), func(c *gin.Context) {
				c.Status(http.StatusOK)
			})

			req := httptest.NewRequest(http.MethodGet, "/test", nil)
			req.Header.Set("Authorization", "Bearer "+token)
			res := httptest.NewRecorder()

			router.ServeHTTP(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d", res.Code, tt.wantStatus)
			}
		})
	}
}
