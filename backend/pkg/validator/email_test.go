package validator

import "testing"

func TestNormalizeEmail(t *testing.T) {
	tests := []struct {
		name   string
		email  string
		want   string
		wantOK bool
	}{
		{
			name:   "小文字のメールアドレスはそのまま返す",
			email:  "test@example.com",
			want:   "test@example.com",
			wantOK: true,
		},
		{
			name:   "前後の空白を除去して小文字化する",
			email:  "  TEST@Example.COM  ",
			want:   "test@example.com",
			wantOK: true,
		},
		{
			name:   "空文字は不正とする",
			email:  "",
			wantOK: false,
		},
		{
			name:   "空白のみは不正とする",
			email:  "   ",
			wantOK: false,
		},
		{
			name:   "アットマークがない場合は不正とする",
			email:  "not-an-email",
			wantOK: false,
		},
		{
			name:   "複数メールアドレスは不正とする",
			email:  "test@example.com, other@example.com",
			wantOK: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, ok := NormalizeEmail(tt.email)
			if ok != tt.wantOK {
				t.Fatalf("NormalizeEmail() ok = %v, want %v", ok, tt.wantOK)
			}
			if got != tt.want {
				t.Fatalf("NormalizeEmail() = %q, want %q", got, tt.want)
			}
		})
	}
}
