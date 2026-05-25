import { expect, type Page, test } from "@playwright/test";

const stockStatusPattern = /在庫あり|残りわずか|在庫なし/;

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
    await expect(cartArea.getByText("数量: 1")).toBeVisible();
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
    await expect(cartArea.getByText("数量: 1")).toBeVisible();
    await expect(cartArea.getByRole("button", { name: "在庫なし" })).toBeDisabled();
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
