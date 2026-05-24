import "server-only";

import { backendFetchWithAuth, parseBackendResponse } from "../../../auth/api/server";
import type { Cart } from "../types";

export const fetchCartWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/cart", {
    method: "GET",
  });
  const json = await parseBackendResponse<Cart>(response);

  return { response, json };
};
