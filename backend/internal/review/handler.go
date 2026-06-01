package review

import (
	"strconv"

	"github.com/gin-gonic/gin"
	"github.com/msubaru14/nanchatte-ec-backend/internal/middleware"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/apperror"
	"github.com/msubaru14/nanchatte-ec-backend/internal/shared/response"
)

type Handler struct {
	service reviewService
}

type reviewService interface {
	CreateReview(userID int64, productID int64, input CreateInput) (*CreateResult, *apperror.APIError)
	ListPublishedReviews(productID int64) (*ListResult, *apperror.APIError)
}

func NewHandler(service reviewService) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(c *gin.Context) {
	productID, ok := productIDFromParam(c)
	if !ok {
		return
	}

	result, apiErr := h.service.ListPublishedReviews(productID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newListReviewsResponse(result))
}

func (h *Handler) Create(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	productID, ok := productIDFromParam(c)
	if !ok {
		return
	}

	var req createReviewRequest
	if !bindJSON(c, &req) {
		return
	}

	result, apiErr := h.service.CreateReview(userID, productID, CreateInput{
		Rating:  req.Rating,
		Title:   req.Title,
		Comment: req.Comment,
	})
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.SuccessCreated(c, newCreateReviewResponse(result))
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
	rawProductID := c.Param("productId")
	if rawProductID == "" {
		rawProductID = c.Param("id")
	}

	productID, err := strconv.ParseInt(rawProductID, 10, 64)
	if err != nil || productID <= 0 {
		writeAPIError(c, apperror.NewInvalidRequest("invalid product id"))
		return 0, false
	}

	return productID, true
}

func writeAPIError(c *gin.Context, apiErr *apperror.APIError) {
	response.Error(c, apperror.MapErrorCodeToStatus(apiErr.Code), *apiErr)
}
