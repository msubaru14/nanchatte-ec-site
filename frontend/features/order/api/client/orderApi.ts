import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import { notifyCartUpdated } from "../../../cart/utils/cartEvents";
import type { OrderCreateResult } from "../types";

export const createOrder = async () => {
  const json = await requestJson<OrderCreateResult>("/api/orders", {
    method: "POST",
    headers: getJsonHeaders(),
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Order response is empty",
    );
  }

  notifyCartUpdated();
  return json.data;
};
