package health

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

type Handler struct{}

func NewHandler() *Handler {
	return &Handler{}
}

func (h *Handler) Show(c *gin.Context) {
	response.Success(c, gin.H{
		"status": "ok",
	})
}
