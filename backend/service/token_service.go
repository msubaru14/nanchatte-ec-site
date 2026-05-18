package service

import (
	"time"

	authpkg "github.com/msubaru14/nanchatte-ec-backend/pkg/auth"
	"github.com/msubaru14/nanchatte-ec-backend/pkg/config"
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
	return authpkg.GenerateJWT(s.secret, userID, roles, s.now(), AccessTokenTTL)
}

func (s *TokenService) ParseAccessToken(token string) (authpkg.JWTClaims, error) {
	return authpkg.ParseJWT(s.secret, token, s.now())
}

func (s *TokenService) GenerateRefreshToken() (rawToken string, tokenHash string, expiresAt time.Time, err error) {
	rawToken, err = authpkg.GenerateRefreshToken()
	if err != nil {
		return "", "", time.Time{}, err
	}

	return rawToken, authpkg.HashRefreshToken(rawToken), s.now().Add(RefreshTokenTTL), nil
}

func (s *TokenService) HashRefreshToken(token string) string {
	return authpkg.HashRefreshToken(token)
}
