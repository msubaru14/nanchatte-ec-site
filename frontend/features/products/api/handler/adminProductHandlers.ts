import { NextResponse } from "next/server";

import {
  createAdminProductWithBackend,
  fetchAdminProductDetailWithBackend,
  fetchAdminProductsWithBackend,
  resumeSellingAdminProductWithBackend,
  stopSellingAdminProductWithBackend,
  updateAdminProductWithBackend,
} from "../server";

export const handleGetAdminProducts = async () => {
  const { response, json } = await fetchAdminProductsWithBackend();

  return NextResponse.json(json, { status: response.status });
};

export const handleGetAdminProductDetail = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await fetchAdminProductDetailWithBackend(id);

  return NextResponse.json(json, { status: response.status });
};

export const handleCreateAdminProduct = async (request: Request) => {
  const { response, json } = await createAdminProductWithBackend(
    await request.text(),
  );

  return NextResponse.json(json, { status: response.status });
};

export const handleUpdateAdminProduct = async (
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await updateAdminProductWithBackend(
    id,
    await request.text(),
  );

  return NextResponse.json(json, { status: response.status });
};

export const handleStopSellingAdminProduct = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await stopSellingAdminProductWithBackend(id);

  return NextResponse.json(json, { status: response.status });
};

export const handleResumeSellingAdminProduct = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await resumeSellingAdminProductWithBackend(id);

  return NextResponse.json(json, { status: response.status });
};
