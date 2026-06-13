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

type AdminOrderSummaryFixture = {
  orderId: number;
  orderNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  orderStatus: "ordered" | "canceled";
  totalIncludingTax: number;
  orderedAt: string;
  canceledAt: string | null;
  itemCount: number;
};

type AdminOrderDetailFixture = AdminOrderSummaryFixture & {
  totalExcludingTax: number;
  totalTax: number;
  items: {
    productId: number;
    productName: string;
    productImageUrl: string | null;
    makerName: string | null;
    modelNumber: string | null;
    unitPriceExcludingTax: number;
    taxRate: number;
    unitPriceIncludingTax: number;
    quantity: number;
    subtotalExcludingTax: number;
    subtotalTax: number;
    subtotalIncludingTax: number;
  }[];
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

function createAdminOrder(
  overrides: Partial<AdminOrderSummaryFixture> = {},
): AdminOrderSummaryFixture {
  return {
    orderId: 11,
    orderNumber: "ORD-20260612-AAAAAA",
    userId: 21,
    userName: "Active User",
    userEmail: "active@example.com",
    orderStatus: "ordered",
    totalIncludingTax: 90200,
    orderedAt: "2026-06-12T12:00:00Z",
    canceledAt: null,
    itemCount: 3,
    ...overrides,
  };
}

function createAdminOrderDetail(
  overrides: Partial<AdminOrderDetailFixture> = {},
): AdminOrderDetailFixture {
  return {
    ...createAdminOrder(),
    totalExcludingTax: 82000,
    totalTax: 8200,
    items: [
      {
        productId: 101,
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
        productId: 102,
        productName: "Trackball",
        productImageUrl: null,
        makerName: null,
        modelNumber: null,
        unitPriceExcludingTax: 10000,
        taxRate: 0.1,
        unitPriceIncludingTax: 11000,
        quantity: 1,
        subtotalExcludingTax: 10000,
        subtotalTax: 1000,
        subtotalIncludingTax: 11000,
      },
    ],
    ...overrides,
  };
}

function adminOrderListResponse(orders: AdminOrderSummaryFixture[]) {
  return {
    data: {
      orders,
    },
    error: null,
  };
}

function adminOrderDetailResponse(order: AdminOrderDetailFixture) {
  return {
    data: order,
    error: null,
  };
}

test.describe("管理者注文管理", () => {
  test.beforeEach(async ({ page }) => {
    await mockAdminUser(page);
    await mockHeaderCart(page);
  });

  test("管理者トップから注文管理へ遷移できる", async ({ page }) => {
    await page.route("**/api/admin/orders", (route) =>
      fulfillJson(route, 200, adminOrderListResponse([])),
    );

    await page.goto("/admin");
    await page.getByRole("link", { name: "注文管理" }).click();

    await expect(page).toHaveURL(/\/admin\/orders$/);
    await expect(page.getByRole("heading", { name: "注文管理" })).toBeVisible();
  });

  test("注文一覧にorderedとcanceledの注文者情報を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/orders", (route) =>
      fulfillJson(
        route,
        200,
        adminOrderListResponse([
          createAdminOrder(),
          createAdminOrder({
            orderId: 12,
            orderNumber: "ORD-20260611-BBBBBB",
            userId: 22,
            userName: "Deleted User",
            userEmail: "deleted@example.com",
            orderStatus: "canceled",
            canceledAt: "2026-06-12T15:00:00Z",
            totalIncludingTax: 11000,
            itemCount: 1,
          }),
        ]),
      ),
    );

    await page.goto("/admin/orders");

    await expect(page.getByText("Order #11")).toBeVisible();
    await expect(page.getByText("ORD-20260612-AAAAAA")).toBeVisible();
    await expect(page.getByText("Active User")).toBeVisible();
    await expect(page.getByText("active@example.com")).toBeVisible();
    await expect(page.getByText("注文済み")).toBeVisible();
    await expect(page.getByText("￥90,200")).toBeVisible();
    await expect(page.getByText("未キャンセル")).toBeVisible();
    await expect(page.getByText("Deleted User")).toBeVisible();
    await expect(page.getByText("キャンセル済み")).toBeVisible();
    await expect(page.getByText("￥11,000")).toBeVisible();
    await expect(
      page.getByRole("link", { name: "注文詳細を見る" }).first(),
    ).toHaveAttribute("href", "/admin/orders/11");
  });

  test("注文0件の場合は空状態を表示する", async ({ page }) => {
    await page.route("**/api/admin/orders", (route) =>
      fulfillJson(route, 200, adminOrderListResponse([])),
    );

    await page.goto("/admin/orders");

    await expect(page.getByText("管理対象の注文はありません。")).toBeVisible();
  });

  test("一覧取得失敗時はエラーと再読み込み導線を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/orders", (route) =>
      fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "admin order list failed",
        },
      }),
    );

    await page.goto("/admin/orders");

    await expect(
      page.getByText("管理者注文一覧を取得できませんでした。"),
    ).toBeVisible();
    await expect(page.getByText("admin order list failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
  });

  test("一覧から注文詳細へ遷移できる", async ({ page }) => {
    const order = createAdminOrder();

    await page.route("**/api/admin/orders", (route) =>
      fulfillJson(route, 200, adminOrderListResponse([order])),
    );
    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(route, 200, adminOrderDetailResponse(createAdminOrderDetail())),
    );

    await page.goto("/admin/orders");
    await page.getByRole("link", { name: "注文詳細を見る" }).click();

    await expect(page).toHaveURL(/\/admin\/orders\/11$/);
    await expect(page.getByRole("heading", { name: "注文詳細" })).toBeVisible();
    await expect(page.getByText("HHKB Professional")).toBeVisible();
  });

  test("注文詳細に合計金額と明細スナップショットを表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(route, 200, adminOrderDetailResponse(createAdminOrderDetail())),
    );

    await page.goto("/admin/orders/11");

    await expect(page.getByText("ORD-20260612-AAAAAA")).toBeVisible();
    await expect(page.getByText("Active User")).toBeVisible();
    await expect(page.getByText("active@example.com")).toBeVisible();
    await expect(page.getByText("￥82,000")).toBeVisible();
    await expect(page.getByText("￥8,200")).toBeVisible();
    await expect(page.getByText("￥90,200")).toBeVisible();
    await expect(page.getByText("HHKB Professional")).toBeVisible();
    await expect(page.getByText("PFU")).toBeVisible();
    await expect(page.getByText("PD-KB800")).toBeVisible();
    await expect(page.getByText("Trackball")).toBeVisible();
    await expect(page.getByText("メーカー未設定")).toBeVisible();
    await expect(page.getByText("型番未設定")).toBeVisible();
    await expect(page.getByText("No Image")).toHaveCount(2);
    await expect(
      page.getByRole("button", { name: "注文をキャンセルする" }),
    ).toBeVisible();
  });

  test("存在しない注文IDはNot Found表示になる", async ({ page }) => {
    await page.route("**/api/admin/orders/404", (route) =>
      fulfillJson(route, 404, {
        data: null,
        error: {
          code: "NOT_FOUND",
          message: "order not found",
        },
      }),
    );

    await page.goto("/admin/orders/404");

    await expect(
      page.getByText("注文が見つかりません", { exact: true }),
    ).toBeVisible();
    await expect(
      page.getByRole("link", { name: "注文管理へ戻る" }).first(),
    ).toHaveAttribute("href", "/admin/orders");
  });

  test("詳細取得失敗時はエラーと再読み込み導線を表示する", async ({
    page,
  }) => {
    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(route, 500, {
        data: null,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "admin order detail failed",
        },
      }),
    );

    await page.goto("/admin/orders/11");

    await expect(
      page.getByText("管理者注文詳細を取得できませんでした。"),
    ).toBeVisible();
    await expect(page.getByText("admin order detail failed")).toBeVisible();
    await expect(page.getByRole("button", { name: "再読み込み" })).toBeVisible();
  });

  test("ordered注文をキャンセルできる", async ({ page }) => {
    let cancelCalled = false;

    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(route, 200, adminOrderDetailResponse(createAdminOrderDetail())),
    );
    await page.route("**/api/admin/orders/11/cancel", async (route) => {
      cancelCalled = true;
      await fulfillJson(route, 200, {
        data: {
          orderId: 11,
          orderStatus: "canceled",
          canceledAt: "2026-06-13T12:00:00Z",
        },
        error: null,
      });
    });
    page.once("dialog", async (dialog) => {
      expect(dialog.message()).toContain("この注文をキャンセルしますか？");
      await dialog.accept();
    });

    await page.goto("/admin/orders/11");
    await page.getByRole("button", { name: "注文をキャンセルする" }).click();

    await expect(page.getByText("注文をキャンセルしました。")).toBeVisible();
    await expect(page.getByText("キャンセル済み")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "注文をキャンセルする" }),
    ).toHaveCount(0);
    expect(cancelCalled).toBe(true);
  });

  test("canceled注文にはキャンセルボタンを表示しない", async ({ page }) => {
    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(
        route,
        200,
        adminOrderDetailResponse(
          createAdminOrderDetail({
            orderStatus: "canceled",
            canceledAt: "2026-06-13T12:00:00Z",
          }),
        ),
      ),
    );

    await page.goto("/admin/orders/11");

    await expect(page.getByText("キャンセル済み")).toBeVisible();
    await expect(
      page.getByRole("button", { name: "注文をキャンセルする" }),
    ).toHaveCount(0);
  });

  test("キャンセル確認を取り消した場合はAPIを呼ばない", async ({ page }) => {
    let cancelCalled = false;

    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(route, 200, adminOrderDetailResponse(createAdminOrderDetail())),
    );
    await page.route("**/api/admin/orders/11/cancel", async (route) => {
      cancelCalled = true;
      await route.fallback();
    });
    page.once("dialog", async (dialog) => {
      await dialog.dismiss();
    });

    await page.goto("/admin/orders/11");
    await page.getByRole("button", { name: "注文をキャンセルする" }).click();

    await expect(page.getByText("注文済み")).toBeVisible();
    expect(cancelCalled).toBe(false);
  });

  test("キャンセル失敗時は業務エラーを表示する", async ({ page }) => {
    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(route, 200, adminOrderDetailResponse(createAdminOrderDetail())),
    );
    await page.route("**/api/admin/orders/11/cancel", (route) =>
      fulfillJson(route, 409, {
        data: null,
        error: {
          code: "CONFLICT",
          message: "order cannot be canceled",
        },
      }),
    );
    page.once("dialog", async (dialog) => {
      await dialog.accept();
    });

    await page.goto("/admin/orders/11");
    await page.getByRole("button", { name: "注文をキャンセルする" }).click();

    await expect(
      page.getByText(
        "既にキャンセル済み、または現在の状態ではキャンセルできません。",
      ),
    ).toBeVisible();
  });

  test("未ログイン時は一覧でreturnTo付き管理者ログインへ遷移する", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );
    await page.route("**/api/admin/orders", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(/\/admin\/login\?returnTo=%2Fadmin%2Forders$/),
      page.goto("/admin/orders"),
    ]);
  });

  test("未ログイン時は詳細でreturnTo付き管理者ログインへ遷移する", async ({
    page,
  }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );
    await page.route("**/api/admin/orders/11", (route) =>
      fulfillJson(route, 401, unauthorizedResponse),
    );

    await Promise.all([
      page.waitForURL(/\/admin\/login\?returnTo=%2Fadmin%2Forders%2F11$/),
      page.goto("/admin/orders/11"),
    ]);
  });

  test("customerユーザーは権限エラーとして扱う", async ({ page }) => {
    await page.unroute("**/api/auth/me");
    await page.route("**/api/auth/me", (route) =>
      fulfillJson(route, 200, customerUserResponse),
    );
    await page.route("**/api/admin/orders", (route) =>
      fulfillJson(route, 403, {
        data: null,
        error: {
          code: "FORBIDDEN",
          message: "forbidden",
        },
      }),
    );

    await page.goto("/admin/orders");

    await expect(
      page.getByText("管理者権限がないため、注文管理画面を表示できません。"),
    ).toBeVisible();
  });
});
