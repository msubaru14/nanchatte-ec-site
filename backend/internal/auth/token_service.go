package auth

import (
	"time"

	sharedauth "github.com/msubaru14/nanchatte-ec-backend/internal/shared/auth"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/config"
)

const (
	AccessTokenTTL  = 15 * time.Minute
	RefreshTokenTTL = 7 * 24 * time.Hour
)

type TokenService struct {
	secret string
	now    func() time.Time
}

func NewTokenService() *TokenService {
	return &TokenService{
		secret: config.JWTSecret(),
		now:    time.Now,
	}
}

func NewTokenServiceWithSecret(secret string, now func() time.Time) *TokenService {
	return &TokenService{
		secret: secret,
		now:    now,
	}
}

func (s *TokenService) GenerateAccessToken(userID int64, roles []string) (string, error) {
	return sharedauth.GenerateJWT(s.secret, userID, roles, s.now(), AccessTokenTTL)
}

func (s *TokenService) ParseAccessToken(token string) (sharedauth.JWTClaims, error) {
	return sharedauth.ParseJWT(s.secret, token, s.now())
}

func (s *TokenService) GenerateRefreshToken() (rawToken string, tokenHash string, expiresAt time.Time, err error) {
	rawToken, err = sharedauth.GenerateRefreshToken()
	if err != nil {
		return "", "", time.Time{}, err
	}

	return rawToken, sharedauth.HashRefreshToken(rawToken), s.now().Add(RefreshTokenTTL), nil
}

func (s *TokenService) HashRefreshToken(token string) string {
	return sharedauth.HashRefreshToken(token)
}
