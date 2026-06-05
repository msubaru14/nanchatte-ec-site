import "server-only";

import {
  backendFetch,
  backendFetchWithAuth,
  getJsonHeaders,
  parseBackendResponse,
} from "../../../auth/api/server";
import type {
  MyReview,
  MyReviewList,
  ProductReviewList,
  ProductReviewSummary,
  ReviewCreateResult,
  ReviewMessageResult,
} from "../types";

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

export const createProductReviewWithBackend = async (
  productId: string,
  body: string,
) => {
  const response = await backendFetchWithAuth(
    `/api/products/${encodeURIComponent(productId)}/reviews`,
    {
      method: "POST",
      headers: getJsonHeaders(),
      body,
    },
  );
  const json = await parseBackendResponse<ReviewCreateResult>(response);

  return { response, json };
};

export const fetchMyReviewsWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/me/reviews", {
    method: "GET",
  });
  const json = await parseBackendResponse<MyReviewList>(response);

  return { response, json };
};

export const fetchMyReviewDetailWithBackend = async (reviewId: string) => {
  const response = await backendFetchWithAuth(
    `/api/me/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "GET",
    },
  );
  const json = await parseBackendResponse<MyReview>(response);

  return { response, json };
};

export const updateMyReviewWithBackend = async (
  reviewId: string,
  body: string,
) => {
  const response = await backendFetchWithAuth(
    `/api/me/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "PATCH",
      headers: getJsonHeaders(),
      body,
    },
  );
  const json = await parseBackendResponse<MyReview>(response);

  return { response, json };
};

export const deleteMyReviewWithBackend = async (reviewId: string) => {
  const response = await backendFetchWithAuth(
    `/api/me/reviews/${encodeURIComponent(reviewId)}`,
    {
      method: "DELETE",
    },
  );
  const json = await parseBackendResponse<ReviewMessageResult>(response);

  return { response, json };
};

export const publishMyReviewWithBackend = async (reviewId: string) => {
  const response = await backendFetchWithAuth(
    `/api/me/reviews/${encodeURIComponent(reviewId)}/publish`,
    {
      method: "POST",
    },
  );
  const json = await parseBackendResponse<MyReview>(response);

  return { response, json };
};
