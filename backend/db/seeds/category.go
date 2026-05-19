package seeds

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

var categorySeeds = []string{
	"keyboard",
	"mouse",
	"headset",
	"monitor",
	"controller",
}

func seedCategories(db *gorm.DB) error {
	for _, name := range categorySeeds {
		exists, err := categoryExists(db, name)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		now := time.Now()
		if err := db.Table("categories").Create(map[string]any{
			"name":       name,
			"created_at": now,
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
	}

	return nil
}

func categoryExists(db *gorm.DB, name string) (bool, error) {
	var category struct {
		ID uint
	}

	err := db.Table("categories").
		Select("id").
		Where("name = ?", name).
		First(&category).
		Error
	if err == nil {
		return true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}

	return false, err
}
