import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type {
  AdminProduct,
  AdminProductCreateInput,
  AdminProductList,
  AdminProductUpdateInput,
} from "../types";

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

export const fetchAdminProductDetail = async (productId: number | string) => {
  const json = await requestJson<AdminProduct>(
    `/api/admin/products/${encodeURIComponent(String(productId))}`,
    {
      cache: "no-store",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Admin product detail response is empty",
    );
  }

  return json.data;
};

export const createAdminProduct = async (input: AdminProductCreateInput) => {
  const json = await requestJson<AdminProduct>("/api/admin/products", {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(input),
  });

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Created admin product response is empty",
    );
  }

  return json.data;
};

export const updateAdminProduct = async (
  productId: number | string,
  input: AdminProductUpdateInput,
) => {
  const json = await requestJson<AdminProduct>(
    `/api/admin/products/${encodeURIComponent(String(productId))}`,
    {
      method: "PATCH",
      headers: getJsonHeaders(),
      body: JSON.stringify(input),
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Updated admin product response is empty",
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
