import "server-only";

import {
  backendFetchWithAuth,
  parseBackendResponse,
} from "../../../auth/api/server";
import type { OrderCreateResult } from "../types";

export const createOrderWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/orders", {
    method: "POST",
  });
  const json = await parseBackendResponse<OrderCreateResult>(response);

  return { response, json };
};
