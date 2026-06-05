import { expect, type Page, type Route, test } from "@playwright/test";

const authenticatedUserResponse = {
  data: {
    id: 42,
    name: "Review User",
    email: "review-user@example.com",
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

async function mockAuthenticatedUser(page: Page) {
  await page.route("**/api/auth/me", (route) =>
    fulfillJson(route, 200, authenticatedUserResponse),
  );
}

async function mockHeaderCart(page: Page) {
  await page.route("**/api/cart", (route) =>
    fulfillJson(route, 200, emptyCartResponse),
  );
}

test.describe("マイページと自分のレビュー", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockHeaderCart(page);
  });

  test("Headerのユーザー名からマイページへ進み、自分のレビューへ遷移できる", async ({
    page,
  }) => {
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 200, {
        data: {
          reviews: [],
        },
        error: null,
      }),
    );

    await page.goto("/products");
    await page.getByRole("link", { name: "Review User" }).click();

    await expect(page).toHaveURL(/\/me$/);
    await expect(page.getByRole("heading", { name: "マイページ" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /自分のレビュー/ }),
    ).toHaveAttribute("href", "/me/reviews");

    await page.getByRole("link", { name: /自分のレビュー/ }).click();

    await expect(page).toHaveURL(/\/me\/reviews$/);
    await expect(
      page.getByRole("heading", { name: "自分のレビュー" }),
    ).toBeVisible();
  });

  test("自分のレビュー一覧にstatus表示名と未入力項目を表示する", async ({
    page,
  }) => {
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 200, {
        data: {
          reviews: [
            {
              reviewId: 1,
              productId: 1,
              productName: "HHKB Professional HYBRID Type-S",
              rating: 5,
              title: "良い商品",
              comment: "使いやすいです。",
              status: "draft",
              createdAt: "2026-06-01T12:00:00Z",
              updatedAt: "2026-06-02T12:00:00Z",
            },
            {
              reviewId: 2,
              productId: 2,
              productName: "4K Monitor",
              rating: 4,
              title: null,
              comment: null,
              status: "published",
              createdAt: "2026-06-03T12:00:00Z",
              updatedAt: "2026-06-03T12:00:00Z",
            },
            {
              reviewId: 3,
              productId: 3,
              productName: "Sony INZONE H5",
              rating: 3,
              title: "確認中",
              comment: null,
              status: "hidden",
              createdAt: "2026-06-04T12:00:00Z",
              updatedAt: "2026-06-05T12:00:00Z",
            },
          ],
        },
        error: null,
      }),
    );

    await page.goto("/me/reviews");

    await expect(
      page.getByRole("heading", { name: "自分のレビュー" }),
    ).toBeVisible();
    await expect(page.getByText("HHKB Professional HYBRID Type-S")).toBeVisible();
    await expect(page.getByText("★5")).toBeVisible();
    await expect(page.getByText("下書き")).toBeVisible();
    await expect(page.getByText("良い商品")).toBeVisible();
    await expect(page.getByText("使いやすいです。")).toBeVisible();
    await expect(page.getByText("4K Monitor")).toBeVisible();
    await expect(page.getByText("公開中")).toBeVisible();
    await expect(page.getByText("未入力").first()).toBeVisible();
    await expect(page.getByText("Sony INZONE H5")).toBeVisible();
    await expect(page.getByText("非表示")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "商品詳細を見る" }).first(),
    ).toHaveAttribute("href", "/products/1");
  });

  test("下書き・公開中・非表示のレビューをすべて一覧に表示する", async ({
    page,
  }) => {
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 200, {
        data: {
          reviews: [
            {
              reviewId: 11,
              productId: 1,
              productName: "Draft Product",
              rating: 5,
              title: "保存中レビュー",
              comment: null,
              status: "draft",
              createdAt: "2026-06-01T12:00:00Z",
              updatedAt: "2026-06-01T12:00:00Z",
            },
            {
              reviewId: 12,
              productId: 2,
              productName: "Published Product",
              rating: 4,
              title: "掲載済みレビュー",
              comment: null,
              status: "published",
              createdAt: "2026-06-02T12:00:00Z",
              updatedAt: "2026-06-02T12:00:00Z",
            },
            {
              reviewId: 13,
              productId: 3,
              productName: "Hidden Product",
              rating: 3,
              title: "確認待ちレビュー",
              comment: null,
              status: "hidden",
              createdAt: "2026-06-03T12:00:00Z",
              updatedAt: "2026-06-03T12:00:00Z",
            },
          ],
        },
        error: null,
      }),
    );

    await page.goto("/me/reviews");

    await expect(page.getByText("Draft Product")).toBeVisible();
    await expect(page.getByText("下書き")).toBeVisible();
    await expect(page.getByText("Published Product")).toBeVisible();
    await expect(page.getByText("公開中")).toBeVisible();
    await expect(page.getByText("Hidden Product")).toBeVisible();
    await expect(page.getByText("非表示")).toBeVisible();
  });

  test("レビュー0件の場合は空状態を表示する", async ({ page }) => {
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 200, {
        data: {
          reviews: [],
        },
        error: null,
      }),
    );

    await page.goto("/me/reviews");

    await expect(
      page.getByText("投稿したレビューはまだありません。"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "商品を探す" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  test("レビュー取得失敗時はエラーと再読み込み導線を表示する", async ({
    page,
  }) => {
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "review list failed",
        },
      }),
    );

    await page.goto("/me/reviews");

    await expect(
      page.getByText("レビュー一覧を取得できませんでした。"),
    ).toBeVisible();
    await expect(page.getByText("review list failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
  });

  test("未ログイン時はreturnTo付きでログインへ遷移する", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(/\/login\?returnTo=%2Fme%2Freviews$/),
      page.goto("/me/reviews"),
    ]);
  });
});
