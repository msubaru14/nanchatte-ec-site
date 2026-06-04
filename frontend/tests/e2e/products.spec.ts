import { expect, type Page, type Route, test } from "@playwright/test";

const stockStatusPattern = /在庫あり|残りわずか|在庫なし/;

async function fulfillJson(route: Route, status: number, body: unknown) {
  await route.fulfill({
    status,
    contentType: "application/json",
    body: JSON.stringify(body),
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(() => {
    const documentElement = document.documentElement;
    const body = document.body;

    return {
      bodyClientWidth: body.clientWidth,
      bodyScrollWidth: body.scrollWidth,
      documentClientWidth: documentElement.clientWidth,
      documentScrollWidth: documentElement.scrollWidth,
    };
  });

  expect(overflow.documentScrollWidth).toBeLessThanOrEqual(
    overflow.documentClientWidth + 1,
  );
  expect(overflow.bodyScrollWidth).toBeLessThanOrEqual(
    overflow.bodyClientWidth + 1,
  );
}

test.describe("/products", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/products");
  });

  test("商品一覧にseed商品が表示される", async ({ page }) => {
    await expect(
      page.getByRole("heading", { level: 1, name: "商品一覧" }),
    ).toBeVisible();
    await expect(page.getByText(/\d+件の商品/)).toBeVisible();

    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    expect(await cards.count()).toBeGreaterThan(0);

    const firstCard = cards.first();
    await expect(firstCard.locator("h2")).toBeVisible();
    await expect(firstCard.getByText(/[￥¥][\d,]+/)).toBeVisible();
    await expect(firstCard.getByText("(税込)")).toBeVisible();
    await expect(firstCard.getByText(stockStatusPattern)).toBeVisible();
  });

  test("商品カードが横スクロールなしでレスポンシブ表示される", async ({
    page,
  }, testInfo) => {
    const cards = page.locator("article");
    await expect(cards.first()).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const boxes = await cards.evaluateAll((elements) =>
      elements.slice(0, 4).map((element) => {
        const rect = element.getBoundingClientRect();

        return {
          bottom: rect.bottom,
          left: rect.left,
          right: rect.right,
          top: rect.top,
          width: rect.width,
        };
      }),
    );

    for (const box of boxes) {
      expect(box.left).toBeGreaterThanOrEqual(0);
      expect(box.right).toBeLessThanOrEqual(viewport!.width + 1);
      expect(box.width).toBeLessThanOrEqual(viewport!.width);
    }

    if (testInfo.project.name === "mobile" && boxes.length >= 2) {
      expect(boxes[1].top).toBeGreaterThanOrEqual(boxes[0].bottom);
    }

    if (testInfo.project.name === "tablet" && boxes.length >= 3) {
      expect(boxes[2].top).toBeGreaterThan(boxes[0].top);
    }
  });
});

test.describe("/products/:id", () => {
  test("商品一覧から商品詳細へ遷移して詳細情報が表示される", async ({ page }) => {
    await page.goto("/products");

    await page
      .getByRole("link", { name: /HHKB Professional HYBRID Type-S/ })
      .click();

    await expect(page).toHaveURL(/\/products\/1$/);
    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "HHKB Professional HYBRID Type-S",
      }),
    ).toBeVisible();
    await expect(page.getByText(/[￥¥]39,600/)).toBeVisible();
    await expect(page.getByText("(税込)")).toBeVisible();
    await expect(page.locator("span").getByText("keyboard")).toBeVisible();
    await expect(page.locator("span").getByText("在庫あり")).toBeVisible();
    await expect(page.getByText("PFU")).toBeVisible();
    await expect(page.getByText("PD-KB800BS")).toBeVisible();
    await expect(page.getByText("2023年10月25日")).toBeVisible();
    await expect(
      page.getByText("Compact keyboard with electrostatic capacitive switches."),
    ).toBeVisible();
    const cartArea = page.getByRole("region", { name: "カート追加" });
    const quantity = cartArea.getByLabel("HHKB Professional HYBRID Type-Sの数量", {
      exact: true,
    });
    await expect(quantity).toContainText("1");
    await expect(
      cartArea.getByRole("button", { name: "カートに追加" }),
    ).toBeEnabled();
    await expect(
      page.getByRole("link", { name: "商品一覧へ戻る" }),
    ).toBeVisible();
  });

  test("在庫なし商品のカート追加ボタンが無効になる", async ({
    page,
  }) => {
    await page.goto("/products/3");

    await expect(
      page.getByRole("heading", { level: 1, name: "Sony INZONE H5" }),
    ).toBeVisible();
    await expect(page.locator("span").getByText("在庫なし")).toBeVisible();
    const cartArea = page.getByRole("region", { name: "カート追加" });
    const quantity = cartArea.getByLabel("Sony INZONE H5の数量", {
      exact: true,
    });
    await expect(quantity).toContainText("1");
    await expect(
      cartArea.getByRole("button", { name: "Sony INZONE H5の数量を減らす" }),
    ).toBeDisabled();
    await expect(
      cartArea.getByRole("button", { name: "Sony INZONE H5の数量を増やす" }),
    ).toBeDisabled();
    await expect(cartArea.getByRole("button", { name: "在庫なし" })).toBeDisabled();
  });

  test("商品詳細で数量を1以上に変更できる", async ({ page }) => {
    await page.goto("/products/1");

    const cartArea = page.getByRole("region", { name: "カート追加" });
    const quantity = cartArea.getByLabel("HHKB Professional HYBRID Type-Sの数量", {
      exact: true,
    });
    const decreaseButton = cartArea.getByRole("button", {
      name: "HHKB Professional HYBRID Type-Sの数量を減らす",
    });
    const increaseButton = cartArea.getByRole("button", {
      name: "HHKB Professional HYBRID Type-Sの数量を増やす",
    });

    await expect(quantity).toContainText("1");
    await expect(decreaseButton).toBeDisabled();

    await increaseButton.click();
    await increaseButton.click();
    await expect(quantity).toContainText("3");
    await expect(decreaseButton).toBeEnabled();

    await decreaseButton.click();
    await decreaseButton.click();
    await expect(quantity).toContainText("1");
    await expect(decreaseButton).toBeDisabled();
  });

  test("商品詳細にレビュー概要と公開レビュー一覧を表示する", async ({ page }) => {
    await page.route("**/api/products/1/reviews/summary", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          averageRating: 4.5,
          reviewCount: 2,
        },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          reviews: [
            {
              reviewId: 2,
              reviewerName: "Review User B",
              rating: 4,
              title: "使いやすい",
              comment: "普段使いにちょうどよいです。",
              createdAt: "2026-06-02T09:30:00Z",
              updatedAt: "2026-06-02T09:30:00Z",
            },
            {
              reviewId: 1,
              reviewerName: "Review User A",
              rating: 5,
              title: "満足",
              comment: "打鍵感が良いです。",
              createdAt: "2026-06-01T12:00:00Z",
              updatedAt: "2026-06-01T12:00:00Z",
            },
          ],
        },
        error: null,
      });
    });

    await page.goto("/products/1");

    const reviewRegion = page.getByRole("region", { name: "レビュー" });
    await expect(reviewRegion.getByText("平均評価: 4.5 / 5")).toBeVisible();
    await expect(reviewRegion.getByText("レビュー 2件")).toBeVisible();
    await expect(reviewRegion.getByText("使いやすい")).toBeVisible();
    await expect(reviewRegion.getByText("Review User B")).toBeVisible();
    await expect(reviewRegion.getByText("評価 4 / 5")).toBeVisible();
    await expect(
      reviewRegion.getByText("普段使いにちょうどよいです。"),
    ).toBeVisible();
    await expect(reviewRegion.getByText("満足")).toBeVisible();
    await expect(reviewRegion.getByText("Review User A")).toBeVisible();
    await expect(page.getByRole("form", { name: "レビュー投稿" })).toHaveCount(0);
  });

  test("商品詳細のレビュー投稿導線からdraft作成と公開を行える", async ({ page }) => {
    let reviewFetchCount = 0;
    const createRequests: unknown[] = [];
    const publishRequests: string[] = [];

    await page.route(/\/api\/auth\/me(?:\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, {
        data: {
          id: 1,
          name: "Review Writer",
          email: "review-writer@example.com",
          roles: ["customer"],
        },
        error: null,
      });
    });
    await page.route("**/api/cart", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          items: [],
          totalAmount: 0,
        },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews/summary", async (route) => {
      await fulfillJson(route, 200, {
        data:
          reviewFetchCount === 0
            ? {
                averageRating: 0,
                reviewCount: 0,
              }
            : {
                averageRating: 5,
                reviewCount: 1,
              },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews", async (route) => {
      if (route.request().method() === "POST") {
        createRequests.push(route.request().postDataJSON());
        await fulfillJson(route, 201, {
          data: {
            reviewId: 77,
            productId: 1,
            rating: 5,
            title: "最高です",
            comment: "打鍵感がとても良いです。",
            status: "draft",
            createdAt: "2026-06-04T12:00:00Z",
            updatedAt: "2026-06-04T12:00:00Z",
          },
          error: null,
        });
        return;
      }

      reviewFetchCount += 1;
      await fulfillJson(route, 200, {
        data: {
          reviews:
            reviewFetchCount === 1
              ? []
              : [
                  {
                    reviewId: 77,
                    reviewerName: "Review Writer",
                    rating: 5,
                    title: "最高です",
                    comment: "打鍵感がとても良いです。",
                    createdAt: "2026-06-04T12:00:00Z",
                    updatedAt: "2026-06-04T12:00:00Z",
                  },
                ],
        },
        error: null,
      });
    });
    await page.route("**/api/me/reviews/77/publish", async (route) => {
      publishRequests.push(route.request().method());
      await fulfillJson(route, 200, {
        data: {
          reviewId: 77,
          productId: 1,
          productName: "HHKB Professional HYBRID Type-S",
          rating: 5,
          title: "最高です",
          comment: "打鍵感がとても良いです。",
          status: "published",
          createdAt: "2026-06-04T12:00:00Z",
          updatedAt: "2026-06-04T12:00:00Z",
        },
        error: null,
      });
    });

    await page.goto("/products/1?review=1");

    const reviewForm = page.getByRole("form", { name: "レビュー投稿" });
    await expect(reviewForm).toBeVisible();
    await reviewForm.getByRole("radio", { name: "評価 5 / 5" }).click();
    await reviewForm.getByLabel("タイトル").fill("最高です");
    await reviewForm.getByLabel("コメント").fill("打鍵感がとても良いです。");
    await reviewForm.getByRole("button", { name: "投稿する" }).click();

    await expect.poll(() => createRequests).toEqual([
      {
        rating: 5,
        title: "最高です",
        comment: "打鍵感がとても良いです。",
      },
    ]);
    await expect.poll(() => publishRequests).toEqual(["POST"]);
    await expect(reviewForm.getByText("レビューを投稿しました。")).toBeVisible();
    await expect(reviewForm.getByRole("textbox", { name: "タイトル" })).toHaveValue(
      "",
    );
    await expect(reviewForm.getByRole("textbox", { name: "コメント" })).toHaveValue(
      "",
    );

    const reviewRegion = page.getByRole("region", { name: "レビュー" });
    await expect(reviewRegion.getByText("平均評価: 5.0 / 5")).toBeVisible();
    await expect(reviewRegion.getByText("レビュー 1件")).toBeVisible();
    await expect(reviewRegion.getByText("最高です")).toBeVisible();
  });

  test("draft作成後にpublishが失敗しても再投稿で公開できる", async ({ page }) => {
    let reviewFetchCount = 0;
    let publishRequestCount = 0;
    const createRequests: unknown[] = [];

    await page.route(/\/api\/auth\/me(?:\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, {
        data: {
          id: 1,
          name: "Review Writer",
          email: "review-writer@example.com",
          roles: ["customer"],
        },
        error: null,
      });
    });
    await page.route("**/api/cart", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          items: [],
          totalAmount: 0,
        },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews/summary", async (route) => {
      await fulfillJson(route, 200, {
        data:
          reviewFetchCount === 0
            ? {
                averageRating: 0,
                reviewCount: 0,
              }
            : {
                averageRating: 5,
                reviewCount: 1,
              },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews", async (route) => {
      if (route.request().method() === "POST") {
        createRequests.push(route.request().postDataJSON());
        await fulfillJson(route, 201, {
          data: {
            reviewId: 77,
            productId: 1,
            rating: 5,
            title: "最高です",
            comment: "打鍵感がとても良いです。",
            status: "draft",
            createdAt: "2026-06-04T12:00:00Z",
            updatedAt: "2026-06-04T12:00:00Z",
          },
          error: null,
        });
        return;
      }

      reviewFetchCount += 1;
      await fulfillJson(route, 200, {
        data: {
          reviews:
            reviewFetchCount === 1
              ? []
              : [
                  {
                    reviewId: 77,
                    reviewerName: "Review Writer",
                    rating: 5,
                    title: "最高です",
                    comment: "打鍵感がとても良いです。",
                    createdAt: "2026-06-04T12:00:00Z",
                    updatedAt: "2026-06-04T12:00:00Z",
                  },
                ],
        },
        error: null,
      });
    });
    await page.route("**/api/me/reviews/77/publish", async (route) => {
      publishRequestCount += 1;

      if (publishRequestCount === 1) {
        await fulfillJson(route, 500, {
          data: null,
          error: {
            code: "INTERNAL_ERROR",
            message: "レビュー投稿に失敗しました。",
          },
        });
        return;
      }

      await fulfillJson(route, 200, {
        data: {
          reviewId: 77,
          productId: 1,
          productName: "HHKB Professional HYBRID Type-S",
          rating: 5,
          title: "最高です",
          comment: "打鍵感がとても良いです。",
          status: "published",
          createdAt: "2026-06-04T12:00:00Z",
          updatedAt: "2026-06-04T12:00:00Z",
        },
        error: null,
      });
    });

    await page.goto("/products/1?review=1");

    const reviewForm = page.getByRole("form", { name: "レビュー投稿" });
    await expect(reviewForm).toBeVisible();
    await reviewForm.getByRole("radio", { name: "評価 5 / 5" }).click();
    await reviewForm.getByRole("textbox", { name: "タイトル" }).fill("最高です");
    await reviewForm
      .getByRole("textbox", { name: "コメント" })
      .fill("打鍵感がとても良いです。");
    await reviewForm.getByRole("button", { name: "投稿する" }).click();

    await expect.poll(() => createRequests.length).toBe(1);
    await expect.poll(() => publishRequestCount).toBe(1);
    await expect(reviewForm.getByText("レビュー投稿に失敗しました。")).toBeVisible();

    await reviewForm.getByRole("button", { name: "投稿する" }).click();

    await expect.poll(() => createRequests.length).toBe(1);
    await expect.poll(() => publishRequestCount).toBe(2);
    await expect(reviewForm.getByText("レビューを投稿しました。")).toBeVisible();
    await expect(reviewForm.getByRole("textbox", { name: "タイトル" })).toHaveValue(
      "",
    );
    await expect(reviewForm.getByRole("textbox", { name: "コメント" })).toHaveValue(
      "",
    );

    const reviewRegion = page.getByRole("region", { name: "レビュー" });
    await expect(reviewRegion.getByText("平均評価: 5.0 / 5")).toBeVisible();
    await expect(reviewRegion.getByText("レビュー 1件")).toBeVisible();
    await expect(reviewRegion.getByText("最高です")).toBeVisible();
  });

  test("レビュー投稿フォームで入力エラーとconflictを表示する", async ({ page }) => {
    let createRequestCount = 0;

    await page.route(/\/api\/auth\/me(?:\?.*)?$/, async (route) => {
      await fulfillJson(route, 200, {
        data: {
          id: 1,
          name: "Review Writer",
          email: "review-writer@example.com",
          roles: ["customer"],
        },
        error: null,
      });
    });
    await page.route("**/api/cart", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          items: [],
          totalAmount: 0,
        },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews/summary", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          averageRating: 0,
          reviewCount: 0,
        },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews", async (route) => {
      if (route.request().method() === "POST") {
        createRequestCount += 1;
        await fulfillJson(route, 409, {
          data: null,
          error: {
            code: "CONFLICT",
            message: "review already exists",
          },
        });
        return;
      }

      await fulfillJson(route, 200, {
        data: {
          reviews: [],
        },
        error: null,
      });
    });

    await page.goto("/products/1?review=1");

    const reviewForm = page.getByRole("form", { name: "レビュー投稿" });
    await expect(reviewForm).toBeVisible();
    const submitReviewForm = async () => {
      await reviewForm.evaluate((form) => {
        (form as HTMLFormElement).requestSubmit();
      });
    };
    await reviewForm
      .getByRole("textbox", { name: "コメント" })
      .fill("タイトルなしのコメントです。");
    await submitReviewForm();

    await expect(
      reviewForm.getByText("評価を選択してください。"),
    ).toBeVisible();
    expect(createRequestCount).toBe(0);

    await reviewForm.getByRole("radio", { name: "評価 4 / 5" }).click();
    await submitReviewForm();

    await expect(
      reviewForm.getByText("コメントを入力する場合はタイトルも入力してください。"),
    ).toBeVisible();
    expect(createRequestCount).toBe(0);

    await reviewForm.getByRole("textbox", { name: "タイトル" }).fill("重複レビュー");
    await submitReviewForm();

    await expect.poll(() => createRequestCount).toBe(1);
    await expect(
      reviewForm.getByText("この商品には既にレビューを投稿済みです。"),
    ).toBeVisible();
  });

  test("レビュー0件とtitle/commentなしのレビューを表示できる", async ({ page }) => {
    await page.route("**/api/products/1/reviews/summary", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          averageRating: 0,
          reviewCount: 0,
        },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          reviews: [],
        },
        error: null,
      });
    });

    await page.goto("/products/1");

    const reviewRegion = page.getByRole("region", { name: "レビュー" });
    await expect(reviewRegion.getByText("平均評価: 0.0 / 5")).toBeVisible();
    await expect(reviewRegion.getByText("レビュー 0件")).toBeVisible();
    await expect(reviewRegion.getByText("まだレビューはありません。")).toBeVisible();

    await page.route("**/api/products/1/reviews/summary", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          averageRating: 5,
          reviewCount: 1,
        },
        error: null,
      });
    });
    await page.route("**/api/products/1/reviews", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          reviews: [
            {
              reviewId: 3,
              reviewerName: "Rating Only User",
              rating: 5,
              title: null,
              comment: null,
              createdAt: "2026-06-03T10:00:00Z",
              updatedAt: "2026-06-03T10:00:00Z",
            },
          ],
        },
        error: null,
      });
    });

    await page.goto("/products/1");

    await expect(reviewRegion.getByText("平均評価: 5.0 / 5")).toBeVisible();
    await expect(reviewRegion.getByText("レビュー 1件")).toBeVisible();
    await expect(reviewRegion.getByText("タイトルなし")).toBeVisible();
    await expect(reviewRegion.getByText("コメントはありません。")).toBeVisible();
  });

  test("レビュー取得失敗時も商品詳細画面を表示し続ける", async ({ page }) => {
    await page.route("**/api/products/1/reviews/summary", async (route) => {
      await fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "review summary failed",
        },
      });
    });
    await page.route("**/api/products/1/reviews", async (route) => {
      await fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "review list failed",
        },
      });
    });

    await page.goto("/products/1");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "HHKB Professional HYBRID Type-S",
      }),
    ).toBeVisible();
    const reviewRegion = page.getByRole("region", { name: "レビュー" });
    await expect(
      reviewRegion.getByText(/review .* failed \(INTERNAL_SERVER_ERROR\)/),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "カートに追加" })).toBeEnabled();
  });

  test("選択した数量でカートに追加しCart導線を表示する", async ({ page }) => {
    const requests: Array<{ productId: number; quantity: number }> = [];
    let cartQuantity = 0;

    await page.route("**/api/auth/me", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          id: 1,
          name: "Cart Header User",
          email: "cart-header@example.com",
          roles: ["customer"],
        },
        error: null,
      });
    });
    await page.route("**/api/cart", async (route) => {
      await fulfillJson(route, 200, {
        data: {
          items: cartQuantity > 0 ? [{ quantity: cartQuantity }] : [],
          totalAmount: 0,
        },
        error: null,
      });
    });

    await page.route("**/api/cart/items", async (route) => {
      requests.push(route.request().postDataJSON() as {
        productId: number;
        quantity: number;
      });
      cartQuantity = 2;
      await fulfillJson(route, 200, {
        data: { message: "cart item added" },
        error: null,
      });
    });

    await page.goto("/products/1");

    const cartArea = page.getByRole("region", { name: "カート追加" });
    await cartArea
      .getByRole("button", { name: "HHKB Professional HYBRID Type-Sの数量を増やす" })
      .click();
    expect(requests).toHaveLength(0);

    await cartArea.getByRole("button", { name: "カートに追加" }).click();

    await expect.poll(() => requests).toEqual([{ productId: 1, quantity: 2 }]);
    await expect(cartArea.getByText("カートに追加しました。")).toBeVisible();
    await expect(cartArea.getByRole("link", { name: "カートを見る" })).toHaveAttribute(
      "href",
      "/cart",
    );
    await expect(page.getByLabel("カート内の商品数 2件")).toBeVisible();
  });

  test("在庫不足なら提示数量での再追加を確認して実行できる", async ({ page }) => {
    const requests: Array<{ productId: number; quantity: number }> = [];

    page.on("dialog", async (dialog) => {
      expect(dialog.message()).toContain("購入可能な最大数量(2個)");
      await dialog.accept();
    });
    await page.route("**/api/cart/items", async (route) => {
      const body = route.request().postDataJSON() as {
        productId: number;
        quantity: number;
      };
      requests.push(body);

      if (requests.length === 1) {
        await fulfillJson(route, 409, {
          data: null,
          error: {
            code: "OUT_OF_STOCK",
            message: "out of stock",
            details: { availableQuantity: 2 },
          },
        });
        return;
      }

      await fulfillJson(route, 200, {
        data: { message: "cart item added" },
        error: null,
      });
    });

    await page.goto("/products/1");

    const cartArea = page.getByRole("region", { name: "カート追加" });
    const increaseButton = cartArea.getByRole("button", {
      name: "HHKB Professional HYBRID Type-Sの数量を増やす",
    });
    await increaseButton.click();
    await increaseButton.click();
    await cartArea.getByRole("button", { name: "カートに追加" }).click();

    await expect.poll(() => requests).toEqual([
      { productId: 1, quantity: 3 },
      { productId: 1, quantity: 2 },
    ]);
    await expect(
      cartArea.getByLabel("HHKB Professional HYBRID Type-Sの数量", { exact: true }),
    ).toContainText("2");
    await expect(cartArea.getByText("カートに追加しました。")).toBeVisible();
  });

  test("在庫不足の調整提案を断ると入力数量を維持する", async ({ page }) => {
    let requestCount = 0;

    page.on("dialog", async (dialog) => dialog.dismiss());
    await page.route("**/api/cart/items", async (route) => {
      requestCount += 1;
      await fulfillJson(route, 409, {
        data: null,
        error: {
          code: "OUT_OF_STOCK",
          message: "out of stock",
          details: { availableQuantity: 2 },
        },
      });
    });

    await page.goto("/products/1");

    const cartArea = page.getByRole("region", { name: "カート追加" });
    const increaseButton = cartArea.getByRole("button", {
      name: "HHKB Professional HYBRID Type-Sの数量を増やす",
    });
    await increaseButton.click();
    await increaseButton.click();
    await cartArea.getByRole("button", { name: "カートに追加" }).click();

    await expect.poll(() => requestCount).toBe(1);
    await expect(
      cartArea.getByLabel("HHKB Professional HYBRID Type-Sの数量", { exact: true }),
    ).toContainText("3");
    await expect(
      cartArea.getByText("在庫が不足しています。数量を調整して再度お試しください。"),
    ).toBeVisible();
  });

  test("カート追加で未認証の場合は商品詳細への戻り先付きでログインへ遷移する", async ({
    page,
  }) => {
    await page.route("**/api/cart/items", (route) =>
      fulfillJson(route, 401, {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "unauthorized",
        },
      }),
    );

    await page.goto("/products/1");
    await page.getByRole("button", { name: "カートに追加" }).click();

    await expect(page).toHaveURL(/\/login\?returnTo=%2Fproducts%2F1$/);
  });

  test("存在しない商品ではNot Found扱いになる", async ({ page }) => {
    await page.goto("/products/999999");

    await expect(
      page.locator('meta[name="next-error"][content="not-found"]'),
    ).toHaveCount(1);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute(
      "content",
      "noindex",
    );
  });

  test("商品詳細が横スクロールなしでレスポンシブ表示される", async ({
    page,
  }) => {
    await page.goto("/products/1");

    await expect(
      page.getByRole("heading", {
        level: 1,
        name: "HHKB Professional HYBRID Type-S",
      }),
    ).toBeVisible();
    await expectNoHorizontalOverflow(page);

    const detailLayout = page.locator("section").first();
    const viewport = page.viewportSize();
    expect(viewport).not.toBeNull();

    const box = await detailLayout.boundingBox();
    expect(box).not.toBeNull();
    expect(box!.x).toBeGreaterThanOrEqual(0);
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport!.width + 1);
  });
});
