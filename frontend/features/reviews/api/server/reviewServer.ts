import "server-only";

import {
  backendFetch,
  parseBackendResponse,
} from "../../../auth/api/server";
import type { ProductReviewList, ProductReviewSummary } from "../types";

export const fetchProductReviewsWithBackend = async (productId: string) => {
  const response = await backendFetch(
    `/api/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "GET",
    },
  );
  const json = await parseBackendResponse<ProductReviewList>(response);

  return { response, json };
};

export const fetchProductReviewSummaryWithBackend = async (
  productId: string,
) => {
  const response = await backendFetch(
    `/api/products/${encodeURIComponent(productId)}/reviews/summary`,
    {
      method: "GET",
    },
  );
  const json = await parseBackendResponse<ProductReviewSummary>(response);

  return { response, json };
};
