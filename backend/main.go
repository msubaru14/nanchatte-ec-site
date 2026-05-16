package main

import (
	"log"
	"os"

	"github.com/msubaru14/nanchatte-ec-backend/router"
)

func main() {
	r := router.SetupRouter()

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
