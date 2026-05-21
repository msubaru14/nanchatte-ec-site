import { ERROR_CODES } from "../constants/errorCodes";
import type { ErrorCode } from "../constants/errorCodes";
import { ApiError, CLIENT_ERROR_CODES } from "./errors";

export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ??
  process.env.API_BASE_URL ??
  "http://localhost:8080";

export type APIResponse<T> = {
  data: T | null;
  error: unknown;
};

export const getToken = () => {
  if (typeof window === "undefined") {
    return null;
  }

  return localStorage.getItem("token");
};

export const getAuthHeaders = () => {
  const token = getToken();

  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const getJsonHeaders = () => ({
  "Content-Type": "application/json",
});

const isErrorCode = (value: unknown): value is ErrorCode => {
  return (
    typeof value === "string" &&
    Object.values(ERROR_CODES).includes(value as ErrorCode)
  );
};

const parseJsonOrThrow = async (response: Response) => {
  try {
    return await response.json();
  } catch {
    throw new ApiError(
      ERROR_CODES.INTERNAL_SERVER_ERROR,
      "Invalid response format",
    );
  }
};

const isAPIError = (
  error: unknown,
): error is { code?: unknown; message?: unknown; details?: unknown } => {
  return typeof error === "object" && error !== null;
};

export const requestJson = async <T>(
  url: string,
  init?: RequestInit,
): Promise<APIResponse<T>> => {
  let response: Response;

  try {
    response = await fetch(url, init);
  } catch {
    throw new ApiError(CLIENT_ERROR_CODES.NETWORK_ERROR, "Network error");
  }

  const json = (await parseJsonOrThrow(response)) as APIResponse<T>;

  if (isAPIError(json.error)) {
    const code = isErrorCode(json.error.code)
      ? json.error.code
      : ERROR_CODES.INTERNAL_SERVER_ERROR;
    const message =
      typeof json.error.message === "string" ? json.error.message : code;

    throw new ApiError(code, message, json.error.details);
  }

  if (!response.ok) {
    throw new ApiError(ERROR_CODES.INTERNAL_SERVER_ERROR, "Request failed");
  }

  return json;
};
