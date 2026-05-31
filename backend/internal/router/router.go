package router

import (
	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/auth"
	"github.com/msubaru14/nanchatte-ec-backend/internal/cart"
	"github.com/msubaru14/nanchatte-ec-backend/internal/health"
	"github.com/msubaru14/nanchatte-ec-backend/internal/middleware"
	"github.com/msubaru14/nanchatte-ec-backend/internal/order"
	"github.com/msubaru14/nanchatte-ec-backend/internal/product"
	"gorm.io/gorm"
)

func SetupRouter(database *gorm.DB) *gin.Engine {
	r := gin.Default()

	tokenService := auth.NewTokenService()
	authService := auth.NewAuthService(database, tokenService)
	productService := product.NewService(database)
	cartService := cart.NewService(database)
	orderService := order.NewService(database)

	healthHandler := health.NewHandler()
	authHandler := auth.NewAuthHandler(authService)
	meHandler := auth.NewMeHandler(authService)
	productHandler := product.NewHandler(productService)
	cartHandler := cart.NewHandler(cartService)
	orderHandler := order.NewHandler(orderService)

	api := r.Group("/api")
	{
		api.GET("/health", healthHandler.Show)
		api.GET("/products", productHandler.List)
		api.GET("/products/:id", productHandler.Show)

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

		cartRoutes := api.Group(
			"/cart",
			middleware.AuthMiddleware(tokenService),
			middleware.RequireRole(auth.CustomerRole),
		)
		{
			cartRoutes.GET("", cartHandler.Show)
			cartRoutes.POST("/items", cartHandler.AddItem)
			cartRoutes.PATCH("/items/:productId", cartHandler.UpdateItemQuantity)
			cartRoutes.DELETE("/items/:productId", cartHandler.DeleteItem)
			cartRoutes.DELETE("/items", cartHandler.DeleteAllItems)
		}

		orderRoutes := api.Group(
			"/orders",
			middleware.AuthMiddleware(tokenService),
			middleware.RequireRole(auth.CustomerRole),
		)
		{
			orderRoutes.GET("", orderHandler.List)
			orderRoutes.POST("", orderHandler.Create)
		}
	}

	return r
}
