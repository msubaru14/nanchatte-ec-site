package review

import "time"

type CreateInput struct {
	Rating  int
	Title   *string
	Comment *string
}

type CreateResult struct {
	ReviewID  int64
	ProductID int64
	Rating    int
	Title     *string
	Comment   *string
	Status    Status
	CreatedAt time.Time
	UpdatedAt time.Time
}

type createReviewRequest struct {
	Rating  int     `json:"rating"`
	Title   *string `json:"title"`
	Comment *string `json:"comment"`
}

type createReviewResponse struct {
	ReviewID  int64     `json:"reviewId"`
	ProductID int64     `json:"productId"`
	Rating    int       `json:"rating"`
	Title     *string   `json:"title"`
	Comment   *string   `json:"comment"`
	Status    Status    `json:"status"`
	CreatedAt time.Time `json:"createdAt"`
	UpdatedAt time.Time `json:"updatedAt"`
}

func newCreateReviewResponse(result *CreateResult) createReviewResponse {
	return createReviewResponse{
		ReviewID:  result.ReviewID,
		ProductID: result.ProductID,
		Rating:    result.Rating,
		Title:     result.Title,
		Comment:   result.Comment,
		Status:    result.Status,
		CreatedAt: result.CreatedAt,
		UpdatedAt: result.UpdatedAt,
	}
}
