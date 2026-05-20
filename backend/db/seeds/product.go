package seeds

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type productSeed struct {
	Name              string
	Description       string
	PriceExcludingTax int
	TaxRateName       string
	CategoryName      string
	MakerName         string
	ModelNumber       string
	StockQuantity     int
	LowStockThreshold int
	Status            string
	ImageURL          *string
	ReleasedAt        time.Time
}

var productSeeds = []productSeed{
	{
		Name:              "HHKB Professional HYBRID Type-S",
		Description:       "Compact keyboard with electrostatic capacitive switches.",
		PriceExcludingTax: 36000,
		TaxRateName:       "standard_10_percent",
		CategoryName:      "keyboard",
		MakerName:         "PFU",
		ModelNumber:       "PD-KB800BS",
		StockQuantity:     12,
		LowStockThreshold: 3,
		Status:            "active",
		ReleasedAt:        time.Date(2023, 10, 25, 0, 0, 0, 0, time.UTC),
	},
	{
		Name:              "Logicool G Pro X Superlight 2",
		Description:       "Lightweight wireless gaming mouse.",
		PriceExcludingTax: 23650,
		TaxRateName:       "standard_10_percent",
		CategoryName:      "mouse",
		MakerName:         "Logicool",
		ModelNumber:       "G-PPD-004WL",
		StockQuantity:     8,
		LowStockThreshold: 2,
		Status:            "active",
		ReleasedAt:        time.Date(2023, 9, 21, 0, 0, 0, 0, time.UTC),
	},
	{
		Name:              "Sony INZONE H5",
		Description:       "Wireless headset for gaming.",
		PriceExcludingTax: 24000,
		TaxRateName:       "standard_10_percent",
		CategoryName:      "headset",
		MakerName:         "Sony",
		ModelNumber:       "WH-G500",
		StockQuantity:     0,
		LowStockThreshold: 4,
		Status:            "active",
		ReleasedAt:        time.Date(2023, 10, 13, 0, 0, 0, 0, time.UTC),
	},
	{
		Name:              "Logicool G Pro X Wireless Headset",
		Description:       "Wireless gaming headset with detachable boom microphone.",
		PriceExcludingTax: 21800,
		TaxRateName:       "reduced_8_percent",
		CategoryName:      "headset",
		MakerName:         "Logicool",
		ModelNumber:       "G-PHS-004WL",
		StockQuantity:     6,
		LowStockThreshold: 2,
		Status:            "active",
		ReleasedAt:        time.Date(2020, 8, 27, 0, 0, 0, 0, time.UTC),
	},
	{
		Name:              "Dell UltraSharp U2723QE",
		Description:       "27-inch 4K USB-C hub monitor.",
		PriceExcludingTax: 72000,
		TaxRateName:       "standard_10_percent",
		CategoryName:      "monitor",
		MakerName:         "Dell",
		ModelNumber:       "U2723QE",
		StockQuantity:     5,
		LowStockThreshold: 2,
		Status:            "active",
		ReleasedAt:        time.Date(2022, 2, 15, 0, 0, 0, 0, time.UTC),
	},
	{
		Name:              "BenQ MOBIUZ EX2710Q",
		Description:       "27-inch gaming monitor for low-stock boundary checks.",
		PriceExcludingTax: 49800,
		TaxRateName:       "standard_10_percent",
		CategoryName:      "monitor",
		MakerName:         "BenQ",
		ModelNumber:       "EX2710Q",
		StockQuantity:     3,
		LowStockThreshold: 3,
		Status:            "active",
		ReleasedAt:        time.Date(2021, 9, 10, 0, 0, 0, 0, time.UTC),
	},
	{
		Name:              "DualSense Wireless Controller",
		Description:       "Wireless controller for PlayStation 5.",
		PriceExcludingTax: 8980,
		TaxRateName:       "standard_10_percent",
		CategoryName:      "controller",
		MakerName:         "Sony",
		ModelNumber:       "CFI-ZCT1J",
		StockQuantity:     18,
		LowStockThreshold: 5,
		Status:            "active",
		ReleasedAt:        time.Date(2020, 11, 12, 0, 0, 0, 0, time.UTC),
	},
	{
		Name:              "Legacy Office Keyboard",
		Description:       "Stopped legacy keyboard for visibility checks.",
		PriceExcludingTax: 3980,
		TaxRateName:       "standard_10_percent",
		CategoryName:      "keyboard",
		MakerName:         "Sample Maker",
		ModelNumber:       "LEGACY-KB-001",
		StockQuantity:     7,
		LowStockThreshold: 2,
		Status:            "stopped",
		ReleasedAt:        time.Date(2021, 4, 1, 0, 0, 0, 0, time.UTC),
	},
}

func seedProducts(db *gorm.DB) error {
	for _, seed := range productSeeds {
		exists, err := productExists(db, seed.Name)
		if err != nil {
			return err
		}
		if exists {
			continue
		}

		categoryID, err := findCategoryID(db, seed.CategoryName)
		if err != nil {
			return err
		}

		taxRateID, err := findTaxRateID(db, seed.TaxRateName)
		if err != nil {
			return err
		}

		now := time.Now()
		var imageURL any
		if seed.ImageURL != nil {
			imageURL = *seed.ImageURL
		}

		if err := db.Table("products").Create(map[string]any{
			"name":                seed.Name,
			"description":         seed.Description,
			"price_excluding_tax": seed.PriceExcludingTax,
			"tax_rate_id":         taxRateID,
			"category_id":         categoryID,
			"maker_name":          seed.MakerName,
			"model_number":        seed.ModelNumber,
			"stock_quantity":      seed.StockQuantity,
			"low_stock_threshold": seed.LowStockThreshold,
			"status":              seed.Status,
			"image_url":           imageURL,
			"released_at":         seed.ReleasedAt,
			"created_at":          now,
			"updated_at":          now,
		}).Error; err != nil {
			return err
		}
	}

	return nil
}

func productExists(db *gorm.DB, name string) (bool, error) {
	var product struct {
		ID uint
	}

	err := db.Table("products").
		Select("id").
		Where("name = ?", name).
		First(&product).
		Error
	if err == nil {
		return true, nil
	}
	if errors.Is(err, gorm.ErrRecordNotFound) {
		return false, nil
	}

	return false, err
}

func findCategoryID(db *gorm.DB, name string) (uint, error) {
	var category struct {
		ID uint
	}

	err := db.Table("categories").
		Select("id").
		Where("name = ?", name).
		First(&category).
		Error
	if err != nil {
		return 0, err
	}

	return category.ID, nil
}

func findTaxRateID(db *gorm.DB, name string) (uint, error) {
	var taxRate struct {
		ID uint
	}

	err := db.Table("tax_rates").
		Select("id").
		Where("name = ?", name).
		First(&taxRate).
		Error
	if err != nil {
		return 0, err
	}

	return taxRate.ID, nil
}
