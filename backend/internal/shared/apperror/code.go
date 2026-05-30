package apperror

const (
	CodeInvalidRequest      = "INVALID_REQUEST"
	CodeValidationError     = "VALIDATION_ERROR"
	CodeConflict            = "CONFLICT"
	CodeEmptyCart           = "EMPTY_CART"
	CodeOutOfStock          = "OUT_OF_STOCK"
	CodeUnauthorized        = "UNAUTHORIZED"
	CodeForbidden           = "FORBIDDEN"
	CodeNotFound            = "NOT_FOUND"
	CodeInternalServerError = "INTERNAL_SERVER_ERROR"
)

const (
	DetailRequired      = "REQUIRED"
	DetailInvalidFormat = "INVALID_FORMAT"
	DetailTooShort      = "TOO_SHORT"
	DetailTooLong       = "TOO_LONG"
	DetailOutOfRange    = "OUT_OF_RANGE"
)
