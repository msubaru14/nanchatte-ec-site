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

type MyReviewFixture = {
  reviewId: number;
  productId: number;
  productName: string;
  rating: number;
  title: string | null;
  comment: string | null;
  status: "draft" | "published" | "hidden";
  createdAt: string;
  updatedAt: string;
};

function createMyReview(
  overrides: Partial<MyReviewFixture> = {},
): MyReviewFixture {
  return {
    reviewId: 11,
    productId: 1,
    productName: "Draft Product",
    rating: 5,
    title: "保存中レビュー",
    comment: null,
    status: "draft",
    createdAt: "2026-06-01T12:00:00Z",
    updatedAt: "2026-06-01T12:00:00Z",
    ...overrides,
  };
}

function myReviewListResponse(reviews: MyReviewFixture[]) {
  return {
    data: {
      reviews,
    },
    error: null,
  };
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
    await expect(page.getByRole("link", { name: "Review User" })).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/me$/),
      page.getByRole("link", { name: "Review User" }).click(),
    ]);
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
    await expect(
      page.getByRole("link", { name: "注文履歴を見る" }),
    ).toHaveAttribute(
      "href",
      "/orders",
    );
  });

  test("下書きレビューは編集導線を表示し、公開中と非表示は編集不可にする", async ({
    page,
  }) => {
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(
        route,
        200,
        myReviewListResponse([
          createMyReview(),
          createMyReview({
            reviewId: 12,
            productId: 2,
            productName: "Published Product",
            rating: 4,
            title: "掲載済みレビュー",
            status: "published",
            createdAt: "2026-06-02T12:00:00Z",
            updatedAt: "2026-06-02T12:00:00Z",
          }),
          createMyReview({
            reviewId: 13,
            productId: 3,
            productName: "Hidden Product",
            rating: 3,
            title: "確認待ちレビュー",
            status: "hidden",
            createdAt: "2026-06-03T12:00:00Z",
            updatedAt: "2026-06-03T12:00:00Z",
          }),
        ]),
      ),
    );

    await page.goto("/me/reviews");

    await expect(
      page.getByRole("link", { name: "編集する" }),
    ).toHaveAttribute("href", "/me/reviews/11/edit");
    await expect(page.getByText("編集不可")).toHaveCount(2);
  });

  test("下書きレビューを編集して保存できる", async ({ page }) => {
    const draftReview = createMyReview({
      comment: "保存前コメント",
    });
    let patchRequestBody: unknown = null;

    await page.route("**/api/me/reviews/11", async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, 200, {
          data: draftReview,
          error: null,
        });
        return;
      }

      if (route.request().method() === "PATCH") {
        patchRequestBody = route.request().postDataJSON();
        await fulfillJson(route, 200, {
          data: {
            ...draftReview,
            rating: 4,
            title: "更新したタイトル",
            comment: "更新したコメント",
            updatedAt: "2026-06-04T12:00:00Z",
          },
          error: null,
        });
        return;
      }

      await route.fallback();
    });

    await page.goto("/me/reviews/11/edit");
    await expect(page.getByRole("form", { name: "レビュー編集" })).toBeVisible();
    await expect(page.getByLabel("タイトル")).toHaveValue("保存中レビュー");
    await expect(page.getByLabel("コメント")).toHaveValue("保存前コメント");
    await page.getByRole("radio", { name: "評価 4 / 5" }).click();
    await page.getByLabel("タイトル").fill("  更新したタイトル  ");
    await page.getByLabel("コメント").fill("  更新したコメント  ");
    await expect(page.getByRole("radio", { name: "評価 4 / 5" })).toBeChecked();
    await expect(page.getByLabel("タイトル")).toHaveValue("  更新したタイトル  ");
    await expect(page.getByLabel("コメント")).toHaveValue("  更新したコメント  ");
    await page.getByRole("button", { name: "保存する" }).click();

    await expect(page.getByText("レビューを保存しました。")).toBeVisible();
    expect(patchRequestBody).toEqual({
      rating: 4,
      title: "更新したタイトル",
      comment: "更新したコメント",
    });
  });

  test("コメントのみ入力したレビュー編集は保存前にvalidation errorを表示する", async ({
    page,
  }) => {
    let patchCalled = false;

    await page.route("**/api/me/reviews/11", async (route) => {
      if (route.request().method() === "GET") {
        await fulfillJson(route, 200, {
          data: createMyReview({
            title: null,
            comment: null,
          }),
          error: null,
        });
        return;
      }

      if (route.request().method() === "PATCH") {
        patchCalled = true;
      }

      await route.fallback();
    });

    await page.goto("/me/reviews/11/edit");
    await page.getByLabel("タイトル").fill("");
    await page.getByLabel("コメント").fill("コメントだけ入力");
    await page.getByRole("button", { name: "保存する" }).click();

    await expect(
      page.getByText("コメントを入力する場合はタイトルも入力してください。"),
    ).toBeVisible();
    expect(patchCalled).toBe(false);
  });

  test("公開中レビューの編集URLへ直接遷移すると編集不可を表示する", async ({
    page,
  }) => {
    await page.route("**/api/me/reviews/12", (route) =>
      fulfillJson(route, 200, {
        data: createMyReview({
          reviewId: 12,
          productId: 2,
          productName: "Published Product",
          rating: 4,
          title: "掲載済みレビュー",
          status: "published",
        }),
        error: null,
      }),
    );

    await page.goto("/me/reviews/12/edit");

    await expect(page.getByText("このレビューは編集できません。")).toBeVisible();
    await expect(page.getByText(/現在の状態は「公開中」/)).toBeVisible();
    await expect(
      page.getByRole("link", { name: "一覧へ戻る" }),
    ).toHaveAttribute("href", "/me/reviews");
    await expect(page.getByRole("form", { name: "レビュー編集" })).toHaveCount(0);
  });

  test("レビュー削除を確定すると一覧から消えて成功表示になる", async ({ page }) => {
    const draftReview = createMyReview();
    let deleteCalled = false;

    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 200, myReviewListResponse([draftReview])),
    );
    await page.route("**/api/me/reviews/11", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
        await fulfillJson(route, 200, {
          data: {
            message: "レビューを削除しました。",
          },
          error: null,
        });
        return;
      }

      await route.fallback();
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("このレビューを削除しますか？");
      await dialog.accept();
    });

    await page.goto("/me/reviews");
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page.getByText("レビューを削除しました。")).toBeVisible();
    await expect(page.getByText("Draft Product")).toHaveCount(0);
    await expect(
      page.getByText("投稿したレビューはまだありません。"),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "注文履歴を見る" }),
    ).toHaveAttribute("href", "/orders");
    expect(deleteCalled).toBe(true);
  });

  test("レビュー削除をキャンセルすると削除APIを呼ばず一覧を維持する", async ({
    page,
  }) => {
    let deleteCalled = false;

    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 200, myReviewListResponse([createMyReview()])),
    );
    await page.route("**/api/me/reviews/11", async (route) => {
      if (route.request().method() === "DELETE") {
        deleteCalled = true;
      }

      await route.fallback();
    });
    page.once("dialog", async (dialog) => {
      await dialog.dismiss();
    });

    await page.goto("/me/reviews");
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page.getByText("Draft Product")).toBeVisible();
    expect(deleteCalled).toBe(false);
  });

  test("レビュー削除失敗時は対象レビューにエラーを表示する", async ({
    page,
  }) => {
    await page.route("**/api/me/reviews", (route) =>
      fulfillJson(route, 200, myReviewListResponse([createMyReview()])),
    );
    await page.route("**/api/me/reviews/11", async (route) => {
      if (route.request().method() === "DELETE") {
        await fulfillJson(route, 500, {
          data: null,
          error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "delete failed",
          },
        });
        return;
      }

      await route.fallback();
    });
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.goto("/me/reviews");
    await page.getByRole("button", { name: "削除する" }).click();

    await expect(page.getByText("delete failed")).toBeVisible();
    await expect(page.getByText("Draft Product")).toBeVisible();
  });

  test("レビュー編集画面で未ログイン時はreturnTo付きでログインへ遷移する", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );
    await page.route("**/api/me/reviews/11", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(/\/login\?returnTo=%2Fme%2Freviews%2F11%2Fedit$/),
      page.goto("/me/reviews/11/edit"),
    ]);
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
