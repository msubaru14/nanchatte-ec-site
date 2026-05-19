package auth

import (
	"errors"
	"strings"

	"github.com/jackc/pgx/v5/pgconn"
	"gorm.io/gorm"

	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	sharedauth "github.com/msubaru14/nanchatte-ec-backend/internal/shared/auth"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/validator"
)

const CustomerRole = "customer"

const (
	postgresUniqueViolationCode = "23505"
	usersEmailUniqueConstraint  = "users_email_key"
)

type AuthService struct {
	repository   *Repository
	tokenService *TokenService
}

type AuthResult struct {
	User         User
	Roles        []string
	AccessToken  string
	RefreshToken string
	ExpiresIn    int64
}

func NewAuthService(db *gorm.DB, tokenService *TokenService) *AuthService {
	return &AuthService{
		repository:   NewRepository(db),
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

	passwordHash, err := sharedauth.HashPassword(password)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}

	var result *AuthResult
	err = s.repository.Transaction(func(repository *Repository) error {
		count, err := repository.CountUsersByEmail(normalizedEmail)
		if err != nil {
			return err
		}
		if count > 0 {
			return apperror.NewConflict("email already exists")
		}

		user := User{
			Name:         trimmedName,
			Email:        normalizedEmail,
			PasswordHash: passwordHash,
		}
		if err := repository.CreateUser(&user); err != nil {
			return err
		}

		role, err := repository.FindOrCreateRole(CustomerRole)
		if err != nil {
			return err
		}

		if err := repository.CreateUserRole(user.ID, role.ID); err != nil {
			return err
		}

		if err := repository.CreateCart(user.ID); err != nil {
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

		if err := repository.CreateRefreshToken(&RefreshToken{
			UserID:    user.ID,
			TokenHash: refreshTokenHash,
			ExpiresAt: expiresAt,
		}); err != nil {
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

	user, err := s.repository.FindUserByEmail(normalizedEmail)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return nil, apperror.NewUnauthorized()
		}
		return nil, apperror.NewInternalServerError()
	}

	if user.DeletedAt != nil || !sharedauth.VerifyPassword(password, user.PasswordHash) {
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

	if err := s.repository.CreateRefreshToken(&RefreshToken{
		UserID:    user.ID,
		TokenHash: refreshTokenHash,
		ExpiresAt: expiresAt,
	}); err != nil {
		return nil, apperror.NewInternalServerError()
	}

	return &AuthResult{
		User:         *user,
		Roles:        roles,
		AccessToken:  accessToken,
		RefreshToken: refreshToken,
		ExpiresIn:    int64(AccessTokenTTL.Seconds()),
	}, nil
}

func (s *AuthService) Refresh(refreshToken string) (string, int64, *apperror.APIError) {
	tokenHash := s.tokenService.HashRefreshToken(refreshToken)

	stored, err := s.repository.FindRefreshTokenByHash(tokenHash)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return "", 0, apperror.NewUnauthorized()
		}
		return "", 0, apperror.NewInternalServerError()
	}

	if stored.RevokedAt != nil || !stored.ExpiresAt.After(s.tokenService.now()) {
		return "", 0, apperror.NewUnauthorized()
	}

	user, err := s.repository.FindUserByID(stored.UserID)
	if err != nil {
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

	rowsAffected, err := s.repository.RevokeRefreshToken(tokenHash, now)
	if err != nil {
		return apperror.NewInternalServerError()
	}
	if rowsAffected == 0 {
		return apperror.NewUnauthorized()
	}

	return nil
}

func (s *AuthService) CurrentUser(userID int64) (*User, []string, *apperror.APIError) {
	user, err := s.repository.FindUserByID(userID)
	if err != nil {
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

	return user, roles, nil
}

func (s *AuthService) rolesForUser(userID int64) ([]string, *apperror.APIError) {
	roles, err := s.repository.RolesForUser(userID)
	if err != nil {
		return nil, apperror.NewInternalServerError()
	}
	if len(roles) == 0 {
		return nil, apperror.NewUnauthorized()
	}

	return roles, nil
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
