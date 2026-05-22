import { ERROR_CODES } from "../../../../constants/errorCodes";
import { getJsonHeaders, requestJson } from "../../../../lib/api";
import { ApiError } from "../../../../lib/errors";
import type { AuthUser, LogoutData } from "../types";

export type LoginInput = {
  email: string;
  password: string;
};

export type RegisterInput = LoginInput & {
  name: string;
};

export type RefreshSession = {
  tokenType: "Bearer";
  expiresIn: number;
};

const AUTH_API_BASE_PATH = "/api/auth";

const requireData = <T>(data: T | null, message: string) => {
  if (!data) {
    throw new ApiError(ERROR_CODES.INTERNAL_SERVER_ERROR, message);
  }

  return data;
};

export const login = async (input: LoginInput) => {
  const json = await requestJson<AuthUser>(`${AUTH_API_BASE_PATH}/login`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(input),
  });

  return requireData(json.data, "Login response is empty");
};

export const register = async (input: RegisterInput) => {
  const json = await requestJson<AuthUser>(`${AUTH_API_BASE_PATH}/register`, {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(input),
  });

  return requireData(json.data, "Register response is empty");
};

export const refreshSession = async () => {
  const json = await requestJson<RefreshSession>(
    `${AUTH_API_BASE_PATH}/refresh`,
    {
      method: "POST",
    },
  );

  return requireData(json.data, "Refresh response is empty");
};

export const logout = async () => {
  const json = await requestJson<LogoutData>(`${AUTH_API_BASE_PATH}/logout`, {
    method: "POST",
  });

  return requireData(json.data, "Logout response is empty");
};

export const fetchCurrentUser = async () => {
  const json = await requestJson<AuthUser>(`${AUTH_API_BASE_PATH}/me`, {
    cache: "no-store",
  });

  return requireData(json.data, "Current user response is empty");
};
