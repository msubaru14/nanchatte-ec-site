package router

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/controller"
)

func SetupRouter() *gin.Engine {
	r := gin.Default()

	healthController := controller.NewHealthController()

	api := r.Group("/api")
	{
		api.GET("/health", healthController.Show)
	}

	return r
}
