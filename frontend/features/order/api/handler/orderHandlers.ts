import { NextResponse } from "next/server";

import { createOrderWithBackend } from "../server";

export const handleCreateOrder = async () => {
  const { response, json } = await createOrderWithBackend();

  return NextResponse.json(json, { status: response.status });
};
