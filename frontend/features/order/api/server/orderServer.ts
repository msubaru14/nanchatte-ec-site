import "server-only";

import {
  backendFetchWithAuth,
  getJsonHeaders,
  parseBackendResponse,
} from "../../../auth/api/server";
import type {
  AdminOrderCancelResult,
  AdminOrderDetail,
  AdminOrderList,
  OrderCreateResult,
  OrderDetail,
  OrderList,
} from "../types";

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

export const fetchAdminOrdersWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/admin/orders", {
    method: "GET",
  });
  const json = await parseBackendResponse<AdminOrderList>(response);

  return { response, json };
};

export const fetchAdminOrderDetailWithBackend = async (orderId: string) => {
  const response = await backendFetchWithAuth(
    `/api/admin/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
    },
  );
  const json = await parseBackendResponse<AdminOrderDetail>(response);

  return { response, json };
};

export const cancelAdminOrderWithBackend = async (orderId: string) => {
  const response = await backendFetchWithAuth(
    `/api/admin/orders/${encodeURIComponent(orderId)}/cancel`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );
  const json = await parseBackendResponse<AdminOrderCancelResult>(response);

  return { response, json };
};
