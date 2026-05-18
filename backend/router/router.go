package router

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/controller"
	"github.com/msubaru14/nanchatte-ec-backend/middleware"
	"github.com/msubaru14/nanchatte-ec-backend/service"
	"gorm.io/gorm"
)

func SetupRouter(database *gorm.DB) *gin.Engine {
	r := gin.Default()

	tokenService := service.NewTokenService()
	authService := service.NewAuthService(database, tokenService)

	healthController := controller.NewHealthController()
	authController := controller.NewAuthController(authService)
	meController := controller.NewMeController(authService)

	api := r.Group("/api")
	{
		api.GET("/health", healthController.Show)

		auth := api.Group("/auth")
		{
			auth.POST("/register", authController.Register)
			auth.POST("/login", authController.Login)
			auth.POST("/refresh", authController.Refresh)

			auth.POST(
				"/logout",
				middleware.AuthMiddleware(tokenService),
				middleware.RequireRole(service.CustomerRole),
				authController.Logout,
			)
		}

		api.GET(
			"/me",
			middleware.AuthMiddleware(tokenService),
			middleware.RequireRole(service.CustomerRole),
			meController.Show,
		)
	}

	return r
}
