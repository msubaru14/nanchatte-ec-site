import "server-only";

import type { AccessTokenData, BackendResponse } from "../types";
import { backendFetch, getBearerHeaders, getJsonHeaders } from "./backendClient";
import {
  clearAuthCookies,
  getAuthCookies,
  setAccessTokenCookie,
} from "./cookies";

const mergeHeaders = (...headersList: HeadersInit[]) => {
  const headers = new Headers();

  for (const headersInit of headersList) {
    new Headers(headersInit).forEach((value, key) => {
      headers.set(key, value);
    });
  }

  return headers;
};

const refreshAccessToken = async (refreshToken: string) => {
  const response = await backendFetch("/api/auth/refresh", {
    method: "POST",
    headers: getJsonHeaders(),
    body: JSON.stringify({ refreshToken }),
  });

  if (!response.ok) {
    await clearAuthCookies();
    return null;
  }

  const json = (await response.json()) as BackendResponse<AccessTokenData>;

  if (!json.data?.accessToken) {
    await clearAuthCookies();
    return null;
  }

  await setAccessTokenCookie(json.data);

  return json.data.accessToken;
};

export const backendFetchWithAuth = async (
  path: string,
  init?: RequestInit,
) => {
  const { accessToken, refreshToken } = await getAuthCookies();

  if (accessToken) {
    const authInit: RequestInit = {
      ...init,
      headers: mergeHeaders(init?.headers ?? {}, getBearerHeaders(accessToken)),
    };
    const response = await backendFetch(path, authInit);

    if (response.status !== 401 || !refreshToken) {
      return response;
    }
  }

  if (!refreshToken) {
    return backendFetch(path, init);
  }

  const refreshedAccessToken = await refreshAccessToken(refreshToken);

  if (!refreshedAccessToken) {
    return backendFetch(path, init);
  }

  return backendFetch(path, {
    ...init,
    headers: mergeHeaders(
      init?.headers ?? {},
      getBearerHeaders(refreshedAccessToken),
    ),
  });
};
