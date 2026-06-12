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

export type AdminOrderSummary = {
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

export type AdminOrderList = {
  orders: AdminOrderSummary[];
};

export type AdminOrderDetail = {
  orderId: number;
  orderNumber: string;
  userId: number;
  userName: string;
  userEmail: string;
  orderStatus: "ordered" | "canceled";
  totalExcludingTax: number;
  totalTax: number;
  totalIncludingTax: number;
  orderedAt: string;
  canceledAt: string | null;
  items: OrderDetailItem[];
};

export type AdminOrderCancelResult = {
  orderId: number;
  orderStatus: "canceled";
  canceledAt: string;
};
