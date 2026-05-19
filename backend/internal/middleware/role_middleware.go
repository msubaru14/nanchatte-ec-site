package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
)

func RequireRole(requiredRole string) gin.HandlerFunc {
	return func(c *gin.Context) {
		roles, ok := RolesFromContext(c)
		if !ok {
			abortWithAPIError(c, apperror.NewUnauthorized())
			return
		}

		for _, role := range roles {
			if role == requiredRole {
				c.Next()
				return
			}
		}

		abortWithAPIError(c, apperror.NewForbidden())
	}
}
