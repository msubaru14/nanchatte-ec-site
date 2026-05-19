package apperror

import "net/http"

// エラーレスポンス
type APIError struct {
	Code    string        `json:"code"`
	Message string        `json:"message"`
	Details []ErrorDetail `json:"details,omitempty"`
}

// エラー詳細
type ErrorDetail struct {
	Field   string `json:"field"`
	Code    string `json:"code"`
	Message string `json:"message"`
}

func MapErrorCodeToStatus(code string) int {
	switch code {
	case CodeInvalidRequest, CodeValidationError:
		return http.StatusBadRequest
	case CodeConflict:
		return http.StatusConflict
	case CodeUnauthorized:
		return http.StatusUnauthorized
	case CodeForbidden:
		return http.StatusForbidden
	case CodeNotFound:
		return http.StatusNotFound
	case CodeInternalServerError:
		return http.StatusInternalServerError
	default:
		return http.StatusInternalServerError
	}
}

// INVALID_REQUEST生成
func NewInvalidRequest(message string) *APIError {
	return &APIError{
		Code:    CodeInvalidRequest,
		Message: message,
	}
}

// NOT_FOUND生成
func NewNotFound(message string) *APIError {
	return &APIError{
		Code:    CodeNotFound,
		Message: message,
	}
}

// バリデーションエラー生成
func NewValidationError(message string, detail []ErrorDetail) *APIError {
	return &APIError{
		Code:    CodeValidationError,
		Message: message,
		Details: detail,
	}
}

// INTERNAL_SERVER_ERROR生成
func NewInternalServerError() *APIError {
	return &APIError{
		Code:    CodeInternalServerError,
		Message: "internal server error",
	}
}

// UNAUTHORIZED生成
func NewUnauthorized() *APIError {
	return &APIError{
		Code:    CodeUnauthorized,
		Message: "unauthorized",
	}
}

func NewForbidden() *APIError {
	return &APIError{
		Code:    CodeForbidden,
		Message: "forbidden",
	}
}

func NewConflict(message string) *APIError {
	return &APIError{
		Code:    CodeConflict,
		Message: message,
	}
}

func (e *APIError) Error() string {
	return e.Message
}
