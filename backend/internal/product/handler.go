package product

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

type Handler struct {
	service productService
}

type productService interface {
	ListProducts(query ProductListQuery) ([]ProductResponse, *apperror.APIError)
	GetProduct(id int64) (*ProductResponse, *apperror.APIError)
	ListAdminProducts() (*AdminProductListResponse, *apperror.APIError)
	GetAdminProduct(id int64) (*AdminProductResponse, *apperror.APIError)
	CreateAdminProduct(input AdminProductCreateInput) (*AdminProductResponse, *apperror.APIError)
	UpdateAdminProduct(productID int64, input AdminProductUpdateInput) (*AdminProductResponse, *apperror.APIError)
	StopSellingAdminProduct(productID int64) (*AdminProductResponse, *apperror.APIError)
	ResumeSellingAdminProduct(productID int64) (*AdminProductResponse, *apperror.APIError)
}

func NewHandler(service productService) *Handler {
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

func (h *Handler) ListAdmin(c *gin.Context) {
	result, apiErr := h.service.ListAdminProducts()
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, result)
}

func (h *Handler) ShowAdmin(c *gin.Context) {
	id, ok := productIDFromParam(c)
	if !ok {
		return
	}

	product, apiErr := h.service.GetAdminProduct(id)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, product)
}

func (h *Handler) CreateAdmin(c *gin.Context) {
	var req adminProductCreateRequest
	if !bindJSON(c, &req) {
		return
	}

	product, apiErr := h.service.CreateAdminProduct(AdminProductCreateInput{
		Name:              req.Name,
		Description:       req.Description,
		Price:             req.Price,
		TaxRateID:         req.TaxRateID,
		CategoryID:        req.CategoryID,
		StockQuantity:     req.StockQuantity,
		LowStockThreshold: req.LowStockThreshold,
		Status:            req.Status,
	})
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.SuccessCreated(c, product)
}

func (h *Handler) UpdateAdmin(c *gin.Context) {
	id, ok := productIDFromParam(c)
	if !ok {
		return
	}

	var req adminProductUpdateRequest
	if !bindJSON(c, &req) {
		return
	}

	product, apiErr := h.service.UpdateAdminProduct(id, AdminProductUpdateInput{
		Name:              req.Name,
		Description:       req.Description,
		Price:             req.Price,
		TaxRateID:         req.TaxRateID,
		CategoryID:        req.CategoryID,
		StockQuantity:     req.StockQuantity,
		LowStockThreshold: req.LowStockThreshold,
	})
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, product)
}

func (h *Handler) StopSellingAdmin(c *gin.Context) {
	id, ok := productIDFromParam(c)
	if !ok {
		return
	}

	product, apiErr := h.service.StopSellingAdminProduct(id)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, product)
}

func (h *Handler) ResumeSellingAdmin(c *gin.Context) {
	id, ok := productIDFromParam(c)
	if !ok {
		return
	}

	product, apiErr := h.service.ResumeSellingAdminProduct(id)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, product)
}

func productIDFromParam(c *gin.Context) (int64, bool) {
	id, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || id <= 0 {
		writeAPIError(c, apperror.NewInvalidRequest("invalid product id"))
		return 0, false
	}

	return id, true
}

func bindJSON(c *gin.Context, target interface{}) bool {
	if err := c.ShouldBindJSON(target); err != nil {
		writeAPIError(c, apperror.NewInvalidRequest("invalid request body"))
		return false
	}

	return true
}

func writeAPIError(c *gin.Context, apiErr *apperror.APIError) {
	response.Error(c, apperror.MapErrorCodeToStatus(apiErr.Code), *apiErr)
}
