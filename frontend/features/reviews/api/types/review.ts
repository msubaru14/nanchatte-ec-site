export type ProductReview = {
  reviewId: number;
  reviewerName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ProductReviewList = {
  reviews: ProductReview[];
};

export type ProductReviewSummary = {
  averageRating: number;
  reviewCount: number;
};
