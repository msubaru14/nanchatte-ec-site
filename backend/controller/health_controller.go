package controller

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/pkg/response"
)

type HealthController struct{}

func NewHealthController() *HealthController {
	return &HealthController{}
}

func (h *HealthController) Show(c *gin.Context) {
	response.Success(c, gin.H{
		"status": "ok",
	})
}
