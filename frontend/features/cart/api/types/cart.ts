export type CartStockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type CartItem = {
  productId: number;
  name: string;
  imageUrl: string | null;
  priceIncludingTax: number;
  stockStatus: CartStockStatus;
  quantity: number;
  canBePurchased: boolean;
};

export type Cart = {
  items: CartItem[];
  totalAmount: number;
};

export type CartMessage = {
  message: string;
};

export type AddCartItemInput = {
  productId: number;
  quantity: number;
};
