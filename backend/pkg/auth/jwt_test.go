package auth

import (
	"testing"
	"time"
)

func TestParseJWT(t *testing.T) {
	now := time.Date(2026, 5, 18, 12, 0, 0, 0, time.UTC)
	token, err := GenerateJWT("test-secret", 10, []string{"customer"}, now, time.Minute)
	if err != nil {
		t.Fatalf("GenerateJWT returned error: %v", err)
	}

	tests := []struct {
		name      string
		secret    string
		parseTime time.Time
		wantErr   error
	}{
		{
			name:      "期限内かつ署名が正しければclaimsを返す",
			secret:    "test-secret",
			parseTime: now.Add(30 * time.Second),
			wantErr:   nil,
		},
		{
			name:      "secretが違う場合はinvalid tokenを返す",
			secret:    "wrong-secret",
			parseTime: now,
			wantErr:   ErrInvalidToken,
		},
		{
			name:      "期限切れの場合はexpired tokenを返す",
			secret:    "test-secret",
			parseTime: now.Add(time.Minute),
			wantErr:   ErrExpiredToken,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			claims, err := ParseJWT(tt.secret, token, tt.parseTime)
			if err != tt.wantErr {
				t.Fatalf("ParseJWT error = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				return
			}
			if claims.UserID != 10 {
				t.Fatalf("UserID = %d, want 10", claims.UserID)
			}
			if len(claims.Roles) != 1 || claims.Roles[0] != "customer" {
				t.Fatalf("Roles = %#v, want [customer]", claims.Roles)
			}
		})
	}
}
