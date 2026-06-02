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
	ListMyReviews(userID int64) (*MyReviewsResult, *apperror.APIError)
	GetMyReviewDetail(userID int64, reviewID int64) (*MyReviewDetailResult, *apperror.APIError)
	UpdateMyReview(userID int64, reviewID int64, input UpdateInput) (*MyReviewDetailResult, *apperror.APIError)
	PublishMyReview(userID int64, reviewID int64) (*MyReviewDetailResult, *apperror.APIError)
	DeleteMyReview(userID int64, reviewID int64) *apperror.APIError
	GetReviewSummary(productID int64) (*SummaryResult, *apperror.APIError)
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

func (h *Handler) ListMine(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}

	result, apiErr := h.service.ListMyReviews(userID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newListMyReviewsResponse(result))
}

func (h *Handler) ShowMine(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	reviewID, ok := reviewIDFromParam(c)
	if !ok {
		return
	}

	result, apiErr := h.service.GetMyReviewDetail(userID, reviewID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newMyReviewDetailResponse(result))
}

func (h *Handler) UpdateMine(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	reviewID, ok := reviewIDFromParam(c)
	if !ok {
		return
	}

	var req updateReviewRequest
	if !bindJSON(c, &req) {
		return
	}

	result, apiErr := h.service.UpdateMyReview(userID, reviewID, UpdateInput{
		Rating:  req.Rating,
		Title:   req.Title,
		Comment: req.Comment,
	})
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newMyReviewDetailResponse(result))
}

func (h *Handler) PublishMine(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	reviewID, ok := reviewIDFromParam(c)
	if !ok {
		return
	}

	result, apiErr := h.service.PublishMyReview(userID, reviewID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newMyReviewDetailResponse(result))
}

func (h *Handler) DeleteMine(c *gin.Context) {
	userID, ok := userIDFromContext(c)
	if !ok {
		return
	}
	reviewID, ok := reviewIDFromParam(c)
	if !ok {
		return
	}

	if apiErr := h.service.DeleteMyReview(userID, reviewID); apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, reviewMessageResponse{Message: "review deleted"})
}

func (h *Handler) Summary(c *gin.Context) {
	productID, ok := productIDFromParam(c)
	if !ok {
		return
	}

	result, apiErr := h.service.GetReviewSummary(productID)
	if apiErr != nil {
		writeAPIError(c, apiErr)
		return
	}

	response.Success(c, newReviewSummaryResponse(result))
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

func reviewIDFromParam(c *gin.Context) (int64, bool) {
	reviewID, err := strconv.ParseInt(c.Param("id"), 10, 64)
	if err != nil || reviewID <= 0 {
		writeAPIError(c, apperror.NewInvalidRequest("invalid review id"))
		return 0, false
	}

	return reviewID, true
}

func writeAPIError(c *gin.Context, apiErr *apperror.APIError) {
	response.Error(c, apperror.MapErrorCodeToStatus(apiErr.Code), *apiErr)
}
