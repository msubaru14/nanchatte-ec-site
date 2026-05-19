package router

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/auth"
	"github.com/msubaru14/nanchatte-ec-backend/internal/health"
	"github.com/msubaru14/nanchatte-ec-backend/internal/middleware"
	"gorm.io/gorm"
)

func SetupRouter(database *gorm.DB) *gin.Engine {
	r := gin.Default()

	tokenService := auth.NewTokenService()
	authService := auth.NewAuthService(database, tokenService)

	healthHandler := health.NewHandler()
	authHandler := auth.NewAuthHandler(authService)
	meHandler := auth.NewMeHandler(authService)

	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.Show)

		authRoutes := api.Group("/auth")
		{
			authRoutes.POST("/register", authHandler.Register)
			authRoutes.POST("/login", authHandler.Login)
			authRoutes.POST("/refresh", authHandler.Refresh)

			authRoutes.POST(
				"/logout",
				middleware.AuthMiddleware(tokenService),
				middleware.RequireRole(auth.CustomerRole),
				authHandler.Logout,
			)
		}

		api.GET(
			"/me",
			middleware.AuthMiddleware(tokenService),
			middleware.RequireRole(auth.CustomerRole),
			meHandler.Show,
		)
	}

	return r
}
