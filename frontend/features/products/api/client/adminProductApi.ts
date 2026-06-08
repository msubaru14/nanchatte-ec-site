import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type { AdminProduct, AdminProductList } from "../types";

export const fetchAdminProducts = async () => {
  const json = await requestJson<AdminProductList>("/api/admin/products", {
    cache: "no-store",
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Admin product list response is empty",
    );
  }

  return json.data;
};

export const stopSellingAdminProduct = async (
  productId: number | string,
) => {
  const json = await requestJson<AdminProduct>(
    `/api/admin/products/${encodeURIComponent(String(productId))}/stop-selling`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Stopped admin product response is empty",
    );
  }

  return json.data;
};

export const resumeSellingAdminProduct = async (
  productId: number | string,
) => {
  const json = await requestJson<AdminProduct>(
    `/api/admin/products/${encodeURIComponent(String(productId))}/resume-selling`,
    {
      method: "POST",
      headers: getJsonHeaders(),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Resumed admin product response is empty",
    );
  }

  return json.data;
};
