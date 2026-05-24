import "server-only";

import {
  backendFetchWithAuth,
  getJsonHeaders,
  parseBackendResponse,
} from "../../../auth/api/server";
import type { Cart, CartMessage } from "../types";

export const fetchCartWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/cart", {
    method: "GET",
  });
  const json = await parseBackendResponse<Cart>(response);

  return { response, json };
};

export const addCartItemWithBackend = async (body: string) => {
  const response = await backendFetchWithAuth("/api/cart/items", {
    method: "POST",
    headers: getJsonHeaders(),
    body,
  });
  const json = await parseBackendResponse<CartMessage>(response);

  return { response, json };
};
