import { expect, type Page, type Route, test } from "@playwright/test";

type CartItem = {
  productId: number;
  name: string;
  imageUrl: string | null;
  priceIncludingTax: number;
  stockStatus: "in_stock" | "low_stock" | "out_of_stock";
  quantity: number;
  maxSelectableQuantity: number;
  canBePurchased: boolean;
};

type Cart = {
  items: CartItem[];
  totalAmount: number;
};

const authenticatedUserResponse = {
  data: {
    id: 42,
    name: "Order User",
    email: "order@example.com",
    roles: ["customer"],
  },
  error: null,
};

const keyboardItem: CartItem = {
  productId: 1,
  name: "HHKB Professional",
  imageUrl: null,
  priceIncludingTax: 39600,
  stockStatus: "in_stock",
  quantity: 2,
  maxSelectableQuantity: 3,
  canBePurchased: true,
};

const monitorItem: CartItem = {
  productId: 2,
  name: "4K Monitor",
  imageUrl: null,
  priceIncludingTax: 54800,
  stockStatus: "in_stock",
  quantity: 1,
  maxSelectableQuantity: 2,
  canBePurchased: true,
};

const outOfStockKeyboard: CartItem = {
  ...keyboardItem,
  stockStatus: "out_of_stock",
  maxSelectableQuantity: 0,
  canBePurchased: false,
};

const cartResponse = (cart: Cart) => ({
  data: cart,
  error: null,
});

const emptyCart: Cart = {
  items: [],
  totalAmount: 0,
};

const orderSummary = {
  orderId: 100,
  orderNumber: "ORD-20260530-A8K3D2",
  orderStatus: "ordered",
  totalIncludingTax: 134000,
  orderedAt: "2026-05-30T12:00:00Z",
  itemCount: 3,
};

const orderDetail = {
  orderId: 100,
  orderNumber: "ORD-20260530-A8K3D2",
  orderStatus: "ordered",
  totalExcludingTax: 121818,
  totalTax: 12182,
  totalIncludingTax: 134000,
  orderedAt: "2026-05-30T12:00:00Z",
  items: [
    {
      productId: 1,
      productName: "HHKB Professional",
      productImageUrl: null,
      makerName: "PFU",
      modelNumber: "PD-KB800",
      unitPriceExcludingTax: 36000,
      taxRate: 0.1,
      unitPriceIncludingTax: 39600,
      quantity: 2,
      subtotalExcludingTax: 72000,
      subtotalTax: 7200,
      subtotalIncludingTax: 79200,
    },
    {
      productId: 2,
      productName: "4K Monitor",
      productImageUrl: null,
      makerName: "Display Maker",
      modelNumber: "DM-4K27",
      unitPriceExcludingTax: 49818,
      taxRate: 0.1,
      unitPriceIncludingTax: 54800,
      quantity: 1,
      subtotalExcludingTax: 49818,
      subtotalTax: 4982,
      subtotalIncludingTax: 54800,
    },
  ],
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

async function mockHeaderCart(page: Page, cart: Cart = emptyCart) {
  await page.route("**/api/cart", (route) =>
    fulfillJson(route, 200, cartResponse(cart)),
  );
}

test.describe("注文導線", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("Cartから注文確認へ進み、注文確定後に注文完了を表示する", async ({
    page,
  }) => {
    let cart: Cart = {
      items: [keyboardItem, monitorItem],
      totalAmount:
        keyboardItem.priceIncludingTax * keyboardItem.quantity +
        monitorItem.priceIncludingTax * monitorItem.quantity,
    };
    let orderCreateCount = 0;

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );
    await page.route("**/api/orders", async (route) => {
      if (route.request().method() !== "POST") {
        await route.fallback();
        return;
      }

      orderCreateCount += 1;
      cart = { items: [], totalAmount: 0 };
      await fulfillJson(route, 201, {
        data: {
          orderId: 100,
          orderNumber: "ORD-20260530-A8K3D2",
          totalIncludingTax: 134000,
          orderedAt: "2026-05-30T12:00:00Z",
          items: [
            {
              productId: keyboardItem.productId,
              productName: keyboardItem.name,
              productImageUrl: null,
              quantity: keyboardItem.quantity,
              unitPriceIncludingTax: keyboardItem.priceIncludingTax,
              subtotalIncludingTax:
                keyboardItem.priceIncludingTax * keyboardItem.quantity,
            },
            {
              productId: monitorItem.productId,
              productName: monitorItem.name,
              productImageUrl: null,
              quantity: monitorItem.quantity,
              unitPriceIncludingTax: monitorItem.priceIncludingTax,
              subtotalIncludingTax:
                monitorItem.priceIncludingTax * monitorItem.quantity,
            },
          ],
        },
        error: null,
      });
    });

    await page.goto("/cart");

    await expect(page.getByLabel("カート内の商品数 3件")).toBeVisible();
    await Promise.all([
      page.waitForURL(/\/orders\/confirm$/),
      page.getByRole("link", { name: "注文確認へ進む" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "注文確認" })).toBeVisible();
    await expect(page.getByText(keyboardItem.name)).toBeVisible();
    await expect(page.getByText(monitorItem.name)).toBeVisible();
    await expect(page.getByLabel("注文合計")).toContainText(/[￥¥]134,000/);

    const submitButton = page.getByRole("button", { name: "注文を確定する" });
    await submitButton.click();

    await expect.poll(() => orderCreateCount).toBe(1);
    await expect(page).toHaveURL(/\/orders\/complete$/);
    await expect(page.getByRole("heading", { name: "注文完了" })).toBeVisible();
    await expect(page.getByText("注文が完了しました。")).toBeVisible();
    await expect(page.getByText("ORD-20260530-A8K3D2")).toBeVisible();
    await expect(page.getByText(/[￥¥]134,000/)).toBeVisible();
    await expect(page.getByLabel(/カート内の商品数/)).toHaveCount(0);
  });

  test("Cart数量が未反映の場合は注文確認へ進めない", async ({ page }) => {
    const cart: Cart = {
      items: [keyboardItem],
      totalAmount: keyboardItem.priceIncludingTax * keyboardItem.quantity,
    };

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );

    await page.goto("/cart");

    const item = page.getByRole("listitem").filter({ hasText: keyboardItem.name });
    await item
      .getByRole("button", { name: `${keyboardItem.name}の数量を増やす` })
      .click();

    await expect(
      page.getByText("変更した数量は「料金を再計算」で合計に反映されます。"),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: "注文確認へ進む" })).toHaveAttribute(
      "aria-disabled",
      "true",
    );
  });

  test("注文確定時にEMPTY_CARTなら空Cart表示へ切り替わる", async ({ page }) => {
    let cart: Cart = {
      items: [keyboardItem],
      totalAmount: keyboardItem.priceIncludingTax * keyboardItem.quantity,
    };

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );
    await page.route("**/api/orders", async (route) => {
      cart = { items: [], totalAmount: 0 };
      await fulfillJson(route, 400, {
        data: null,
        error: {
          code: "EMPTY_CART",
          message: "cart is empty",
        },
      });
    });

    await page.goto("/orders/confirm");
    await page.getByRole("button", { name: "注文を確定する" }).click();

    await expect(page.getByText("カートが空のため注文できません。")).toBeVisible();
    await expect(page.getByText("カートに商品がありません。")).toBeVisible();
    await expect(page.getByRole("link", { name: "カートへ戻る" })).toHaveAttribute(
      "href",
      "/cart",
    );
  });

  test("注文確定時にOUT_OF_STOCKならCartを再取得して確認を促す", async ({
    page,
  }) => {
    let cart: Cart = {
      items: [keyboardItem],
      totalAmount: keyboardItem.priceIncludingTax * keyboardItem.quantity,
    };

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );
    await page.route("**/api/orders", async (route) => {
      cart = {
        items: [outOfStockKeyboard],
        totalAmount: keyboardItem.priceIncludingTax * keyboardItem.quantity,
      };
      await fulfillJson(route, 409, {
        data: null,
        error: {
          code: "OUT_OF_STOCK",
          message: "out of stock",
        },
      });
    });

    await page.goto("/orders/confirm");
    await page.getByRole("button", { name: "注文を確定する" }).click();

    await expect(
      page.getByText(
        "注文確定直前に在庫不足の商品がありました。カートで数量を確認してください。",
      ),
    ).toBeVisible();
    await expect(page.getByText("在庫なし")).toBeVisible();
    await expect(
      page.getByText("この商品は現在購入できません。カートで内容を確認してください。"),
    ).toBeVisible();
    await expect(page.getByRole("button", { name: "注文を確定する" })).toBeDisabled();
  });
});

test.describe("注文履歴", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
    await mockHeaderCart(page);
  });

  test("注文履歴一覧を表示し、詳細へ遷移できる", async ({ page }) => {
    await page.route("**/api/orders", async (route) => {
      if (route.request().method() !== "GET") {
        await route.fallback();
        return;
      }

      await fulfillJson(route, 200, {
        data: {
          orders: [orderSummary],
        },
        error: null,
      });
    });
    await page.route("**/api/orders/100", (route) =>
      fulfillJson(route, 200, {
        data: orderDetail,
        error: null,
      }),
    );

    await page.goto("/orders");

    await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible();
    await expect(page.getByText(orderSummary.orderNumber)).toBeVisible();
    await expect(page.getByText("注文済み")).toBeVisible();
    await expect(page.getByText("3点")).toBeVisible();
    await expect(page.getByText(/[￥¥]134,000/)).toBeVisible();

    await Promise.all([
      page.waitForURL(/\/orders\/100$/),
      page.getByRole("link", { name: "詳細を見る" }).click(),
    ]);
    await expect(page.getByRole("heading", { name: "注文詳細" })).toBeVisible();
    await expect(page.getByText("注文概要")).toBeVisible();
    await expect(page.getByText("注文明細")).toBeVisible();
    await expect(page.getByText("HHKB Professional")).toBeVisible();
    await expect(page.getByText("PFU")).toBeVisible();
    await expect(page.getByText("PD-KB800")).toBeVisible();
    await expect(page.getByText("4K Monitor")).toBeVisible();
    await expect(page.getByText(/[￥¥]79,200/)).toBeVisible();
  });

  test("注文0件表示を表示できる", async ({ page }) => {
    await page.route("**/api/orders", (route) =>
      fulfillJson(route, 200, {
        data: {
          orders: [],
        },
        error: null,
      }),
    );

    await page.goto("/orders");

    await expect(page.getByRole("heading", { name: "注文履歴" })).toBeVisible();
    await expect(page.getByText("注文履歴はまだありません。")).toBeVisible();
    await expect(page.getByRole("link", { name: "商品を探す" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  test("未ログイン時はreturnTo付きでログインへ遷移する", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "unauthorized",
        },
      }),
    );
    await page.route("**/api/orders", (route) =>
      fulfillJson(route, 401, {
        data: null,
        error: {
          code: "UNAUTHORIZED",
          message: "unauthorized",
        },
      }),
    );

    await Promise.all([
      page.waitForURL(/\/login\?returnTo=%2Forders$/),
      page.goto("/orders"),
    ]);
  });

  test("存在しない注文は案内表示になる", async ({ page }) => {
    await page.route("**/api/orders/999", (route) =>
      fulfillJson(route, 404, {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "order not found",
        },
      }),
    );

    await page.goto("/orders/999");

    await expect(page.getByRole("heading", { name: "注文詳細" })).toBeVisible();
    await expect(page.getByText("注文が見つかりませんでした。")).toBeVisible();
    await expect(page.getByRole("link", { name: "注文履歴へ戻る" }).first()).toHaveAttribute(
      "href",
      "/orders",
    );
  });
});
