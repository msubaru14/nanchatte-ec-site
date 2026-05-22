import "server-only";

import type {
  AccessTokenData,
  AuthData,
  AuthUser,
  BackendResponse,
  LogoutData,
} from "../types";
import type { LoginRequestBody, RegisterRequestBody } from "../schemas";
import {
  backendFetch,
  getJsonHeaders,
  parseBackendResponse,
} from "./backendClient";
import { backendFetchWithAuth } from "./authFetch";
import {
  clearAuthCookies,
  getAuthCookies,
  setAccessTokenCookie,
  setAuthCookies,
} from "./cookies";

const userResponse = (user: AuthUser): BackendResponse<AuthUser> => ({
  data: user,
  error: null,
});

const errorResponse = <T>(json: BackendResponse<unknown>): BackendResponse<T> => ({
  data: null,
  error: json.error,
});

export const loginWithBackend = async (body: LoginRequestBody) => {
  const response = await backendFetch("/api/auth/login", {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(body),
  });
  const json = await parseBackendResponse<AuthData>(response);

  if (!response.ok || !json.data) {
    return { response, json: errorResponse<AuthUser>(json) };
  }

  await setAuthCookies(json.data.tokens);

  return { response, json: userResponse(json.data.user) };
};

export const registerWithBackend = async (body: RegisterRequestBody) => {
  const registerResponse = await backendFetch("/api/auth/register", {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify(body),
  });
  const registerJson = await parseBackendResponse<AuthData>(registerResponse);

  if (!registerResponse.ok || !registerJson.data) {
    return {
      response: registerResponse,
      json: errorResponse<AuthUser>(registerJson),
    };
  }

  const loginResult = await loginWithBackend({
    email: body.email,
    password: body.password,
  });

  return {
    response: loginResult.response.ok ? registerResponse : loginResult.response,
    json: loginResult.json,
  };
};

export const refreshWithBackend = async () => {
  const { refreshToken } = await getAuthCookies();

  if (!refreshToken) {
    await clearAuthCookies();

    return {
      status: 401,
      json: {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "unauthorized",
        },
      } satisfies BackendResponse<AccessTokenData>,
    };
  }

  const response = await backendFetch("/api/auth/refresh", {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ refreshToken }),
  });
  const json = await parseBackendResponse<AccessTokenData>(response);

  if (!response.ok || !json.data) {
    await clearAuthCookies();

    return { status: response.status, json };
  }

  await setAccessTokenCookie(json.data);

  return {
    status: response.status,
    json: {
      data: {
        tokenType: json.data.tokenType,
        expiresIn: json.data.expiresIn,
      },
      error: null,
    },
  };
};

export const logoutWithBackend = async () => {
  const { refreshToken } = await getAuthCookies();

  try {
    if (refreshToken) {
      await backendFetchWithAuth("/api/auth/logout", {
        method: "POST",
        headers: getJsonHeaders(),
        body: JSON.stringify({ refreshToken }),
      });
    }
  } finally {
    await clearAuthCookies();
  }

  return {
    data: { message: "logged out" },
    error: null,
  } satisfies BackendResponse<LogoutData>;
};

export const fetchCurrentUserWithBackend = async () => {
  const response = await backendFetchWithAuth("/api/me", {
    method: "GET",
  });
  const json = await parseBackendResponse<AuthUser>(response);

  return { response, json };
};
