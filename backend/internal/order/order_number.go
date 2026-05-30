package order

import (
	"crypto/rand"
	"fmt"
	"math/big"
	"time"
)

const (
	orderNumberPrefix       = "ORD"
	orderNumberRandomLength = 6
	orderNumberAlphabet     = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
)

func generateOrderNumber(orderedAt time.Time) (string, error) {
	randomPart, err := randomString(orderNumberRandomLength)
	if err != nil {
		return "", err
	}

	return fmt.Sprintf("%s-%s-%s", orderNumberPrefix, orderedAt.Format("20060102"), randomPart), nil
}

func randomString(length int) (string, error) {
	result := make([]byte, length)
	max := big.NewInt(int64(len(orderNumberAlphabet)))

	for i := range result {
		n, err := rand.Int(rand.Reader, max)
		if err != nil {
			return "", err
		}
		result[i] = orderNumberAlphabet[n.Int64()]
	}

	return string(result), nil
}
