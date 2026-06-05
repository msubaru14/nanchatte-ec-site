import { NextResponse } from "next/server";

import {
  createProductReviewWithBackend,
  deleteMyReviewWithBackend,
  fetchMyReviewDetailWithBackend,
  fetchMyReviewsWithBackend,
  fetchProductReviewsWithBackend,
  fetchProductReviewSummaryWithBackend,
  publishMyReviewWithBackend,
  updateMyReviewWithBackend,
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

export const handleCreateProductReview = async (
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) => {
  const { productId } = await params;
  const { response, json } = await createProductReviewWithBackend(
    productId,
    await request.text(),
  );

  return NextResponse.json(json, { status: response.status });
};

export const handleGetMyReviews = async () => {
  const { response, json } = await fetchMyReviewsWithBackend();

  return NextResponse.json(json, { status: response.status });
};

export const handleGetMyReviewDetail = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await fetchMyReviewDetailWithBackend(id);

  return NextResponse.json(json, { status: response.status });
};

export const handleUpdateMyReview = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await updateMyReviewWithBackend(
    id,
    await request.text(),
  );

  return NextResponse.json(json, { status: response.status });
};

export const handleDeleteMyReview = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await deleteMyReviewWithBackend(id);

  return NextResponse.json(json, { status: response.status });
};

export const handlePublishMyReview = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await publishMyReviewWithBackend(id);

  return NextResponse.json(json, { status: response.status });
};
