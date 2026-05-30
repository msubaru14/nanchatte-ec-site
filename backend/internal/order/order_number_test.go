package order

import (
	"regexp"
	"testing"
	"time"
)

func TestGenerateOrderNumber(t *testing.T) {
	tests := []struct {
		name      string
		orderedAt time.Time
		wantRegex string
	}{
		{
			name:      "注文日の年月日と6桁の英数字を含む注文番号を生成できる",
			orderedAt: time.Date(2026, 5, 28, 12, 0, 0, 0, time.UTC),
			wantRegex: `^ORD-20260528-[A-Z0-9]{6}$`,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got, err := generateOrderNumber(tt.orderedAt)
			if err != nil {
				t.Fatalf("generateOrderNumber() error = %v", err)
			}

			if !regexp.MustCompile(tt.wantRegex).MatchString(got) {
				t.Fatalf("generateOrderNumber() = %q, want regex %q", got, tt.wantRegex)
			}
		})
	}
}
