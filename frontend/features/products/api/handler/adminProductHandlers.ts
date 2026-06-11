import { NextResponse } from "next/server";

import {
  fetchAdminProductsWithBackend,
  resumeSellingAdminProductWithBackend,
  stopSellingAdminProductWithBackend,
} from "../server";

export const handleGetAdminProducts = async () => {
  const { response, json } = await fetchAdminProductsWithBackend();

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
