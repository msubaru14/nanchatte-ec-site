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

export const updateCartItemQuantityWithBackend = async (
  productId: string,
  body: string,
) => {
  const response = await backendFetchWithAuth(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    {
      method: "PATCH",
      headers: getJsonHeaders(),
      body,
    },
  );
  const json = await parseBackendResponse<CartMessage>(response);

  return { response, json };
};

export const deleteCartItemWithBackend = async (productId: string) => {
  const response = await backendFetchWithAuth(
    `/api/cart/items/${encodeURIComponent(productId)}`,
    {
      method: "DELETE",
    },
  );
  const json = await parseBackendResponse<CartMessage>(response);

  return { response, json };
};

export const deleteAllCartItemsWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/cart/items", {
    method: "DELETE",
  });
  const json = await parseBackendResponse<CartMessage>(response);

  return { response, json };
};
