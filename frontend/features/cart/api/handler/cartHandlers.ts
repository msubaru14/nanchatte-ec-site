import { NextResponse } from "next/server";

import {
  addCartItemWithBackend,
  fetchCartWithBackend,
  updateCartItemQuantityWithBackend,
} from "../server";

export const handleGetCart = async () => {
  const { response, json } = await fetchCartWithBackend();

  return NextResponse.json(json, { status: response.status });
};

export const handleAddCartItem = async (request: Request) => {
  const { response, json } = await addCartItemWithBackend(await request.text());

  return NextResponse.json(json, { status: response.status });
};

export const handleUpdateCartItemQuantity = async (
  request: Request,
  { params }: { params: Promise<{ productId: string }> },
) => {
  const { productId } = await params;
  const { response, json } = await updateCartItemQuantityWithBackend(
    productId,
    await request.text(),
  );

  return NextResponse.json(json, { status: response.status });
};
