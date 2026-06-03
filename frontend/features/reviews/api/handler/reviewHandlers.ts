import { NextResponse } from "next/server";

import {
  fetchProductReviewsWithBackend,
  fetchProductReviewSummaryWithBackend,
} from "../server";

export const handleGetProductReviews = async (
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) => {
  const { productId } = await params;
  const { response, json } = await fetchProductReviewsWithBackend(productId);

  return NextResponse.json(json, { status: response.status });
};

export const handleGetProductReviewSummary = async (
  _request: Request,
  { params }: { params: Promise<{ productId: string }> },
) => {
  const { productId } = await params;
  const { response, json } =
    await fetchProductReviewSummaryWithBackend(productId);

  return NextResponse.json(json, { status: response.status });
};
