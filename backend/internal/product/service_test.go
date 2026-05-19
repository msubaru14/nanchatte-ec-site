package product

import "testing"

func TestPriceIncludingTax(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		priceExcludingTax int
		taxRate           float64
		want              int
	}{
		{
			name:              "税率適用確認1",
			priceExcludingTax: 1000,
			taxRate:           0.10,
			want:              1100,
		},
		{
			name:              "税率適用確認2",
			priceExcludingTax: 1000,
			taxRate:           0.08,
			want:              1080,
		},
		{
			name:              "小数点以下を切り捨てる",
			priceExcludingTax: 999,
			taxRate:           0.10,
			want:              1098,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := priceIncludingTax(tt.priceExcludingTax, tt.taxRate)
			if got != tt.want {
				t.Fatalf("priceIncludingTax() = %d, want %d", got, tt.want)
			}
		})
	}
}

func TestStockStatus(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name              string
		stockQuantity     int
		lowStockThreshold int
		want              StockStatus
	}{
		{
			name:              "在庫なし",
			stockQuantity:     0,
			lowStockThreshold: 3,
			want:              StockStatusOutOfStock,
		},
		{
			name:              "閾値未満なら残りわずか",
			stockQuantity:     2,
			lowStockThreshold: 3,
			want:              StockStatusLowStock,
		},
		{
			name:              "閾値ちょうどなら残りわずか",
			stockQuantity:     3,
			lowStockThreshold: 3,
			want:              StockStatusLowStock,
		},
		{
			name:              "閾値を超えていれば在庫あり",
			stockQuantity:     4,
			lowStockThreshold: 3,
			want:              StockStatusInStock,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()

			got := stockStatus(tt.stockQuantity, tt.lowStockThreshold)
			if got != tt.want {
				t.Fatalf("stockStatus() = %s, want %s", got, tt.want)
			}
		})
	}
}
