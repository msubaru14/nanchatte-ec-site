import "server-only";

import { ERROR_CODES } from "../../../../constants/errorCodes";
import { ApiError, CLIENT_ERROR_CODES } from "../../../../lib/errors";
import type { BackendError, BackendResponse } from "../types";

const BACKEND_API_BASE_URL =
  process.env.API_BASE_URL ??
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  "http://localhost:8080";

const getBackendUrl = (path: string) => {
  if (/^https?:\/\//.test(path)) {
    return path;
  }

  return `${BACKEND_API_BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
};

export const backendFetch = async (path: string, init?: RequestInit) => {
  try {
    return await fetch(getBackendUrl(path), {
      ...init,
      cache: init?.cache ?? "no-store",
    });
  } catch {
    throw new ApiError(CLIENT_ERROR_CODES.NETWORK_ERROR, "Network error");
  }
};

export const getJsonHeaders = () => ({
  "Content-Type": "application/json",
});

export const getBearerHeaders = (accessToken: string) => ({
  Authorization: `Bearer ${accessToken}`,
});

export const parseBackendResponse = async <T>(
  response: Response,
): Promise<BackendResponse<T>> => {
  try {
    return (await response.json()) as BackendResponse<T>;
  } catch {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Invalid response format",
    );
  }
};

export const getBackendErrorMessage = (error: BackendError | null) => {
  return typeof error?.message === "string" ? error.message : "Request failed";
};
