package service

import (
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"

	"github.com/msubaru14/nanchatte-ec-backend/model"
	"github.com/msubaru14/nanchatte-ec-backend/pkg/apperror"
	authpkg "github.com/msubaru14/nanchatte-ec-backend/pkg/auth"
	"github.com/msubaru14/nanchatte-ec-backend/pkg/validator"
)

const CustomerRole = "customer"

const (
	postgresUniqueViolationCode = "23505"
	usersEmailUniqueConstraint  = "users_email_key"
)

type AuthService struct {
	db           *gorm.DB
	tokenService *TokenService
}

type AuthResult struct {
	User         model.User
	Roles        []string
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}

func NewAuthService(db *gorm.DB, tokenService *TokenService) *AuthService {
	return &AuthService{
		db:           db,
		tokenService: tokenService,
	}
}

func (s *AuthService) Register(name string, email string, password string) (*AuthResult, *apperror.APIError) {
	trimmedName := strings.TrimSpace(name)
	normalizedEmail, ok := validator.NormalizeEmail(email)
	if !ok {
		return nil, apperror.NewValidationError("validation error", []apperror.ErrorDetail{
			{Field: "email", Code: apperror.DetailInvalidFormat, Message: "email is invalid"},
		})
	}

	passwordHash, err := authpkg.HashPassword(password)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	var result *AuthResult
	err = s.db.Transaction(func(tx *gorm.DB) error {
		var count int64
		if err := tx.Model(&model.User{}).Where("email = ?", normalizedEmail).Count(&count).Error; err != nil {
			return err
		}
		if count > 0 {
			return apperror.NewConflict("email already exists")
		}

		user := model.User{
			Name:         trimmedName,
			Email:        normalizedEmail,
			PasswordHash: passwordHash,
		}
		if err := tx.Create(&user).Error; err != nil {
			return err
		}

		role, err := findOrCreateRole(tx, CustomerRole)
		if err != nil {
			return err
		}

		if err := tx.Create(&model.UserRole{UserID: user.ID, RoleID: role.ID}).Error; err != nil {
			return err
		}

		if err := tx.Create(&model.Cart{UserID: user.ID}).Error; err != nil {
			return err
		}

		roles := []string{CustomerRole}
		accessToken, err := s.tokenService.GenerateAccessToken(user.ID, roles)
		if err != nil {
			return err
		}

		refreshToken, refreshTokenHash, expiresAt, err := s.tokenService.GenerateRefreshToken()
		if err != nil {
			return err
		}

		if err := tx.Create(&model.RefreshToken{
			UserID:    user.ID,
			TokenHash: refreshTokenHash,
			ExpiresAt: expiresAt,
		}).Error; err != nil {
			return err
		}

		result = &AuthResult{
			User:         user,
			Roles:        roles,
			AccessToken:  accessToken,
			RefreshToken: refreshToken,
			ExpiresIn:    int64(AccessTokenTTL.Seconds()),
		}
		return nil
	})
	if err != nil {
		return nil, toAPIError(err)
	}

	return result, nil
}

func (s *AuthService) Login(email string, password string) (*AuthResult, *apperror.APIError) {
	normalizedEmail, ok := validator.NormalizeEmail(email)
	if !ok {
		return nil, apperror.NewUnauthorized()
	}

	var user model.User
	if err := s.db.Where("email = ?", normalizedEmail).First(&user).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewUnauthorized()
		}
		return nil, apperror.NewInternalServerError()
	}

	if user.DeletedAt != nil || !authpkg.VerifyPassword(password, user.PasswordHash) {
		return nil, apperror.NewUnauthorized()
	}

	roles, apiErr := s.rolesForUser(user.ID)
	if apiErr != nil {
		return nil, apiErr
	}

	accessToken, err := s.tokenService.GenerateAccessToken(user.ID, roles)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	refreshToken, refreshTokenHash, expiresAt, err := s.tokenService.GenerateRefreshToken()
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	if err := s.db.Create(&model.RefreshToken{
		UserID:    user.ID,
		TokenHash: refreshTokenHash,
		ExpiresAt: expiresAt,
	}).Error; err != nil {
		return nil, apperror.NewInternalServerError()
	}

	return &AuthResult{
		User:         user,
		Roles:        roles,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(AccessTokenTTL.Seconds()),
	}, nil
}

func (s *AuthService) Refresh(refreshToken string) (string, int64, *apperror.APIError) {
	tokenHash := s.tokenService.HashRefreshToken(refreshToken)

	var stored model.RefreshToken
	if err := s.db.Where("token_hash = ?", tokenHash).First(&stored).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", 0, apperror.NewUnauthorized()
		}
		return "", 0, apperror.NewInternalServerError()
	}

	if stored.RevokedAt != nil || !stored.ExpiresAt.After(s.tokenService.now()) {
		return "", 0, apperror.NewUnauthorized()
	}

	var user model.User
	if err := s.db.First(&user, stored.UserID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", 0, apperror.NewUnauthorized()
		}
		return "", 0, apperror.NewInternalServerError()
	}
	if user.DeletedAt != nil {
		return "", 0, apperror.NewUnauthorized()
	}

	roles, apiErr := s.rolesForUser(user.ID)
	if apiErr != nil {
		return "", 0, apiErr
	}

	accessToken, err := s.tokenService.GenerateAccessToken(user.ID, roles)
	if err != nil {
		return "", 0, apperror.NewInternalServerError()
	}

	return accessToken, int64(AccessTokenTTL.Seconds()), nil
}

func (s *AuthService) Logout(refreshToken string) *apperror.APIError {
	tokenHash := s.tokenService.HashRefreshToken(refreshToken)
	now := s.tokenService.now()

	result := s.db.Model(&model.RefreshToken{}).
		Where("token_hash = ? AND revoked_at IS NULL", tokenHash).
		Update("revoked_at", now)
	if result.Error != nil {
		return apperror.NewInternalServerError()
	}
	if result.RowsAffected == 0 {
		return apperror.NewUnauthorized()
	}

	return nil
}

func (s *AuthService) CurrentUser(userID int64) (*model.User, []string, *apperror.APIError) {
	var user model.User
	if err := s.db.First(&user, userID).Error; err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, nil, apperror.NewUnauthorized()
		}
		return nil, nil, apperror.NewInternalServerError()
	}
	if user.DeletedAt != nil {
		return nil, nil, apperror.NewUnauthorized()
	}

	roles, apiErr := s.rolesForUser(userID)
	if apiErr != nil {
		return nil, nil, apiErr
	}

	return &user, roles, nil
}

func (s *AuthService) rolesForUser(userID int64) ([]string, *apperror.APIError) {
	var roles []string
	err := s.db.Table("roles").
		Select("roles.name").
		Joins("JOIN user_roles ON user_roles.role_id = roles.id").
		Where("user_roles.user_id = ?", userID).
		Order("roles.name").
		Pluck("roles.name", &roles).Error
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}
	if len(roles) == 0 {
		return nil, apperror.NewUnauthorized()
	}

	return roles, nil
}

func findOrCreateRole(tx *gorm.DB, name string) (*model.Role, error) {
	var role model.Role
	err := tx.Where("name = ?", name).First(&role).Error
	if err == nil {
		return &role, nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return nil, err
	}

	role = model.Role{Name: name}
	if err := tx.Create(&role).Error; err != nil {
		return nil, err
	}

	return &role, nil
}

func toAPIError(err error) *apperror.APIError {
	var apiErr *apperror.APIError
	if errors.As(err, &apiErr) {
		return apiErr
	}
	if isUniqueViolation(err, usersEmailUniqueConstraint) {
		return apperror.NewConflict("email already exists")
	}

	return apperror.NewInternalServerError()
}

func isUniqueViolation(err error, constraintName string) bool {
	var pgErr *pgconn.PgError
	if !errors.As(err, &pgErr) {
		return false
	}

	return pgErr.Code == postgresUniqueViolationCode && pgErr.ConstraintName == constraintName
}
