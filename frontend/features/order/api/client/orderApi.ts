import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import { notifyCartUpdated } from "../../../cart/utils/cartEvents";
import type {
  AdminOrderCancelResult,
  AdminOrderDetail,
  AdminOrderList,
  OrderCreateResult,
  OrderDetail,
  OrderList,
} from "../types";

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

export const fetchAdminOrders = async () => {
  const json = await requestJson<AdminOrderList>("/api/admin/orders", {
    cache: "no-store",
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Admin order list response is empty",
    );
  }

  return json.data;
};

export const fetchAdminOrderDetail = async (orderId: number | string) => {
  const json = await requestJson<AdminOrderDetail>(
    `/api/admin/orders/${encodeURIComponent(String(orderId))}`,
    {
      cache: "no-store",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Admin order detail response is empty",
    );
  }

  return json.data;
};

export const cancelAdminOrder = async (orderId: number | string) => {
  const json = await requestJson<AdminOrderCancelResult>(
    `/api/admin/orders/${encodeURIComponent(String(orderId))}/cancel`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Canceled admin order response is empty",
    );
  }

  return json.data;
};
