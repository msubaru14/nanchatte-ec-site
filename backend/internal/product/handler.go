package product

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	query := ProductListQuery{}
	products, apiErr := h.service.ListProducts(query)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, products)
}

func (h *Handler) Show(c *gin.Context) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		writeAPIError(c, apperror.NewInvalidRequest("invalid product id"))
		return
	}

	product, apiErr := h.service.GetProduct(id)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, product)
}

func writeAPIError(c *gin.Context, apiErr *apperror.APIError) {
	response.Error(c, apperror.MapErrorCodeToStatus(apiErr.Code), *apiErr)
}
