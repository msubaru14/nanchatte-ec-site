package auth

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"errors"
	"strings"
	"time"
)

var (
	ErrInvalidToken = errors.New("invalid token")
	ErrExpiredToken = errors.New("expired token")
)

type JWTClaims struct {
	UserID int64    `json:"userId"`
	Roles  []string `json:"roles"`
	Exp    int64    `json:"exp"`
}

type jwtHeader struct {
	Alg string `json:"alg"`
	Typ string `json:"typ"`
}

func GenerateJWT(secret string, userID int64, roles []string, now time.Time, ttl time.Duration) (string, error) {
	header := jwtHeader{
		Alg: "HS256",
		Typ: "JWT",
	}
	claims := JWTClaims{
		UserID: userID,
		Roles:  roles,
		Exp:    now.Add(ttl).Unix(),
	}

	headerJSON, err := json.Marshal(header)
	if err != nil {
		return "", err
	}

	claimsJSON, err := json.Marshal(claims)
	if err != nil {
		return "", err
	}

	encodedHeader := base64.RawURLEncoding.EncodeToString(headerJSON)
	encodedClaims := base64.RawURLEncoding.EncodeToString(claimsJSON)
	signingInput := encodedHeader + "." + encodedClaims
	signature := signJWT(secret, signingInput)

	return signingInput + "." + signature, nil
}

func ParseJWT(secret string, token string, now time.Time) (JWTClaims, error) {
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return JWTClaims{}, ErrInvalidToken
	}

	signingInput := parts[0] + "." + parts[1]
	expectedSignature := signJWT(secret, signingInput)
	if !hmac.Equal([]byte(expectedSignature), []byte(parts[2])) {
		return JWTClaims{}, ErrInvalidToken
	}

	headerJSON, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return JWTClaims{}, ErrInvalidToken
	}

	var header jwtHeader
	if err := json.Unmarshal(headerJSON, &header); err != nil {
		return JWTClaims{}, ErrInvalidToken
	}
	if header.Alg != "HS256" || header.Typ != "JWT" {
		return JWTClaims{}, ErrInvalidToken
	}

	claimsJSON, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return JWTClaims{}, ErrInvalidToken
	}

	var claims JWTClaims
	if err := json.Unmarshal(claimsJSON, &claims); err != nil {
		return JWTClaims{}, ErrInvalidToken
	}
	if claims.UserID <= 0 || len(claims.Roles) == 0 {
		return JWTClaims{}, ErrInvalidToken
	}
	if now.Unix() >= claims.Exp {
		return JWTClaims{}, ErrExpiredToken
	}

	return claims, nil
}

func signJWT(secret string, signingInput string) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write([]byte(signingInput))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}
