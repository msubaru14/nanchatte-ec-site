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
    await page.getByRole("link", { name: "注文確認へ進む" }).click();

    await expect(page).toHaveURL(/\/orders\/confirm$/);
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
