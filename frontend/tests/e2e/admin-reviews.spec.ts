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

async function mockAdminUser(page: Page) {
  await page.route("**/api/auth/me", (route) =>
    fulfillJson(route, 200, adminUserResponse),
  );
}

async function mockHeaderCart(page: Page) {
  await page.route("**/api/cart", (route) =>
    fulfillJson(route, 200, emptyCartResponse),
  );
}

type AdminReviewFixture = {
  reviewId: number;
  userId: number;
  reviewerName: string;
  productId: number;
  productName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "draft" | "published" | "hidden";
  createdAt: string;
  updatedAt: string;
};

function createAdminReview(
  overrides: Partial<AdminReviewFixture> = {},
): AdminReviewFixture {
  return {
    reviewId: 11,
    userId: 42,
    reviewerName: "Review User",
    productId: 1,
    productName: "Draft Product",
    rating: 5,
    title: "確認対象レビュー",
    comment: null,
    status: "draft",
    createdAt: "2026-06-01T12:00:00Z",
    updatedAt: "2026-06-01T12:00:00Z",
    ...overrides,
  };
}

function adminReviewListResponse(reviews: AdminReviewFixture[]) {
  return {
    data: {
      reviews,
    },
    error: null,
  };
}

test.describe("管理者レビュー一覧", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminUser(page);
    await mockHeaderCart(page);
  });

  test("管理者レビュー一覧にstatus表示名と未入力項目を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(
        route,
        200,
        adminReviewListResponse([
          createAdminReview(),
          createAdminReview({
            reviewId: 12,
            userId: 43,
            reviewerName: "Published User",
            productId: 2,
            productName: "Published Product",
            rating: 4,
            title: null,
            comment: null,
            status: "published",
            createdAt: "2026-06-02T12:00:00Z",
            updatedAt: "2026-06-02T12:00:00Z",
          }),
          createAdminReview({
            reviewId: 13,
            userId: 44,
            reviewerName: "Hidden User",
            productId: 3,
            productName: "Hidden Product",
            rating: 3,
            title: "非表示レビュー",
            comment: "再確認します。",
            status: "hidden",
            createdAt: "2026-06-03T12:00:00Z",
            updatedAt: "2026-06-04T12:00:00Z",
          }),
        ]),
      ),
    );

    await page.goto("/admin/reviews");

    await expect(page.getByRole("heading", { name: "レビュー管理" })).toBeVisible();
    await expect(page.getByText("Review #11")).toBeVisible();
    await expect(page.getByText("Review User")).toBeVisible();
    await expect(page.getByText("Draft Product")).toBeVisible();
    await expect(page.getByText("★5")).toBeVisible();
    await expect(page.getByText("下書き")).toBeVisible();
    await expect(page.getByText("確認対象レビュー")).toBeVisible();
    await expect(page.getByText("Published Product")).toBeVisible();
    await expect(page.getByText("公開中")).toBeVisible();
    await expect(page.getByText("未入力").first()).toBeVisible();
    await expect(page.getByText("Hidden Product")).toBeVisible();
    await expect(page.getByText("非表示", { exact: true })).toBeVisible();
    await expect(page.getByText("再確認します。")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "商品詳細を見る" }).first(),
    ).toHaveAttribute("href", "/products/1");
    await expect(page.getByRole("button", { name: "非表示にする" })).toHaveCount(
      2,
    );
    await expect(page.getByRole("button", { name: "再公開する" })).toHaveCount(1);
  });

  test("レビュー0件の場合は空状態を表示する", async ({ page }) => {
    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 200, adminReviewListResponse([])),
    );

    await page.goto("/admin/reviews");

    await expect(
      page.getByText("管理対象のレビューはありません。"),
    ).toBeVisible();
  });

  test("publishedレビューを非表示にできる", async ({ page }) => {
    const review = createAdminReview({
      status: "published",
      productName: "Published Product",
      title: "公開レビュー",
    });
    let hideCalled = false;

    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 200, adminReviewListResponse([review])),
    );
    await page.route("**/api/admin/reviews/11/hide", async (route) => {
      hideCalled = true;
      await fulfillJson(route, 200, {
        data: {
          ...review,
          status: "hidden",
          updatedAt: "2026-06-05T12:00:00Z",
        },
        error: null,
      });
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("このレビューを非表示にしますか？");
      await dialog.accept();
    });

    await page.goto("/admin/reviews");
    await page.getByRole("button", { name: "非表示にする" }).click();

    await expect(page.getByText("レビューを非表示にしました。")).toBeVisible();
    await expect(page.getByText("非表示", { exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "再公開する" })).toBeVisible();
    expect(hideCalled).toBe(true);
  });

  test("draftレビューを非表示にできる", async ({ page }) => {
    const review = createAdminReview();
    let hideCalled = false;

    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 200, adminReviewListResponse([review])),
    );
    await page.route("**/api/admin/reviews/11/hide", async (route) => {
      hideCalled = true;
      await fulfillJson(route, 200, {
        data: {
          ...review,
          status: "hidden",
        },
        error: null,
      });
    });
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.goto("/admin/reviews");
    await page.getByRole("button", { name: "非表示にする" }).click();

    await expect(page.getByText("レビューを非表示にしました。")).toBeVisible();
    await expect(page.getByText("非表示", { exact: true })).toBeVisible();
    expect(hideCalled).toBe(true);
  });

  test("hiddenレビューを再公開できる", async ({ page }) => {
    const review = createAdminReview({
      status: "hidden",
      productName: "Hidden Product",
      title: "非表示レビュー",
    });
    let publishCalled = false;

    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 200, adminReviewListResponse([review])),
    );
    await page.route("**/api/admin/reviews/11/publish", async (route) => {
      publishCalled = true;
      await fulfillJson(route, 200, {
        data: {
          ...review,
          status: "published",
          updatedAt: "2026-06-05T12:00:00Z",
        },
        error: null,
      });
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("このレビューを再公開しますか？");
      await dialog.accept();
    });

    await page.goto("/admin/reviews");
    await page.getByRole("button", { name: "再公開する" }).click();

    await expect(page.getByText("レビューを再公開しました。")).toBeVisible();
    await expect(page.getByText("公開中")).toBeVisible();
    await expect(page.getByRole("button", { name: "非表示にする" })).toBeVisible();
    expect(publishCalled).toBe(true);
  });

  test("操作キャンセル時はAPIを呼ばず状態を維持する", async ({ page }) => {
    const review = createAdminReview({ status: "published" });
    let hideCalled = false;

    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 200, adminReviewListResponse([review])),
    );
    await page.route("**/api/admin/reviews/11/hide", async (route) => {
      hideCalled = true;
      await route.fallback();
    });
    page.once("dialog", async (dialog) => {
      await dialog.dismiss();
    });

    await page.goto("/admin/reviews");
    await page.getByRole("button", { name: "非表示にする" }).click();

    await expect(page.getByText("公開中")).toBeVisible();
    expect(hideCalled).toBe(false);
  });

  test("操作失敗時は対象レビューにエラーを表示する", async ({ page }) => {
    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 200, adminReviewListResponse([createAdminReview()])),
    );
    await page.route("**/api/admin/reviews/11/hide", (route) =>
      fulfillJson(route, 400, {
        data: null,
        error: {
          code: "VALIDATION_ERROR",
          message: "validation error",
        },
      }),
    );
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.goto("/admin/reviews");
    await page.getByRole("button", { name: "非表示にする" }).click();

    await expect(
      page.getByText("このレビューは現在の状態では操作できません。"),
    ).toBeVisible();
    await expect(page.getByText("Draft Product")).toBeVisible();
  });

  test("一覧取得失敗時はエラーと再読み込み導線を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "admin review list failed",
        },
      }),
    );

    await page.goto("/admin/reviews");

    await expect(
      page.getByText("管理者レビュー一覧を取得できませんでした。"),
    ).toBeVisible();
    await expect(page.getByText("admin review list failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
  });

  test("未ログイン時はreturnTo付きでログインへ遷移する", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );
    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(/\/admin\/login\?returnTo=%2Fadmin%2Freviews$/),
      page.goto("/admin/reviews"),
    ]);
  });

  test("customerユーザーは権限エラーとして扱う", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 200, customerUserResponse),
    );
    await page.route("**/api/admin/reviews", (route) =>
      fulfillJson(route, 403, {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "forbidden",
        },
      }),
    );

    await page.goto("/admin/reviews");

    await expect(
      page.getByText("管理者権限がないため、レビュー管理画面を表示できません。"),
    ).toBeVisible();
  });
});
