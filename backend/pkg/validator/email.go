package validator

import (
	"net/mail"
	"strings"
)

func NormalizeEmail(email string) (string, bool) {
	normalized := strings.ToLower(strings.TrimSpace(email))
	if normalized == "" {
		return "", false
	}

	address, err := mail.ParseAddress(normalized)
	if err != nil || address.Address != normalized {
		return "", false
	}

	return normalized, true
}
