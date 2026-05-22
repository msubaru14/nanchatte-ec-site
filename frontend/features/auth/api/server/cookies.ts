import "server-only";

import { cookies } from "next/headers";

import type { AccessTokenData, TokenPair } from "../types";

export const ACCESS_TOKEN_COOKIE = "access_token";
export const REFRESH_TOKEN_COOKIE = "refresh_token";

const getAuthCookieOptions = (maxAge?: number) => ({
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  ...(typeof maxAge === "number" ? { maxAge } : {}),
});

export const getAuthCookies = async () => {
  const cookieStore = await cookies();

  return {
    accessToken: cookieStore.get(ACCESS_TOKEN_COOKIE)?.value,
    refreshToken: cookieStore.get(REFRESH_TOKEN_COOKIE)?.value,
  };
};

export const setAccessTokenCookie = async (token: AccessTokenData) => {
  const cookieStore = await cookies();

  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    token.accessToken,
    getAuthCookieOptions(token.expiresIn),
  );
};

export const setAuthCookies = async (tokens: TokenPair) => {
  const cookieStore = await cookies();

  cookieStore.set(
    ACCESS_TOKEN_COOKIE,
    tokens.accessToken,
    getAuthCookieOptions(tokens.expiresIn),
  );
  cookieStore.set(
    REFRESH_TOKEN_COOKIE,
    tokens.refreshToken,
    getAuthCookieOptions(),
  );
};

export const clearAuthCookies = async () => {
  const cookieStore = await cookies();
  const options = getAuthCookieOptions(0);

  cookieStore.set(ACCESS_TOKEN_COOKIE, "", options);
  cookieStore.set(REFRESH_TOKEN_COOKIE, "", options);
};
