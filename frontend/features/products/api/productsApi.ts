import { ERROR_CODES } from "../../../constants/errorCodes";
import { API_BASE_URL, requestJson } from "../../../lib/api";
import { ApiError } from "../../../lib/errors";
import type { Product } from "../types/product";

export async function fetchProducts(): Promise<Product[]> {
  const json = await requestJson<Product[]>(`${API_BASE_URL}/api/products`, {
    cache: "no-store",
  });

  return json.data ?? [];
}

export async function fetchProductDetail(productId: string): Promise<Product> {
  const json = await requestJson<Product>(
    `${API_BASE_URL}/api/products/${productId}`,
    {
      cache: "no-store",
    },
  );

  if (!json.data) {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Product response is empty",
    );
  }

  return json.data;
}
