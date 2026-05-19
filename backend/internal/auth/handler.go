package auth

import (
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/validation"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/validator"
)

const (
	nameMaxLength     = 100
	emailMaxLength    = 255
	passwordMaxLength = 128
)

type AuthHandler struct {
	authService *AuthService
}

type registerRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type refreshRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type logoutRequest struct {
	RefreshToken string `json:"refreshToken"`
}

type userResponse struct {
	ID    int64    `json:"id"`
	Name  string   `json:"name"`
	Email string   `json:"email"`
	Roles []string `json:"roles"`
}

type tokenPairResponse struct {
	AccessToken  string `json:"accessToken"`
	RefreshToken string `json:"refreshToken"`
	TokenType    string `json:"tokenType"`
	ExpiresIn    int64  `json:"expiresIn"`
}

type authResponse struct {
	User   userResponse      `json:"user"`
	Tokens tokenPairResponse `json:"tokens"`
}

type accessTokenResponse struct {
	AccessToken string `json:"accessToken"`
	TokenType   string `json:"tokenType"`
	ExpiresIn   int64  `json:"expiresIn"`
}

func NewAuthHandler(authService *AuthService) *AuthHandler {
	return &AuthHandler{authService: authService}
}

func (a *AuthHandler) Register(c *gin.Context) {
	var req registerRequest
	if !bindJSON(c, &req) {
		return
	}

	if details := validateRegisterRequest(req); len(details) > 0 {
		writeAPIError(c, apperror.NewValidationError("validation error", details))
		return
	}

	result, apiErr := a.authService.Register(req.Name, req.Email, req.Password)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.SuccessCreated(c, newAuthResponse(result))
}

func (a *AuthHandler) Login(c *gin.Context) {
	var req loginRequest
	if !bindJSON(c, &req) {
		return
	}

	if details := validateLoginRequest(req); len(details) > 0 {
		writeAPIError(c, apperror.NewValidationError("validation error", details))
		return
	}

	result, apiErr := a.authService.Login(req.Email, req.Password)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newAuthResponse(result))
}

func (a *AuthHandler) Refresh(c *gin.Context) {
	var req refreshRequest
	if !bindJSON(c, &req) {
		return
	}
	if strings.TrimSpace(req.RefreshToken) == "" {
		writeAPIError(c, apperror.NewValidationError("validation error", []apperror.ErrorDetail{
			{Field: "refreshToken", Code: apperror.DetailRequired, Message: "refreshToken is required"},
		}))
		return
	}

	accessToken, expiresIn, apiErr := a.authService.Refresh(req.RefreshToken)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, accessTokenResponse{
		AccessToken: accessToken,
		TokenType:   "Bearer",
		ExpiresIn:   expiresIn,
	})
}

func (a *AuthHandler) Logout(c *gin.Context) {
	var req logoutRequest
	if !bindJSON(c, &req) {
		return
	}
	if strings.TrimSpace(req.RefreshToken) == "" {
		writeAPIError(c, apperror.NewValidationError("validation error", []apperror.ErrorDetail{
			{Field: "refreshToken", Code: apperror.DetailRequired, Message: "refreshToken is required"},
		}))
		return
	}

	if apiErr := a.authService.Logout(req.RefreshToken); apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, gin.H{"message": "logged out"})
}

func validateRegisterRequest(req registerRequest) []apperror.ErrorDetail {
	details := make([]apperror.ErrorDetail, 0)
	name := strings.TrimSpace(req.Name)

	if name == "" {
		details = append(details, apperror.ErrorDetail{Field: "name", Code: apperror.DetailRequired, Message: "name is required"})
	} else if len([]rune(name)) > nameMaxLength {
		details = append(details, apperror.ErrorDetail{Field: "name", Code: apperror.DetailTooLong, Message: "name is too long"})
	}

	details = append(details, validateEmail(req.Email)...)
	details = append(details, validatePassword(req.Password)...)

	return details
}

func validateLoginRequest(req loginRequest) []apperror.ErrorDetail {
	details := make([]apperror.ErrorDetail, 0)
	details = append(details, validateEmail(req.Email)...)
	if strings.TrimSpace(req.Password) == "" {
		details = append(details, apperror.ErrorDetail{Field: "password", Code: apperror.DetailRequired, Message: "password is required"})
	}

	return details
}

func validateEmail(email string) []apperror.ErrorDetail {
	if strings.TrimSpace(email) == "" {
		return []apperror.ErrorDetail{{Field: "email", Code: apperror.DetailRequired, Message: "email is required"}}
	}
	if len(email) > emailMaxLength {
		return []apperror.ErrorDetail{{Field: "email", Code: apperror.DetailTooLong, Message: "email is too long"}}
	}
	if _, ok := validator.NormalizeEmail(email); !ok {
		return []apperror.ErrorDetail{{Field: "email", Code: apperror.DetailInvalidFormat, Message: "email is invalid"}}
	}

	return nil
}

func validatePassword(password string) []apperror.ErrorDetail {
	if password == "" {
		return []apperror.ErrorDetail{{Field: "password", Code: apperror.DetailRequired, Message: "password is required"}}
	}
	if len(password) < validation.UserPasswordMinLength {
		return []apperror.ErrorDetail{{Field: "password", Code: apperror.DetailTooShort, Message: "password is too short"}}
	}
	if len(password) > passwordMaxLength {
		return []apperror.ErrorDetail{{Field: "password", Code: apperror.DetailTooLong, Message: "password is too long"}}
	}

	return nil
}

func newAuthResponse(result *AuthResult) authResponse {
	return authResponse{
		User: userResponse{
			ID:    result.User.ID,
			Name:  result.User.Name,
			Email: result.User.Email,
			Roles: result.Roles,
		},
		Tokens: tokenPairResponse{
			AccessToken:  result.AccessToken,
			RefreshToken: result.RefreshToken,
			TokenType:    "Bearer",
			ExpiresIn:    result.ExpiresIn,
		},
	}
}
