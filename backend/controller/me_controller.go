package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/middleware"
	"github.com/msubaru14/nanchatte-ec-backend/pkg/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/pkg/response"
	"github.com/msubaru14/nanchatte-ec-backend/service"
)

type MeController struct {
	authService *service.AuthService
}

func NewMeController(authService *service.AuthService) *MeController {
	return &MeController{authService: authService}
}

func (m *MeController) Show(c *gin.Context) {
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
