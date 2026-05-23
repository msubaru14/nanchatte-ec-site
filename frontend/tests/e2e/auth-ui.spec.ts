import { expect, type Page, test } from "@playwright/test";

const unauthorizedResponse = {
  data: null,
  error: {
    code: "UNAUTHORIZED",
    message: "unauthorized",
  },
};

function watchUnexpectedBrowserErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.push(`console.error: ${message.text()}`);
    }
  });

  page.on("pageerror", (error) => {
    errors.push(`pageerror: ${error.message}`);
  });

  return () => {
    expect(errors).toEqual([]);
  };
}

test.describe("認証画面", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify(unauthorizedResponse),
      });
    });
  });

  test("ログイン成功時は指定された内部パスへ遷移する", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 1,
            name: "Login User",
            email: "login@example.com",
            roles: ["customer"],
          },
          error: null,
        }),
      });
    });

    await page.goto("/login?returnTo=%2Fregister%3Ffrom%3Dlogin");
    await page.getByLabel("メールアドレス").fill("login@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/register\?from=login$/);
  });

  test("外部returnToは破棄して商品一覧へ遷移する", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 1,
            name: "Login User",
            email: "login@example.com",
            roles: ["customer"],
          },
          error: null,
        }),
      });
    });

    await page.goto("/login?returnTo=https%3A%2F%2Fexample.com");
    await page.getByLabel("メールアドレス").fill("login@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/products$/);
  });

  test("protocol-relativeなreturnToも商品一覧へ遷移する", async ({ page }) => {
    await page.route("**/api/auth/login", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 1,
            name: "Login User",
            email: "login@example.com",
            roles: ["customer"],
          },
          error: null,
        }),
      });
    });

    await page.goto("/login?returnTo=%2F%2Fexample.com");
    await page.getByLabel("メールアドレス").fill("login@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "ログイン" }).click();

    await expect(page).toHaveURL(/\/products$/);
  });

  test("ユーザー登録成功時も指定された内部パスへ遷移する", async ({
    page,
  }) => {
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 201,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 2,
            name: "Register User",
            email: "register@example.com",
            roles: ["customer"],
          },
          error: null,
        }),
      });
    });

    await page.goto("/register?returnTo=%2Flogin%3Fregistered%3D1");
    await page.getByLabel("表示名").fill("Register User");
    await page.getByLabel("メールアドレス").fill("register@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(page).toHaveURL(/\/login\?registered=1$/);
  });

  test("登録画面でvalidation detailsを入力項目付近に表示する", async ({
    page,
  }) => {
    await page.route("**/api/auth/register", async (route) => {
      await route.fulfill({
        status: 400,
        contentType: "application/json",
        body: JSON.stringify({
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "validation error",
            details: [
              { field: "name", message: "name is required" },
              { field: "password", message: "password is too short" },
            ],
          },
        }),
      });
    });

    await page.goto("/register");
    await page.getByLabel("メールアドレス").fill("register@example.com");
    await page.getByLabel("パスワード").fill("12345");
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(page.getByText("validation error", { exact: true })).toBeVisible();
    await expect(page.getByText("name is required")).toBeVisible();
    await expect(page.getByText("password is too short")).toBeVisible();
  });

  test("未ログイン時はHeaderに認証導線を表示する", async ({ page }) => {
    await page.goto("/login");

    await expect(page.getByRole("link", { name: "ログイン" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "ユーザー登録" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ログアウト" })).toHaveCount(0);
  });

  test("ログイン済み時はHeaderにユーザー名とlogout導線を表示する", async ({
    page,
  }) => {
    const expectNoBrowserErrors = watchUnexpectedBrowserErrors(page);

    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 3,
            name: "Header User",
            email: "header@example.com",
            roles: ["customer"],
          },
          error: null,
        }),
      });
    });

    await page.goto("/login");

    await expect(page.getByText("Header User")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ユーザー登録" })).toHaveCount(0);
    expectNoBrowserErrors();
  });

  test("logout成功時は未ログイン状態に更新して商品一覧へ遷移する", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 4,
            name: "Logout User",
            email: "logout@example.com",
            roles: ["customer"],
          },
          error: null,
        }),
      });
    });
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: { message: "logged out" },
          error: null,
        }),
      });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "ログアウト" }).click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ユーザー登録" })).toBeVisible();
  });

  test("logout失敗時も未ログイン状態に更新して商品一覧へ遷移する", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          data: {
            id: 5,
            name: "Revoke Error User",
            email: "revoke-error@example.com",
            roles: ["customer"],
          },
          error: null,
        }),
      });
    });
    await page.route("**/api/auth/logout", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          data: null,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "revoke failed",
          },
        }),
      });
    });

    await page.goto("/login");
    await page.getByRole("button", { name: "ログアウト" }).click();

    await expect(page).toHaveURL(/\/products$/);
    await expect(page.getByRole("link", { name: "ログイン" })).toBeVisible();
    await expect(page.getByText("revoke failed", { exact: true })).toBeVisible();
  });
});
