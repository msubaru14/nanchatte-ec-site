package middleware

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	sharedauth "github.com/msubaru14/nanchatte-ec-backend/internal/shared/auth"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

const (
	contextUserIDKey = "auth.userID"
	contextRolesKey  = "auth.roles"
)

type AccessTokenParser interface {
	ParseAccessToken(token string) (sharedauth.JWTClaims, error)
}

func AuthMiddleware(tokenService AccessTokenParser) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if !strings.HasPrefix(authHeader, "Bearer ") {
			abortWithAPIError(c, apperror.NewUnauthorized())
			return
		}

		token := strings.TrimSpace(strings.TrimPrefix(authHeader, "Bearer "))
		if token == "" {
			abortWithAPIError(c, apperror.NewUnauthorized())
			return
		}

		claims, err := tokenService.ParseAccessToken(token)
		if err != nil {
			abortWithAPIError(c, apperror.NewUnauthorized())
			return
		}

		c.Set(contextUserIDKey, claims.UserID)
		c.Set(contextRolesKey, claims.Roles)
		c.Next()
	}
}

func UserIDFromContext(c *gin.Context) (int64, bool) {
	value, exists := c.Get(contextUserIDKey)
	if !exists {
		return 0, false
	}

	userID, ok := value.(int64)
	return userID, ok
}

func RolesFromContext(c *gin.Context) ([]string, bool) {
	value, exists := c.Get(contextRolesKey)
	if !exists {
		return nil, false
	}

	roles, ok := value.([]string)
	return roles, ok
}

func abortWithAPIError(c *gin.Context, apiErr *apperror.APIError) {
	response.Error(c, apperror.MapErrorCodeToStatus(apiErr.Code), *apiErr)
	c.Abort()
}
