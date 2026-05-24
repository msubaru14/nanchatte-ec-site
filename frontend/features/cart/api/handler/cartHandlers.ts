import { NextResponse } from "next/server";

import { fetchCartWithBackend } from "../server";

export const handleGetCart = async () => {
  const { response, json } = await fetchCartWithBackend();

  return NextResponse.json(json, { status: response.status });
};
