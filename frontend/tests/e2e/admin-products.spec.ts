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

function adminProductResponse(product: AdminProductFixture) {
  return {
    data: product,
    error: null,
  };
}

async function fillAdminProductForm(
  page: Page,
  values: {
    name: string;
    description?: string;
    price: string;
    taxRateId: string;
    categoryId: string;
    stockQuantity: string;
    lowStockThreshold: string;
    status?: "販売中" | "販売停止";
  },
) {
  await page.getByLabel("商品名").fill(values.name);
  await page.getByLabel("説明").fill(values.description ?? "");
  await page.getByLabel("価格").fill(values.price);
  await page.getByLabel("Tax Rate ID").fill(values.taxRateId);
  await page.getByLabel("Category ID").fill(values.categoryId);
  await page.getByLabel("在庫数").fill(values.stockQuantity);
  await page.getByLabel("低在庫しきい値").fill(values.lowStockThreshold);

  if (values.status) {
    await page.getByLabel(values.status).check();
  }
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
      page.getByRole("link", { name: "商品を登録する" }),
    ).toHaveAttribute("href", "/admin/products/new");
    await expect(page.getByRole("link", { name: "編集" })).toHaveCount(3);
    await expect(page.getByRole("link", { name: "編集" }).first()).toHaveAttribute(
      "href",
      "/admin/products/11/edit",
    );
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

  test("一覧から商品登録画面へ遷移できる", async ({ page }) => {
    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([])),
    );

    await page.goto("/admin/products");
    await page.getByRole("link", { name: "商品を登録する" }).click();

    await expect(page).toHaveURL(/\/admin\/products\/new$/);
    await expect(page.getByRole("heading", { name: "商品登録" })).toBeVisible();
    await expect(page.getByRole("radio", { name: "販売中" })).toBeChecked();
  });

  test("一覧から商品編集画面へ遷移できる", async ({ page }) => {
    const product = createAdminProduct();

    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([product])),
    );
    await page.route("**/api/admin/products/11", (route) =>
      fulfillJson(route, 200, adminProductResponse(product)),
    );

    await page.goto("/admin/products");
    await page.getByRole("link", { name: "編集" }).click();

    await expect(page).toHaveURL(/\/admin\/products\/11\/edit$/);
    await expect(page.getByRole("heading", { name: "商品編集" })).toBeVisible();
    await expect(page.getByLabel("商品名")).toHaveValue("HHKB Professional");
  });

  test("adminユーザーが商品登録できる", async ({ page }) => {
    let requestBody: unknown = null;

    await page.route("**/api/admin/products", async (route) => {
      if (route.request().method() === "POST") {
        requestBody = route.request().postDataJSON();
        await fulfillJson(
          route,
          201,
          adminProductResponse(
            createAdminProduct({
              productId: 21,
              name: "New Keyboard",
              description: null,
              price: 42000,
              stockQuantity: 0,
              lowStockThreshold: 0,
              status: "stopped",
            }),
          ),
        );
        return;
      }

      await fulfillJson(route, 200, adminProductListResponse([]));
    });

    await page.goto("/admin/products/new");
    await fillAdminProductForm(page, {
      name: "New Keyboard",
      price: "42000",
      taxRateId: "1",
      categoryId: "2",
      stockQuantity: "0",
      lowStockThreshold: "0",
      status: "販売停止",
    });
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(page).toHaveURL(/\/admin\/products\?message=created$/);
    await expect(page.getByText("商品を登録しました。")).toBeVisible();
    expect(requestBody).toEqual({
      name: "New Keyboard",
      description: null,
      price: 42000,
      taxRateId: 1,
      categoryId: 2,
      stockQuantity: 0,
      lowStockThreshold: 0,
      status: "stopped",
    });
  });

  test("adminユーザーが商品編集できる", async ({ page }) => {
    const product = createAdminProduct();
    let requestBody: unknown = null;

    await page.route("**/api/admin/products", (route) =>
      fulfillJson(route, 200, adminProductListResponse([product])),
    );
    await page.route("**/api/admin/products/11", async (route) => {
      if (route.request().method() === "PATCH") {
        requestBody = route.request().postDataJSON();
        await fulfillJson(
          route,
          200,
          adminProductResponse(
            createAdminProduct({
              name: "Updated Keyboard",
              description: null,
              price: 41000,
              stockQuantity: 0,
              lowStockThreshold: 0,
            }),
          ),
        );
        return;
      }

      await fulfillJson(route, 200, adminProductResponse(product));
    });

    await page.goto("/admin/products/11/edit");
    await expect(page.getByLabel("商品名")).toHaveValue("HHKB Professional");
    await expect(page.getByRole("radio")).toHaveCount(0);

    await fillAdminProductForm(page, {
      name: "Updated Keyboard",
      price: "41000",
      taxRateId: "1",
      categoryId: "2",
      stockQuantity: "0",
      lowStockThreshold: "0",
    });
    await page.getByRole("button", { name: "保存する" }).click();

    await expect(page).toHaveURL(/\/admin\/products\?message=updated$/);
    await expect(page.getByText("商品を保存しました。")).toBeVisible();
    expect(requestBody).toEqual({
      name: "Updated Keyboard",
      description: null,
      price: 41000,
      taxRateId: 1,
      categoryId: 2,
      stockQuantity: 0,
      lowStockThreshold: 0,
    });
  });

  test("商品登録時にvalidation errorを表示する", async ({ page }) => {
    await page.route("**/api/admin/products", async (route) => {
      if (route.request().method() === "POST") {
        await fulfillJson(route, 400, {
          data: null,
          error: {
            code: "VALIDATION_ERROR",
            message: "validation error",
            details: [
              {
                field: "name",
                message: "商品名は必須です。",
              },
            ],
          },
        });
        return;
      }

      await fulfillJson(route, 200, adminProductListResponse([]));
    });

    await page.goto("/admin/products/new");
    await fillAdminProductForm(page, {
      name: "Invalid Product",
      price: "1000",
      taxRateId: "1",
      categoryId: "1",
      stockQuantity: "1",
      lowStockThreshold: "0",
    });
    await page.getByRole("button", { name: "登録する" }).click();

    await expect(page.getByText("商品名は必須です。")).toHaveCount(2);
    await expect(page.getByRole("heading", { name: "商品登録" })).toBeVisible();
  });

  test("商品編集画面で商品取得失敗時は再読み込み導線を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/products/11", (route) =>
      fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "admin product detail failed",
        },
      }),
    );

    await page.goto("/admin/products/11/edit");

    await expect(page.getByText("商品を取得できませんでした。")).toBeVisible();
    await expect(page.getByText("admin product detail failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
  });

  test("存在しない商品IDではNot Found表示になる", async ({ page }) => {
    await page.route("**/api/admin/products/404", (route) =>
      fulfillJson(route, 404, {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "product not found",
        },
      }),
    );

    await page.goto("/admin/products/404/edit");

    await expect(page.getByText("商品が見つかりません。")).toBeVisible();
    await expect(page.getByText("対象商品が見つかりませんでした。")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "再読み込み" }),
    ).toHaveCount(0);
  });

  test("商品登録画面の未ログイン時はreturnTo付きでログインへ遷移する", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(
        /\/admin\/login\?returnTo=%2Fadmin%2Fproducts%2Fnew$/,
      ),
      page.goto("/admin/products/new"),
    ]);
  });

  test("商品編集画面の未ログイン時はreturnTo付きでログインへ遷移する", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(
        /\/admin\/login\?returnTo=%2Fadmin%2Fproducts%2F11%2Fedit$/,
      ),
      page.goto("/admin/products/11/edit"),
    ]);
  });

  test("customerユーザーは商品登録画面で権限エラーになる", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 200, customerUserResponse),
    );

    await page.goto("/admin/products/new");

    await expect(page.getByText("管理者権限がありません。")).toBeVisible();
    await expect(
      page.getByText(
        "商品を登録するには、管理者アカウントでログインしてください。",
      ),
    ).toBeVisible();
  });

  test("customerユーザーは商品編集画面で権限エラーになる", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 200, customerUserResponse),
    );

    await page.goto("/admin/products/11/edit");

    await expect(page.getByText("管理者権限がありません。")).toBeVisible();
    await expect(
      page.getByText(
        "商品を編集するには、管理者アカウントでログインしてください。",
      ),
    ).toBeVisible();
  });
});
