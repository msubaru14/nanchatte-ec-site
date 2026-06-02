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

type ListResult struct {
	Reviews []PublishedReviewResult
}

type MyReviewsResult struct {
	Reviews []MyReviewResult
}

type SummaryResult struct {
	AverageRating float64
	ReviewCount   int64
}

type PublishedReviewResult struct {
	ReviewID     int64
	ReviewerName string
	Rating       int
	Title        *string
	Comment      *string
	CreatedAt    time.Time
	UpdatedAt    time.Time
}

type MyReviewResult struct {
	ReviewID    int64
	ProductID   int64
	ProductName string
	Rating      int
	Title       *string
	Comment     *string
	Status      Status
	CreatedAt   time.Time
	UpdatedAt   time.Time
}

type createReviewRequest struct {
	Rating  int     `json:"rating"`
	Title   *string `json:"title"`
	Comment *string `json:"comment"`
}

type listReviewsResponse struct {
	Reviews []publishedReviewResponse `json:"reviews"`
}

type listMyReviewsResponse struct {
	Reviews []myReviewResponse `json:"reviews"`
}

type reviewSummaryResponse struct {
	AverageRating float64 `json:"averageRating"`
	ReviewCount   int64   `json:"reviewCount"`
}

type publishedReviewResponse struct {
	ReviewID     int64     `json:"reviewId"`
	ReviewerName string    `json:"reviewerName"`
	Rating       int       `json:"rating"`
	Title        *string   `json:"title"`
	Comment      *string   `json:"comment"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
}

type myReviewResponse struct {
	ReviewID    int64     `json:"reviewId"`
	ProductID   int64     `json:"productId"`
	ProductName string    `json:"productName"`
	Rating      int       `json:"rating"`
	Title       *string   `json:"title"`
	Comment     *string   `json:"comment"`
	Status      Status    `json:"status"`
	CreatedAt   time.Time `json:"createdAt"`
	UpdatedAt   time.Time `json:"updatedAt"`
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

func newListReviewsResponse(result *ListResult) listReviewsResponse {
	reviews := make([]publishedReviewResponse, 0, len(result.Reviews))
	for _, review := range result.Reviews {
		reviews = append(reviews, publishedReviewResponse{
			ReviewID:     review.ReviewID,
			ReviewerName: review.ReviewerName,
			Rating:       review.Rating,
			Title:        review.Title,
			Comment:      review.Comment,
			CreatedAt:    review.CreatedAt,
			UpdatedAt:    review.UpdatedAt,
		})
	}

	return listReviewsResponse{Reviews: reviews}
}

func newListMyReviewsResponse(result *MyReviewsResult) listMyReviewsResponse {
	reviews := make([]myReviewResponse, 0, len(result.Reviews))
	for _, review := range result.Reviews {
		reviews = append(reviews, myReviewResponse{
			ReviewID:    review.ReviewID,
			ProductID:   review.ProductID,
			ProductName: review.ProductName,
			Rating:      review.Rating,
			Title:       review.Title,
			Comment:     review.Comment,
			Status:      review.Status,
			CreatedAt:   review.CreatedAt,
			UpdatedAt:   review.UpdatedAt,
		})
	}

	return listMyReviewsResponse{Reviews: reviews}
}

func newReviewSummaryResponse(result *SummaryResult) reviewSummaryResponse {
	return reviewSummaryResponse{
		AverageRating: result.AverageRating,
		ReviewCount:   result.ReviewCount,
	}
}
