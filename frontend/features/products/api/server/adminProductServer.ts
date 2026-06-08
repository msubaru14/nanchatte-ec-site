import "server-only";

import {
  backendFetchWithAuth,
  getJsonHeaders,
  parseBackendResponse,
} from "../../../auth/api/server";
import type { AdminProduct, AdminProductList } from "../types";

export const fetchAdminProductsWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/admin/products", {
    method: "GET",
  });
  const json = await parseBackendResponse<AdminProductList>(response);

  return { response, json };
};

export const stopSellingAdminProductWithBackend = async (
  productId: string,
) => {
  const response = await backendFetchWithAuth(
    `/api/admin/products/${encodeURIComponent(productId)}/stop-selling`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );
  const json = await parseBackendResponse<AdminProduct>(response);

  return { response, json };
};

export const resumeSellingAdminProductWithBackend = async (
  productId: string,
) => {
  const response = await backendFetchWithAuth(
    `/api/admin/products/${encodeURIComponent(productId)}/resume-selling`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );
  const json = await parseBackendResponse<AdminProduct>(response);

  return { response, json };
};
