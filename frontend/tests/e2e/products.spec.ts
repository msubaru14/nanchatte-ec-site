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

  test("shows the seeded product list", async ({ page }) => {
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

  test("keeps product cards responsive without horizontal scrolling", async ({
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
