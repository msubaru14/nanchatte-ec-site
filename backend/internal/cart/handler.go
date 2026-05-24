package cart

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/middleware"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Show(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}

	result, apiErr := h.service.GetCart(userID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newCartResponse(result))
}

func (h *Handler) AddItem(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}

	var req addItemRequest
	if !bindJSON(c, &req) {
		return
	}
	if details := validateAddItemRequest(req); len(details) > 0 {
		writeAPIError(c, apperror.NewValidationError("validation error", details))
		return
	}

	if apiErr := h.service.AddItem(userID, req.ProductID, req.Quantity); apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, gin.H{"message": "cart item added"})
}

func (h *Handler) UpdateItemQuantity(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	productID, ok := productIDFromParam(c)
	if !ok {
		return
	}

	var req updateItemQuantityRequest
	if !bindJSON(c, &req) {
		return
	}
	if details := validateQuantity(req.Quantity); len(details) > 0 {
		writeAPIError(c, apperror.NewValidationError("validation error", details))
		return
	}

	if apiErr := h.service.UpdateItemQuantity(userID, productID, req.Quantity); apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, gin.H{"message": "cart item updated"})
}

func (h *Handler) DeleteItem(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	productID, ok := productIDFromParam(c)
	if !ok {
		return
	}

	if apiErr := h.service.DeleteItem(userID, productID); apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, gin.H{"message": "cart item deleted"})
}

func (h *Handler) DeleteAllItems(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}

	if apiErr := h.service.DeleteAllItems(userID); apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, gin.H{"message": "cart items deleted"})
}

func bindJSON(c *gin.Context, target interface{}) bool {
	if err := c.ShouldBindJSON(target); err != nil {
		writeAPIError(c, apperror.NewInvalidRequest("invalid request body"))
		return false
	}

	return true
}

func userIDFromContext(c *gin.Context) (int64, bool) {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		writeAPIError(c, apperror.NewUnauthorized())
		return 0, false
	}

	return userID, true
}

func productIDFromParam(c *gin.Context) (int64, bool) {
	productID, err := strconv.ParseInt(c.Param("productId"), 10, 64)
	if err != nil || productID <= 0 {
		writeAPIError(c, apperror.NewInvalidRequest("invalid product id"))
		return 0, false
	}

	return productID, true
}

func validateAddItemRequest(req addItemRequest) []apperror.ErrorDetail {
	details := make([]apperror.ErrorDetail, 0)
	if req.ProductID <= 0 {
		details = append(details, apperror.ErrorDetail{
			Field: "productId", Code: apperror.DetailRequired, Message: "productId is required",
		})
	}

	return append(details, validateQuantity(req.Quantity)...)
}

func validateQuantity(quantity int) []apperror.ErrorDetail {
	if quantity <= 0 {
		return []apperror.ErrorDetail{{
			Field: "quantity", Code: apperror.DetailOutOfRange, Message: "quantity must be greater than zero",
		}}
	}

	return nil
}

func writeAPIError(c *gin.Context, apiErr *apperror.APIError) {
	response.Error(c, apperror.MapErrorCodeToStatus(apiErr.Code), *apiErr)
}
