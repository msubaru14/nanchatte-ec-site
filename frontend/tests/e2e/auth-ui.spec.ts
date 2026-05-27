import { expect, type Page, test } from "@playwright/test";

const unauthorizedResponse = {
  data: null,
  error: {
    code: "UNAUTHORIZED",
    message: "unauthorized",
  },
};

const emptyCartResponse = {
  data: {
    items: [],
    totalAmount: 0,
  },
  error: null,
};

const cartWithItemsResponse = {
  data: {
    items: [
      { quantity: 2 },
      { quantity: 1 },
    ],
    totalAmount: 0,
  },
  error: null,
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
    await page.route("**/api/cart", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyCartResponse),
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
    let cartRequestCount = 0;
    await page.unroute("**/api/cart");
    await page.route("**/api/cart", async (route) => {
      cartRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyCartResponse),
      });
    });

    await page.goto("/login");

    await expect(page.getByRole("link", { name: "カート" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "ログイン" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "ユーザー登録" })).toBeVisible();
    await expect(page.getByRole("button", { name: "ログアウト" })).toHaveCount(0);
    expect(cartRequestCount).toBe(0);
  });

  test("ログイン済み時はHeaderにユーザー名とlogout導線を表示する", async ({
    page,
  }) => {
    const expectNoBrowserErrors = watchUnexpectedBrowserErrors(page);
    let cartRequestCount = 0;

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
    await page.unroute("**/api/cart");
    await page.route("**/api/cart", async (route) => {
      cartRequestCount += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(cartWithItemsResponse),
      });
    });

    await page.goto("/login");

    await expect(page.getByRole("link", { name: /カート/ })).toHaveAttribute(
      "href",
      "/cart",
    );
    await expect(page.getByLabel("カート内の商品数 3件")).toBeVisible();
    await expect(page.getByText("Header User")).toBeVisible();
    await expect(page.getByRole("button", { name: "ログアウト" })).toBeVisible();
    await expect(page.getByRole("link", { name: "ユーザー登録" })).toHaveCount(0);
    await expect.poll(() => cartRequestCount).toBe(1);
    expectNoBrowserErrors();
  });

  test("空Cartの場合はHeaderのCartリンクだけを表示する", async ({
    page,
  }) => {
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

    await expect(page.getByRole("link", { name: "カート", exact: true })).toHaveAttribute(
      "href",
      "/cart",
    );
    await expect(page.getByLabel(/カート内の商品数/)).toHaveCount(0);
  });

  test("Cart取得中はHeaderのCartリンクに読み込み表示を出す", async ({
    page,
  }) => {
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
    await page.unroute("**/api/cart");
    await page.route("**/api/cart", async (route) => {
      await new Promise((resolve) => setTimeout(resolve, 1000));
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(emptyCartResponse),
      });
    });

    await page.goto("/login");

    await expect(page.getByLabel("カート件数を取得中")).toBeVisible();
  });

  test("Cart取得に失敗してもHeaderのCartリンクを表示する", async ({
    page,
  }) => {
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
    await page.unroute("**/api/cart");
    await page.route("**/api/cart", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({
          data: null,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "cart load failed",
          },
        }),
      });
    });

    await page.goto("/login");

    await expect(page.getByRole("link", { name: "カート", exact: true })).toHaveAttribute(
      "href",
      "/cart",
    );
    await expect(page.getByText("Header User")).toBeVisible();
    await expect(page.getByLabel(/カート内の商品数/)).toHaveCount(0);
  });

  test("Cart取得が未認証の場合はHeaderを未ログイン表示に戻す", async ({
    page,
  }) => {
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
    await page.unroute("**/api/cart");
    await page.route("**/api/cart", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify(unauthorizedResponse),
      });
    });

    await page.goto("/login");

    await expect(page.getByRole("link", { name: "カート" })).toHaveCount(0);
    await expect(page.getByRole("link", { name: "ログイン" }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: "ユーザー登録" })).toBeVisible();
  });

  test("ログイン済み時はHeaderのカート導線からCart画面へ遷移する", async ({
    page,
  }) => {
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
    await page.getByRole("link", { name: /カート/ }).click();

    await expect(page).toHaveURL(/\/cart$/);
    await expect(page.getByRole("heading", { name: "カート" })).toBeVisible();
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
