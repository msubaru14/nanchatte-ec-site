import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import { notifyCartUpdated } from "../../../cart/utils/cartEvents";
import type { OrderCreateResult, OrderDetail, OrderList } from "../types";

export const fetchOrders = async () => {
  const json = await requestJson<OrderList>("/api/orders", {
    cache: "no-store",
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Order list response is empty",
    );
  }

  return json.data;
};

export const fetchOrderDetail = async (orderId: number | string) => {
  const json = await requestJson<OrderDetail>(
    `/api/orders/${encodeURIComponent(String(orderId))}`,
    {
      cache: "no-store",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Order detail response is empty",
    );
  }

  return json.data;
};

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
