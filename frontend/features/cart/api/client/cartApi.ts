import { ERROR_CODES } from "../../../../constants/errorCodes";
import { requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type { Cart } from "../types";

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
