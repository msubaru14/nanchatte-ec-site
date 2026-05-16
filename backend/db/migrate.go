package db

import (
	"os"
	"sort"
	"strings"

	"gorm.io/gorm"
)

func RunMigrations(db *gorm.DB) error {
	db.Exec(`
	CREATE TABLE IF NOT EXISTS schema_migrations (
		version VARCHAR(255) PRIMARY KEY
	);
	`)

	files, err := os.ReadDir("./db/migrations")
	if err != nil {
		return err
	}

	sort.Slice(files, func(i, j int) bool {
		return files[i].Name() < files[j].Name()
	})

	for _, file := range files {
		println("Running migration:", file.Name())
		if hasRun(db, file.Name()) {
			continue
		}

		content, err := os.ReadFile("./db/migrations/" + file.Name())
		if err != nil {
			return err
		}

		sql := extractUpSQL(string(content))

		// トランザクション開始
		tx := db.Begin()
		if tx.Error != nil {
			return tx.Error
		}

		// 実行
		if err := tx.Exec(sql).Error; err != nil {
			tx.Rollback()
			return err
		}

		if err := tx.Exec(
			"INSERT INTO schema_migrations (version) VALUES (?)",
			file.Name(),
		).Error; err != nil {
			tx.Rollback()
			return err
		}

		if err := tx.Commit().Error; err != nil {
			return err
		}
		// トランザクション終了
	}

	return nil
}

func extractUpSQL(content string) string {
	parts := strings.Split(content, "-- +migrate Down")
	return strings.Replace(parts[0], "-- +migrate Up", "", 1)
}

func hasRun(db *gorm.DB, name string) bool {
	var count int64
	db.Table("schema_migrations").Where("version = ?", name).Count(&count)
	return count > 0
}
