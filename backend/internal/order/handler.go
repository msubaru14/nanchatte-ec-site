package order

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/middleware"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

type Handler struct {
	service orderService
}

type orderService interface {
	CreateOrder(userID int64) (*CreateResult, *apperror.APIError)
	ListOrders(userID int64) (*ListResult, *apperror.APIError)
	GetOrderDetail(userID int64, orderID int64) (*DetailResult, *apperror.APIError)
	ListAdminOrders() (*AdminListResult, *apperror.APIError)
	GetAdminOrderDetail(orderID int64) (*AdminDetailResult, *apperror.APIError)
	CancelAdminOrder(orderID int64) (*AdminCancelResult, *apperror.APIError)
}

func NewHandler(service orderService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) Create(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}

	result, apiErr := h.service.CreateOrder(userID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.SuccessCreated(c, newCreateOrderResponse(result))
}

func (h *Handler) List(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}

	result, apiErr := h.service.ListOrders(userID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newListOrdersResponse(result))
}

func (h *Handler) Show(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	orderID, ok := orderIDFromParam(c)
	if !ok {
		return
	}

	result, apiErr := h.service.GetOrderDetail(userID, orderID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newOrderDetailResponse(result))
}

func (h *Handler) ListAdmin(c *gin.Context) {
	result, apiErr := h.service.ListAdminOrders()
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newListAdminOrdersResponse(result))
}

func (h *Handler) ShowAdmin(c *gin.Context) {
	orderID, ok := orderIDFromParam(c)
	if !ok {
		return
	}

	result, apiErr := h.service.GetAdminOrderDetail(orderID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newAdminOrderDetailResponse(result))
}

func (h *Handler) CancelAdmin(c *gin.Context) {
	orderID, ok := orderIDFromParam(c)
	if !ok {
		return
	}

	result, apiErr := h.service.CancelAdminOrder(orderID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newAdminOrderCancelResponse(result))
}

func userIDFromContext(c *gin.Context) (int64, bool) {
	userID, ok := middleware.UserIDFromContext(c)
	if !ok {
		writeAPIError(c, apperror.NewUnauthorized())
		return 0, false
	}

	return userID, true
}

func orderIDFromParam(c *gin.Context) (int64, bool) {
	orderID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || orderID <= 0 {
		writeAPIError(c, apperror.NewInvalidRequest("invalid order id"))
		return 0, false
	}

	return orderID, true
}

func writeAPIError(c *gin.Context, apiErr *apperror.APIError) {
	response.Error(c, apperror.MapErrorCodeToStatus(apiErr.Code), *apiErr)
}
