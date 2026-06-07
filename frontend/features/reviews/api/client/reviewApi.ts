import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type {
  AdminReview,
  AdminReviewList,
  MyReview,
  MyReviewList,
  ProductReviewList,
  ProductReviewSummary,
  ReviewCreateInput,
  ReviewCreateResult,
  ReviewMessageResult,
  ReviewUpdateInput,
} from "../types";

export const fetchProductReviews = async (productId: number | string) => {
  const json = await requestJson<ProductReviewList>(
    `/api/products/${encodeURIComponent(String(productId))}/reviews`,
    {
      cache: "no-store",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Product review list response is empty",
    );
  }

  return json.data;
};

export const fetchProductReviewSummary = async (
  productId: number | string,
) => {
  const json = await requestJson<ProductReviewSummary>(
    `/api/products/${encodeURIComponent(String(productId))}/reviews/summary`,
    {
      cache: "no-store",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Product review summary response is empty",
    );
  }

  return json.data;
};

export const createProductReview = async (
  productId: number | string,
  input: ReviewCreateInput,
) => {
  const json = await requestJson<ReviewCreateResult>(
    `/api/products/${encodeURIComponent(String(productId))}/reviews`,
    {
      method: "POST",
      headers: getJsonHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Product review response is empty",
    );
  }

  return json.data;
};

export const fetchMyReviews = async () => {
  const json = await requestJson<MyReviewList>("/api/me/reviews", {
    cache: "no-store",
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "My review list response is empty",
    );
  }

  return json.data;
};

export const fetchMyReviewDetail = async (reviewId: number | string) => {
  const json = await requestJson<MyReview>(
    `/api/me/reviews/${encodeURIComponent(String(reviewId))}`,
    {
      cache: "no-store",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "My review detail response is empty",
    );
  }

  return json.data;
};

export const updateMyReview = async (
  reviewId: number | string,
  input: ReviewUpdateInput,
) => {
  const json = await requestJson<MyReview>(
    `/api/me/reviews/${encodeURIComponent(String(reviewId))}`,
    {
      method: "PATCH",
      headers: getJsonHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Updated review response is empty",
    );
  }

  return json.data;
};

export const deleteMyReview = async (reviewId: number | string) => {
  const json = await requestJson<ReviewMessageResult>(
    `/api/me/reviews/${encodeURIComponent(String(reviewId))}`,
    {
      method: "DELETE",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Deleted review response is empty",
    );
  }

  return json.data;
};

export const publishMyReview = async (reviewId: number | string) => {
  const json = await requestJson<MyReview>(
    `/api/me/reviews/${encodeURIComponent(String(reviewId))}/publish`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Published review response is empty",
    );
  }

  return json.data;
};

export const fetchAdminReviews = async () => {
  const json = await requestJson<AdminReviewList>("/api/admin/reviews", {
    cache: "no-store",
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Admin review list response is empty",
    );
  }

  return json.data;
};

export const hideAdminReview = async (reviewId: number | string) => {
  const json = await requestJson<AdminReview>(
    `/api/admin/reviews/${encodeURIComponent(String(reviewId))}/hide`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Hidden admin review response is empty",
    );
  }

  return json.data;
};

export const publishAdminReview = async (reviewId: number | string) => {
  const json = await requestJson<AdminReview>(
    `/api/admin/reviews/${encodeURIComponent(String(reviewId))}/publish`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Published admin review response is empty",
    );
  }

  return json.data;
};
