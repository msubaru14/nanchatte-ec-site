export type OrderCreateItem = {
  productId: number;
  productName: string;
  productImageUrl: string | null;
  quantity: number;
  unitPriceIncludingTax: number;
  subtotalIncludingTax: number;
};

export type OrderCreateResult = {
  orderId: number;
  orderNumber: string;
  totalIncludingTax: number;
  orderedAt: string;
  items: OrderCreateItem[];
};
