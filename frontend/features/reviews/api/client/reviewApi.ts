import { ERROR_CODES } from "../../../../constants/errorCodes";
import { requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type { ProductReviewList, ProductReviewSummary } from "../types";

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
