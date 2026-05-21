export type ProductStatus = "active" | "stopped";

export type StockStatus = "in_stock" | "low_stock" | "out_of_stock";

export type ProductCategory = {
  id: number;
  name: string;
};

export type Product = {
  id: number;
  name: string;
  description: string | null;
  priceIncludingTax: number;
  category: ProductCategory;
  status: ProductStatus;
  stockStatus: StockStatus;
  imageUrl: string | null;
  releasedAt: string | null;
  makerName: string | null;
  modelNumber: string | null;
};
