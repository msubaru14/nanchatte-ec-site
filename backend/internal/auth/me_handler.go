package auth

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/middleware"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

type MeHandler struct {
	authService *AuthService
}

func NewMeHandler(authService *AuthService) *MeHandler {
	return &MeHandler{authService: authService}
}

func (m *MeHandler) Show(c *gin.Context) {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		writeAPIError(c, apperror.NewUnauthorized())
		return
	}

	user, roles, apiErr := m.authService.CurrentUser(userID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, userResponse{
		ID:    user.ID,
		Name:  user.Name,
		Email: user.Email,
		Roles: roles,
	})
}
