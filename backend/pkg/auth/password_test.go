package auth

import "testing"

func TestHashPasswordAndVerifyPassword(t *testing.T) {
	password := "secret123"

	hash, err := HashPassword(password)
	if err != nil {
		t.Fatalf("HashPassword returned error: %v", err)
	}
	if hash == "" {
		t.Fatal("HashPassword returned empty hash")
	}
	if hash == password {
		t.Fatal("HashPassword returned raw password")
	}

	tests := []struct {
		name     string
		password string
		want     bool
	}{
		{
			name:     "正しいパスワードならtrueを返す",
			password: "secret123",
			want:     true,
		},
		{
			name:     "誤ったパスワードならfalseを返す",
			password: "wrong-password",
			want:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := VerifyPassword(tt.password, hash); got != tt.want {
				t.Fatalf("VerifyPassword() = %v, want %v", got, tt.want)
			}
		})
	}
}
