import "server-only";

import {
  backendFetchWithAuth,
  parseBackendResponse,
} from "../../../auth/api/server";
import type { OrderCreateResult, OrderDetail, OrderList } from "../types";

export const fetchOrdersWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/orders", {
    method: "GET",
  });
  const json = await parseBackendResponse<OrderList>(response);

  return { response, json };
};

export const fetchOrderDetailWithBackend = async (orderId: string) => {
  const response = await backendFetchWithAuth(
    `/api/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
    },
  );
  const json = await parseBackendResponse<OrderDetail>(response);

  return { response, json };
};

export const createOrderWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/orders", {
    method: "POST",
  });
  const json = await parseBackendResponse<OrderCreateResult>(response);

  return { response, json };
};
