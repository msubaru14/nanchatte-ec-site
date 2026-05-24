import { NextResponse } from "next/server";

import { addCartItemWithBackend, fetchCartWithBackend } from "../server";

export const handleGetCart = async () => {
  const { response, json } = await fetchCartWithBackend();

  return NextResponse.json(json, { status: response.status });
};

export const handleAddCartItem = async (request: Request) => {
  const { response, json } = await addCartItemWithBackend(await request.text());

  return NextResponse.json(json, { status: response.status });
};
