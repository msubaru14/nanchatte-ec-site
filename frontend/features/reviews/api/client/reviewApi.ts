import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type {
  MyReview,
  ProductReviewList,
  ProductReviewSummary,
  ReviewCreateInput,
  ReviewCreateResult,
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
