import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type { AddCartItemInput, Cart, CartMessage } from "../types";

export const fetchCart = async () => {
  const json = await requestJson<Cart>("/api/cart", {
    cache: "no-store",
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Cart response is empty",
    );
  }

  return json.data;
};

export const addCartItem = async (input: AddCartItemInput) => {
  const json = await requestJson<CartMessage>("/api/cart/items", {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(input),
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Cart item response is empty",
    );
  }

  return json.data;
};
