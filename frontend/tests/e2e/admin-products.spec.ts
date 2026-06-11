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

type AdminProductFixture = {
  productId: number;
  name: string;
  description: string | null;
  price: number;
  taxRateId: number;
  taxRate: number;
  categoryId: number;
  stockQuantity: number;
  lowStockThreshold: number;
  status: "active" | "stopped";
  createdAt: string;
  updatedAt: string;
};

function createAdminProduct(
  overrides: Partial<AdminProductFixture> = {},
): AdminProductFixture {
  return {
    productId: 11,
    name: "HHKB Professional",
    description: "静電容量無接点方式のキーボード",
    price: 36000,
    taxRateId: 1,
    taxRate: 0.1,
    categoryId: 2,
    stockQuantity: 12,
    lowStockThreshold: 3,
    status: "active",
    createdAt: "2026-06-01T12:00:00Z",
    updatedAt: "2026-06-01T12:00:00Z",
    ...overrides,
  };
}

function adminProductListResponse(products: AdminProductFixture[]) {
  return {
    data: {
      products,
    },
    error: null,
  };
}

test.describe("管理者商品一覧", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminUser(page);
    await mockHeaderCart(page);
  });

  test("管理者商品一覧にstatus表示名、在庫状態、null説明を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(
        route,
        200,
        adminProductListResponse([
          createAdminProduct(),
          createAdminProduct({
            productId: 12,
            name: "Low Stock Mouse",
            description: null,
            price: 8000,
            categoryId: 3,
            stockQuantity: 2,
            lowStockThreshold: 2,
            status: "stopped",
            createdAt: "2026-06-02T12:00:00Z",
            updatedAt: "2026-06-03T12:00:00Z",
          }),
          createAdminProduct({
            productId: 13,
            name: "Sold Out Monitor",
            description: "在庫なし確認用",
            stockQuantity: 0,
            lowStockThreshold: 5,
          }),
        ]),
      ),
    );

    await page.goto("/admin/products");

    await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
    await expect(page.getByText("Product #11")).toBeVisible();
    await expect(page.getByText("HHKB Professional")).toBeVisible();
    await expect(page.getByText("静電容量無接点方式のキーボード")).toBeVisible();
    await expect(page.getByText("￥36,000")).toHaveCount(2);
    await expect(page.getByText("10%")).toHaveCount(3);
    await expect(page.getByText("販売中")).toHaveCount(2);
    await expect(page.getByText("在庫あり")).toBeVisible();
    await expect(page.getByText("Low Stock Mouse")).toBeVisible();
    await expect(page.getByText("販売停止", { exact: true })).toBeVisible();
    await expect(page.getByText("残りわずか")).toBeVisible();
    await expect(page.getByText("未入力")).toBeVisible();
    await expect(page.getByText("Sold Out Monitor")).toBeVisible();
    await expect(page.getByText("在庫なし", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "商品詳細を見る" }).first(),
    ).toHaveAttribute("href", "/products/11");
    await expect(
      page.getByRole("button", { name: "販売停止にする" }),
    ).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "販売再開する" }),
    ).toHaveCount(1);
  });

  test("商品0件の場合は空状態を表示する", async ({ page }) => {
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([])),
    );

    await page.goto("/admin/products");

    await expect(page.getByText("管理対象の商品はありません。")).toBeVisible();
  });

  test("active商品を販売停止にできる", async ({ page }) => {
    const product = createAdminProduct();
    let stopCalled = false;

    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([product])),
    );
    await page.route("**/api/admin/products/11/stop-selling", async (route) => {
      stopCalled = true;
      await fulfillJson(route, 200, {
        data: {
          ...product,
          status: "stopped",
          updatedAt: "2026-06-05T12:00:00Z",
        },
        error: null,
      });
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("この商品を販売停止にしますか？");
      await dialog.accept();
    });

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "販売停止にする" }).click();

    await expect(page.getByText("商品を販売停止にしました。")).toBeVisible();
    await expect(page.getByText("販売停止", { exact: true })).toBeVisible();
    await expect(
      page.getByRole("button", { name: "販売再開する" }),
    ).toBeVisible();
    expect(stopCalled).toBe(true);
  });

  test("stopped商品を販売再開できる", async ({ page }) => {
    const product = createAdminProduct({ status: "stopped" });
    let resumeCalled = false;

    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([product])),
    );
    await page.route("**/api/admin/products/11/resume-selling", async (route) => {
      resumeCalled = true;
      await fulfillJson(route, 200, {
        data: {
          ...product,
          status: "active",
          updatedAt: "2026-06-05T12:00:00Z",
        },
        error: null,
      });
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("この商品を販売再開しますか？");
      await dialog.accept();
    });

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "販売再開する" }).click();

    await expect(page.getByText("商品を販売再開しました。")).toBeVisible();
    await expect(page.getByText("販売中")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "販売停止にする" }),
    ).toBeVisible();
    expect(resumeCalled).toBe(true);
  });

  test("操作キャンセル時はAPIを呼ばず状態を維持する", async ({ page }) => {
    const product = createAdminProduct();
    let stopCalled = false;

    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([product])),
    );
    await page.route("**/api/admin/products/11/stop-selling", async (route) => {
      stopCalled = true;
      await route.fallback();
    });
    page.once("dialog", async (dialog) => {
      await dialog.dismiss();
    });

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "販売停止にする" }).click();

    await expect(page.getByText("販売中")).toBeVisible();
    expect(stopCalled).toBe(false);
  });

  test("操作失敗時は対象商品にエラーを表示する", async ({ page }) => {
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([createAdminProduct()])),
    );
    await page.route("**/api/admin/products/11/stop-selling", (route) =>
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

    await page.goto("/admin/products");
    await page.getByRole("button", { name: "販売停止にする" }).click();

    await expect(
      page.getByText("この商品は現在の状態では操作できません。"),
    ).toBeVisible();
    await expect(page.getByText("HHKB Professional")).toBeVisible();
  });

  test("一覧取得失敗時はエラーと再読み込み導線を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "admin product list failed",
        },
      }),
    );

    await page.goto("/admin/products");

    await expect(
      page.getByText("管理者商品一覧を取得できませんでした。"),
    ).toBeVisible();
    await expect(page.getByText("admin product list failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
  });

  test("未ログイン時はreturnTo付きでログインへ遷移する", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(/\/admin\/login\?returnTo=%2Fadmin%2Fproducts$/),
      page.goto("/admin/products"),
    ]);
  });

  test("customerユーザーは権限エラーとして扱う", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 200, customerUserResponse),
    );
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 403, {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "forbidden",
        },
      }),
    );

    await page.goto("/admin/products");

    await expect(
      page.getByText("管理者権限がないため、商品管理画面を表示できません。"),
    ).toBeVisible();
  });

  test("管理者トップから商品管理へ遷移できる", async ({ page }) => {
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([])),
    );

    await page.goto("/admin");
    await page.getByRole("link", { name: "商品管理" }).click();

    await expect(page).toHaveURL(/\/admin\/products$/);
    await expect(page.getByRole("heading", { name: "商品管理" })).toBeVisible();
  });
});
