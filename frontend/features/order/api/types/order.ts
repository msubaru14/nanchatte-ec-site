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

export type OrderSummary = {
  orderId: number;
  orderNumber: string;
  orderStatus: "ordered" | "canceled";
  totalIncludingTax: number;
  orderedAt: string;
  itemCount: number;
};

export type OrderList = {
  orders: OrderSummary[];
};

export type OrderDetailItem = {
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
};

export type OrderDetail = {
  orderId: number;
  orderNumber: string;
  orderStatus: "ordered" | "canceled";
  totalExcludingTax: number;
  totalTax: number;
  totalIncludingTax: number;
  orderedAt: string;
  items: OrderDetailItem[];
};
