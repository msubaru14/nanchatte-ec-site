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
