import { expect, test } from "@playwright/test";

test.describe("認証BFF API", () => {
  test("ユーザー登録後にhttpOnly cookieが保存されログアウトでセッションが削除される", async ({
    request,
  }) => {
    const email = `auth-bff-${Date.now()}@example.com`;
    const password = "secret123";
    const registerResponse = await request.post("/api/auth/register", {
      data: {
        name: "Auth BFF User",
        email,
        password,
      },
    });
    const registerJson = await registerResponse.json();
    const setCookie = registerResponse.headers()["set-cookie"];

    expect(registerResponse.status()).toBe(201);
    expect(registerJson).toMatchObject({
      data: {
        name: "Auth BFF User",
        email,
        roles: expect.arrayContaining(["customer"]),
      },
      error: null,
    });
    expect(setCookie).toContain("access_token=");
    expect(setCookie).toContain("refresh_token=");
    expect(setCookie).toContain("HttpOnly");

    const meResponse = await request.get("/api/auth/me");
    const meJson = await meResponse.json();

    expect(meResponse.status()).toBe(200);
    expect(meJson).toMatchObject({
      data: {
        email,
        roles: expect.arrayContaining(["customer"]),
      },
      error: null,
    });

    const refreshResponse = await request.post("/api/auth/refresh");
    const refreshJson = await refreshResponse.json();

    expect(refreshResponse.status()).toBe(200);
    expect(refreshJson).toEqual({
      data: {
        tokenType: "Bearer",
        expiresIn: expect.any(Number),
      },
      error: null,
    });
    expect(refreshResponse.headers()["set-cookie"]).toContain("access_token=");

    const logoutResponse = await request.post("/api/auth/logout");
    const logoutJson = await logoutResponse.json();

    expect(logoutResponse.status()).toBe(200);
    expect(logoutJson).toEqual({
      data: {
        message: "logged out",
      },
      error: null,
    });

    const loggedOutMeResponse = await request.get("/api/auth/me");

    expect(loggedOutMeResponse.status()).toBe(401);
  });

  test("ログインのバリデーションエラーがAPIレスポンス形式で返る", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/login", {
      data: {
        email: "",
        password: "",
      },
    });
    const json = await response.json();

    expect(response.status()).toBe(400);
    expect(json.data).toBeNull();
    expect(json.error).toMatchObject({
      code: "VALIDATION_ERROR",
      message: "validation error",
    });
    expect(json.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "email",
          message: "email is required",
        }),
        expect.objectContaining({
          field: "password",
          message: "password is required",
        }),
      ]),
    );
  });

  test("ユーザー登録はbackend到達前にnameとpasswordを検証する", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/register", {
      data: {
        name: "",
        email: "alice@example.com",
        password: "12345",
      },
    });
    const json = await response.json();

    expect(response.status()).toBe(400);
    expect(json.data).toBeNull();
    expect(json.error.details).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          field: "name",
          message: "name is required",
        }),
        expect.objectContaining({
          field: "password",
          message: "password is too short",
        }),
      ]),
    );
  });

  test("refresh token cookieがない状態のrefreshはunauthorizedを返す", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/refresh");
    const json = await response.json();

    expect(response.status()).toBe(401);
    expect(json).toEqual({
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "unauthorized",
      },
    });
  });

  test("セッションがない状態のlogoutも成功レスポンスを返す", async ({ request }) => {
    const response = await request.post("/api/auth/logout");
    const json = await response.json();

    expect(response.status()).toBe(200);
    expect(json).toEqual({
      data: {
        message: "logged out",
      },
      error: null,
    });
  });

  test("revokeに失敗したlogoutはcookieを削除しつつbackendのエラーを返す", async ({
    request,
  }) => {
    const response = await request.post("/api/auth/logout", {
      headers: {
        cookie: "access_token=invalid-access-token; refresh_token=invalid-refresh-token",
      },
    });
    const json = await response.json();
    const setCookie = response.headers()["set-cookie"];

    expect(response.status()).toBe(401);
    expect(json).toMatchObject({
      data: null,
      error: {
        code: "UNAUTHORIZED",
        message: "unauthorized",
      },
    });
    expect(setCookie).toContain("access_token=");
    expect(setCookie).toContain("refresh_token=");
    expect(setCookie).toContain("Max-Age=0");
  });
});
