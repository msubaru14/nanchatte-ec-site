import { API_BASE_URL, requestJson } from "../../../lib/api";
import type { Product } from "../types/product";

export async function fetchProducts(): Promise<Product[]> {
  const json = await requestJson<Product[]>(`${API_BASE_URL}/api/products`, {
    cache: "no-store",
  });

  return json.data ?? [];
}
