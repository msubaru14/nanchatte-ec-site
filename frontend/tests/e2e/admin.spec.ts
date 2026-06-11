import { expect, type Page, type Route, test } from "@playwright/test";

const adminUserResponse = {
  data: {
    id: 1,
    name: "Admin User",
    email: "admin@example.com",
    roles: ["admin"],
  },
  error: null,
};

const customerUserResponse = {
  data: {
    id: 2,
    name: "Customer User",
    email: "customer@example.com",
    roles: ["customer"],
  },
  error: null,
};

const emptyCartResponse = {
  data: {
    items: [],
    totalAmount: 0,
  },
  error: null,
};

const unauthorizedResponse = {
  data: null,
  error: {
    code: "UNAUTHORIZED",
    message: "unauthorized",
  },
};

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function mockCurrentUser(page: Page, body: unknown, status = 200) {
  await page.route("**/api/auth/me", (route) =>
    fulfillJson(route, status, body),
  );
}

async function mockHeaderCart(page: Page) {
  await page.route("**/api/cart", (route) =>
    fulfillJson(route, 200, emptyCartResponse),
  );
}

async function mockAdminReviews(page: Page) {
  await page.route("**/api/admin/reviews", (route) =>
    fulfillJson(route, 200, {
      data: {
        reviews: [],
      },
      error: null,
    }),
  );
}

async function mockAdminProducts(page: Page) {
  await page.route("**/api/admin/products", (route) =>
    fulfillJson(route, 200, {
      data: {
        products: [],
      },
      error: null,
    }),
  );
}

test.describe("管理者入口", () => {
  test.beforeEach(async ({ page }) => {
    await mockHeaderCart(page);
  });

  test("未ログインで管理者トップへアクセスすると管理者ログインへ遷移する", async ({
    page,
  }) => {
    await mockCurrentUser(page, unauthorizedResponse, 401);

    await Promise.all([
      page.waitForURL(/\/admin\/login\?returnTo=%2Fadmin$/),
      page.goto("/admin"),
    ]);
  });

  test("adminユーザーが管理者ログインから管理者トップへ遷移できる", async ({
    page,
  }) => {
    await mockCurrentUser(page, unauthorizedResponse, 401);
    await page.route("**/api/auth/login", (route) =>
      fulfillJson(route, 200, adminUserResponse),
    );

    await page.goto("/admin/login");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "管理者としてログイン" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
    await expect(
      page.locator("section[aria-labelledby='admin-home-title']").getByText(
        "Admin User",
      ),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "レビュー管理" })).toHaveAttribute(
      "href",
      "/admin/reviews",
    );
    await expect(page.getByRole("link", { name: "商品管理" })).toHaveAttribute(
      "href",
      "/admin/products",
    );
    await expect(page.getByText("Coming soon")).toHaveCount(2);
  });

  test("customerユーザーが管理者ログインしても権限エラーを表示する", async ({
    page,
  }) => {
    await mockCurrentUser(page, unauthorizedResponse, 401);
    await page.route("**/api/auth/login", (route) =>
      fulfillJson(route, 200, customerUserResponse),
    );

    await page.goto("/admin/login");
    await page.getByLabel("メールアドレス").fill("customer@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "管理者としてログイン" }).click();

    await expect(page).toHaveURL(/\/admin\/login$/);
    await expect(page.getByText("管理者権限がありません。")).toBeVisible();
  });

  test("customerユーザーは管理者トップで権限エラーになる", async ({ page }) => {
    await mockCurrentUser(page, customerUserResponse);

    await page.goto("/admin");

    await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
    await expect(page.getByText("管理者権限がありません。")).toBeVisible();
    await expect(page.getByRole("link", { name: "商品一覧へ戻る" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  test("adminログイン後に安全な管理配下returnToへ戻る", async ({ page }) => {
    await mockCurrentUser(page, unauthorizedResponse, 401);
    await mockAdminReviews(page);
    await page.route("**/api/auth/login", (route) =>
      fulfillJson(route, 200, adminUserResponse),
    );

    await page.goto("/admin/login?returnTo=%2Fadmin%2Freviews");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "管理者としてログイン" }).click();

    await expect(page).toHaveURL(/\/admin\/reviews$/);
    await expect(page.getByRole("heading", { name: "レビュー管理" })).toBeVisible();
  });

  test("adminログイン後に商品管理returnToへ戻る", async ({ page }) => {
    await mockCurrentUser(page, unauthorizedResponse, 401);
    await mockAdminProducts(page);
    await page.route("**/api/auth/login", (route) =>
      fulfillJson(route, 200, adminUserResponse),
    );

    await page.goto("/admin/login?returnTo=%2Fadmin%2Fproducts");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "管理者としてログイン" }).click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
  });

  test("外部returnToは破棄して管理者トップへ遷移する", async ({ page }) => {
    await mockCurrentUser(page, unauthorizedResponse, 401);
    await page.route("**/api/auth/login", (route) =>
      fulfillJson(route, 200, adminUserResponse),
    );

    await page.goto("/admin/login?returnTo=https%3A%2F%2Fexample.com");
    await page.getByLabel("メールアドレス").fill("admin@example.com");
    await page.getByLabel("パスワード").fill("secret123");
    await page.getByRole("button", { name: "管理者としてログイン" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
  });

  test("Headerの管理者導線から管理者トップへ遷移できる", async ({ page }) => {
    await mockCurrentUser(page, adminUserResponse);

    await page.goto("/login");
    await page.getByRole("link", { name: "管理画面" }).click();

    await expect(page).toHaveURL(/\/admin$/);
    await expect(page.getByRole("heading", { name: "管理画面" })).toBeVisible();
  });
});
