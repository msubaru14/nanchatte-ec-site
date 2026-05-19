package seeds

import "gorm.io/gorm"

func Run(db *gorm.DB) error {
	return db.Transaction(func(tx *gorm.DB) error {
		if err := seedCategories(tx); err != nil {
			return err
		}

		if err := seedTaxRates(tx); err != nil {
			return err
		}

		if err := seedProducts(tx); err != nil {
			return err
		}

		return nil
	})
}
