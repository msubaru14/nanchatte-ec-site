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

func (r *Repository) FindAdminProducts() ([]Product, error) {
	var products []Product
	err := r.adminProductQuery().
		Order("id ASC").
		Find(&products).
		Error

	return products, err
}

func (r *Repository) FindAdminProductByID(id int64) (*Product, error) {
	var product Product
	if err := r.adminProductQuery().
		Where("id = ?", id).
		First(&product).
		Error; err != nil {
		return nil, err
	}

	return &product, nil
}

func (r *Repository) CreateProduct(product *Product) error {
	return r.db.Create(product).Error
}

func (r *Repository) UpdateProduct(productID int64, updates map[string]interface{}) (*Product, error) {
	if err := r.db.Model(&Product{}).
		Where("id = ?", productID).
		Updates(updates).
		Error; err != nil {
		return nil, err
	}

	return r.FindAdminProductByID(productID)
}

func (r *Repository) UpdateProductStatus(productID int64, status ProductStatus) (*Product, error) {
	product, err := r.FindAdminProductByID(productID)
	if err != nil {
		return nil, err
	}
	if product.Status == status {
		return product, nil
	}

	if err := r.db.Model(&Product{}).
		Where("id = ?", productID).
		Update("status", status).
		Error; err != nil {
		return nil, err
	}

	return r.FindAdminProductByID(productID)
}

func (r *Repository) activeProductQuery() *gorm.DB {
	return r.db.
		Model(&Product{}).
		Preload("Category").
		Preload("TaxRate").
		Where("status = ?", ProductStatusActive)
}

func (r *Repository) adminProductQuery() *gorm.DB {
	return r.db.
		Model(&Product{}).
		Preload("TaxRate")
}

func (r *Repository) buildActiveProductQuery(criteria ProductSearchCriteria) *gorm.DB {
	query := r.activeProductQuery()

	return query
}
