package product

import "gorm.io/gorm"

type Repository struct {
	db *gorm.DB
}

type ProductSearchCriteria struct {
	Query ProductListQuery
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) FindActiveProducts(criteria ProductSearchCriteria) ([]Product, error) {
	var products []Product
	err := r.buildActiveProductQuery(criteria).
		Order("released_at DESC NULLS LAST").
		Order("id DESC").
		Find(&products).
		Error

	return products, err
}

func (r *Repository) FindActiveProductByID(id int64) (*Product, error) {
	var product Product
	if err := r.activeProductQuery().
		Where("id = ?", id).
		First(&product).
		Error; err != nil {
		return nil, err
	}

	return &product, nil
}

func (r *Repository) activeProductQuery() *gorm.DB {
	return r.db.
		Model(&Product{}).
		Preload("Category").
		Preload("TaxRate").
		Where("status = ?", ProductStatusActive)
}

func (r *Repository) buildActiveProductQuery(criteria ProductSearchCriteria) *gorm.DB {
	query := r.activeProductQuery()

	return query
}
