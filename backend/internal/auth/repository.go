package auth

import (
	"errors"
	"time"

	"gorm.io/gorm"
)

type Repository struct {
	db *gorm.DB
}

func NewRepository(db *gorm.DB) *Repository {
	return &Repository{db: db}
}

func (r *Repository) Transaction(fn func(*Repository) error) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		return fn(NewRepository(tx))
	})
}

func (r *Repository) CountUsersByEmail(email string) (int64, error) {
	var count int64
	err := r.db.Model(&User{}).Where("email = ?", email).Count(&count).Error
	return count, err
}

func (r *Repository) CreateUser(user *User) error {
	return r.db.Create(user).Error
}

func (r *Repository) FindOrCreateRole(name string) (*Role, error) {
	var role Role
	err := r.db.Where("name = ?", name).First(&role).Error
	if err == nil {
		return &role, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	role = Role{Name: name}
	if err := r.db.Create(&role).Error; err != nil {
		return nil, err
	}

	return &role, nil
}

func (r *Repository) CreateUserRole(userID int64, roleID int64) error {
	return r.db.Create(&UserRole{UserID: userID, RoleID: roleID}).Error
}

func (r *Repository) CreateCart(userID int64) error {
	return r.db.Create(&Cart{UserID: userID}).Error
}

func (r *Repository) CreateRefreshToken(refreshToken *RefreshToken) error {
	return r.db.Create(refreshToken).Error
}

func (r *Repository) FindUserByEmail(email string) (*User, error) {
	var user User
	if err := r.db.Where("email = ?", email).First(&user).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *Repository) FindUserByID(userID int64) (*User, error) {
	var user User
	if err := r.db.First(&user, userID).Error; err != nil {
		return nil, err
	}

	return &user, nil
}

func (r *Repository) FindRefreshTokenByHash(tokenHash string) (*RefreshToken, error) {
	var refreshToken RefreshToken
	if err := r.db.Where("token_hash = ?", tokenHash).First(&refreshToken).Error; err != nil {
		return nil, err
	}

	return &refreshToken, nil
}

func (r *Repository) RevokeRefreshToken(tokenHash string, now time.Time) (int64, error) {
	result := r.db.Model(&RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Update("revoked_at", now)

	return result.RowsAffected, result.Error
}

func (r *Repository) RolesForUser(userID int64) ([]string, error) {
	var roles []string
	err := r.db.Table("roles").
		Select("roles.name").
		Joins("JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Order("roles.name").
		Pluck("roles.name", &roles).Error

	return roles, err
}
