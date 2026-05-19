package main

import (
	"log"
	"os"

	"github.com/msubaru14/nanchatte-ec-backend/db"
	"github.com/msubaru14/nanchatte-ec-backend/internal/router"
)

func main() {
	database, err := db.Connect()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	if err := db.RunMigrations(database); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	r := router.SetupRouter(database)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	if err := r.Run(":" + port); err != nil {
		log.Fatalf("server failed: %v", err)
	}
}
