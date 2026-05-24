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
    id: 34,
    name: "Cart User",
    email: "cart@example.com",
    roles: ["customer"],
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

const keyboardItem: CartItem = {
  productId: 1,
  name: "HHKB Professional",
  imageUrl: null,
  priceIncludingTax: 39600,
  stockStatus: "in_stock",
  quantity: 1,
  maxSelectableQuantity: 3,
  canBePurchased: true,
};

const unavailableItem: CartItem = {
  productId: 2,
  name: "販売停止中モニター",
  imageUrl: null,
  priceIncludingTax: 14850,
  stockStatus: "out_of_stock",
  quantity: 1,
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

test.describe("/cart", () => {
  test.beforeEach(async ({ page }) => {
    await mockAuthenticatedUser(page);
  });

  test("Cart一覧に商品状態と合計金額を表示する", async ({ page }) => {
    const cart = {
      items: [keyboardItem, unavailableItem],
      totalAmount: 54450,
    };

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );

    await page.goto("/cart");

    await expect(
      page.getByRole("heading", { name: "カート" }),
    ).toBeVisible();
    await expect(page.getByText(keyboardItem.name)).toBeVisible();
    await expect(page.getByText(unavailableItem.name)).toBeVisible();
    await expect(
      page.getByText("この商品は現在購入できません。"),
    ).toBeVisible();
    await expect(page.getByLabel("カート合計")).toContainText(/[￥¥]54,450/);
  });

  test("数量変更は料金再計算を押すまでAPIへ反映しない", async ({ page }) => {
    let cart: Cart = {
      items: [{ ...keyboardItem }],
      totalAmount: keyboardItem.priceIncludingTax,
    };
    const patchBodies: Array<{ quantity: number }> = [];

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );
    await page.route("**/api/cart/items/1", async (route) => {
      if (route.request().method() !== "PATCH") {
        await route.fallback();
        return;
      }

      const body = route.request().postDataJSON() as { quantity: number };
      patchBodies.push(body);
      cart = {
        items: [{ ...keyboardItem, quantity: body.quantity }],
        totalAmount: keyboardItem.priceIncludingTax * body.quantity,
      };
      await fulfillJson(route, 200, {
        data: { message: "quantity updated" },
        error: null,
      });
    });

    await page.goto("/cart");

    const item = page.getByRole("listitem").filter({ hasText: keyboardItem.name });
    const increaseButton = item.getByRole("button", {
      name: `${keyboardItem.name}の数量を増やす`,
    });
    await increaseButton.click();
    await increaseButton.click();

    expect(patchBodies).toHaveLength(0);
    await expect(item.getByText("3", { exact: true })).toBeVisible();
    await expect(increaseButton).toBeDisabled();
    await expect(page.getByLabel("カート合計")).toContainText(/[￥¥]39,600/);
    await expect(
      page.getByText("変更した数量は「料金を再計算」で合計に反映されます。"),
    ).toBeVisible();

    await item.getByRole("button", { name: "料金を再計算" }).click();

    await expect.poll(() => patchBodies.length).toBe(1);
    expect(patchBodies[0]).toEqual({ quantity: 3 });
    await expect(page.getByLabel("カート合計")).toContainText(/[￥¥]118,800/);
    await expect(
      item.getByRole("button", { name: "料金を再計算" }),
    ).toHaveCount(0);
  });

  test("数量反映時に在庫が不足したら最新の選択可能数へ更新する", async ({
    page,
  }) => {
    let cart: Cart = {
      items: [{ ...keyboardItem }],
      totalAmount: keyboardItem.priceIncludingTax,
    };
    let getCount = 0;

    await page.route("**/api/cart", async (route) => {
      getCount += 1;
      await fulfillJson(route, 200, cartResponse(cart));
    });
    await page.route("**/api/cart/items/1", async (route) => {
      cart = {
        items: [
          {
            ...keyboardItem,
            stockStatus: "low_stock",
            maxSelectableQuantity: 1,
          },
        ],
        totalAmount: keyboardItem.priceIncludingTax,
      };
      await fulfillJson(route, 409, {
        data: null,
        error: {
          code: "OUT_OF_STOCK",
          message: "out of stock",
        },
      });
    });

    await page.goto("/cart");

    const item = page.getByRole("listitem").filter({ hasText: keyboardItem.name });
    const increaseButton = item.getByRole("button", {
      name: `${keyboardItem.name}の数量を増やす`,
    });
    await increaseButton.click();
    await item.getByRole("button", { name: "料金を再計算" }).click();

    await expect(
      item.getByText("在庫が不足しているため、数量を変更できませんでした。"),
    ).toBeVisible();
    await expect.poll(() => getCount).toBe(2);
    await expect(increaseButton).toBeDisabled();
    await expect(
      item.getByRole("button", { name: "料金を再計算" }),
    ).toHaveCount(0);
  });

  test("最後の商品を削除すると空Cart表示へ切り替わる", async ({ page }) => {
    let cart: Cart = {
      items: [{ ...keyboardItem }],
      totalAmount: keyboardItem.priceIncludingTax,
    };
    let deleteCount = 0;

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );
    await page.route("**/api/cart/items/1", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }

      deleteCount += 1;
      cart = { items: [], totalAmount: 0 };
      await fulfillJson(route, 200, {
        data: { message: "item deleted" },
        error: null,
      });
    });

    await page.goto("/cart");
    await page.getByRole("button", { name: "カートから削除" }).click();

    await expect.poll(() => deleteCount).toBe(1);
    await expect(page.getByText("カートに商品がありません。")).toBeVisible();
    await expect(page.getByRole("link", { name: "商品を探す" })).toHaveAttribute(
      "href",
      "/products",
    );
  });

  test("全商品を削除すると空Cart表示へ切り替わる", async ({ page }) => {
    let cart: Cart = {
      items: [keyboardItem, { ...unavailableItem, canBePurchased: true }],
      totalAmount: 54450,
    };
    let deleteCount = 0;

    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 200, cartResponse(cart)),
    );
    await page.route("**/api/cart/items", async (route) => {
      if (route.request().method() !== "DELETE") {
        await route.fallback();
        return;
      }

      deleteCount += 1;
      cart = { items: [], totalAmount: 0 };
      await fulfillJson(route, 200, {
        data: { message: "cart cleared" },
        error: null,
      });
    });

    await page.goto("/cart");
    await page.getByRole("button", { name: "カートを空にする" }).click();

    await expect.poll(() => deleteCount).toBe(1);
    await expect(page.getByText("カートに商品がありません。")).toBeVisible();
  });

  test("未認証の場合は戻り先付きでログイン画面へ遷移する", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );
    await page.route("**/api/cart", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await page.goto("/cart");

    await expect(page).toHaveURL(/\/login\?returnTo=%2Fcart$/);
  });
});
