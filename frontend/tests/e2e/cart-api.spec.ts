import { expect, test } from "@playwright/test";

test.describe("Cart BFF API", () => {
  test("Cart追加の在庫不足detailsをBrowserへ透過する", async ({ request }) => {
    const registerResponse = await request.post("/api/auth/register", {
      data: {
        name: "Cart BFF User",
        email: `cart-bff-${Date.now()}-${Math.random()}@example.com`,
        password: "secret123",
      },
    });

    expect(registerResponse.status()).toBe(201);

    const addResponse = await request.post("/api/cart/items", {
      data: {
        productId: 1,
        quantity: 999999,
      },
    });
    const json = await addResponse.json();

    expect(addResponse.status()).toBe(409);
    expect(json).toMatchObject({
      data: null,
      error: {
        code: "OUT_OF_STOCK",
        message: "out of stock",
        details: {
          availableQuantity: expect.any(Number),
        },
      },
    });
    expect(json.error.details.availableQuantity).toBeGreaterThanOrEqual(0);
  });
});
