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

export type ReviewStatus = "draft" | "published" | "hidden";

export type ReviewCreateInput = {
  rating: number;
  title: string | null;
  comment: string | null;
};

export type ReviewCreateResult = {
  reviewId: number;
  productId: number;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
};

export type MyReview = {
  reviewId: number;
  productId: number;
  productName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: ReviewStatus;
  createdAt: string;
  updatedAt: string;
};
