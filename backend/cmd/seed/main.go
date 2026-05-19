package main

import (
	"log"

	"github.com/msubaru14/nanchatte-ec-backend/db"
	"github.com/msubaru14/nanchatte-ec-backend/db/seeds"
)

func main() {
	database, err := db.Connect()
	if err != nil {
		log.Fatalf("database connection failed: %v", err)
	}

	if err := db.RunMigrations(database); err != nil {
		log.Fatalf("migration failed: %v", err)
	}

	if err := seeds.Run(database); err != nil {
		log.Fatalf("seed failed: %v", err)
	}
}
