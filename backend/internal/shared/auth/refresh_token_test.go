package auth

import "testing"

func TestGenerateRefreshTokenAndHashRefreshToken(t *testing.T) {
	token, err := GenerateRefreshToken()
	if err != nil {
		t.Fatalf("GenerateRefreshToken returned error: %v", err)
	}
	if token == "" {
		t.Fatal("GenerateRefreshToken returned empty token")
	}

	hash := HashRefreshToken(token)
	if hash == "" {
		t.Fatal("HashRefreshToken returned empty hash")
	}
	if hash == token {
		t.Fatal("HashRefreshToken returned raw token")
	}
	if hash != HashRefreshToken(token) {
		t.Fatal("HashRefreshToken is not deterministic")
	}
}
