package seeds

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type taxRateSeed struct {
	Name string
	Rate string
}

var taxRateSeeds = []taxRateSeed{
	{
		Name: "standard_10_percent",
		Rate: "0.1000",
	},
	{
		Name: "reduced_8_percent",
		Rate: "0.0800",
	},
}

func seedTaxRates(db *gorm.DB) error {
	for _, seed := range taxRateSeeds {
		exists, err := taxRateExists(db, seed.Name)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		now := time.Now()
		if err := db.Table("tax_rates").Create(map[string]any{
			"name":       seed.Name,
			"rate":       seed.Rate,
			"created_at": now,
			"updated_at": now,
		}).Error; err != nil {
			return err
		}
	}

	return nil
}

func taxRateExists(db *gorm.DB, name string) (bool, error) {
	var taxRate struct {
		ID uint
	}

	err := db.Table("tax_rates").
		Select("id").
		Where("name = ?", name).
		First(&taxRate).
		Error
	if err == nil {
		return true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}

	return false, err
}
