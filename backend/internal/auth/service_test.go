package auth

import (
	"errors"
	"testing"

	"github.com/jackc/pgx/v5/pgconn"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
)

func TestToAPIError(t *testing.T) {
	tests := []struct {
		name     string
		err      error
		wantCode string
	}{
		{
			name:     "APIErrorはそのまま返す",
			err:      apperror.NewUnauthorized(),
			wantCode: apperror.CodeUnauthorized,
		},
		{
			name: "users.emailのunique violationはconflictを返す",
			err: &pgconn.PgError{
				Code:           postgresUniqueViolationCode,
				ConstraintName: usersEmailUniqueConstraint,
			},
			wantCode: apperror.CodeConflict,
		},
		{
			name:     "通常のエラーはinternal server errorを返す",
			err:      errors.New("unexpected error"),
			wantCode: apperror.CodeInternalServerError,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			got := toAPIError(tt.err)
			if got.Code != tt.wantCode {
				t.Fatalf("toAPIError().Code = %q, want %q", got.Code, tt.wantCode)
			}
		})
	}
}
