import { NextResponse } from "next/server";

import {
  createOrderWithBackend,
  fetchOrderDetailWithBackend,
  fetchOrdersWithBackend,
} from "../server";

export const handleGetOrders = async () => {
  const { response, json } = await fetchOrdersWithBackend();

  return NextResponse.json(json, { status: response.status });
};

export const handleGetOrderDetail = async (
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) => {
  const { id } = await params;
  const { response, json } = await fetchOrderDetailWithBackend(id);

  return NextResponse.json(json, { status: response.status });
};

export const handleCreateOrder = async () => {
  const { response, json } = await createOrderWithBackend();

  return NextResponse.json(json, { status: response.status });
};
