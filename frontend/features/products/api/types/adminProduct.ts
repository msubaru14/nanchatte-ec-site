export type AdminProductStatus = "active" | "stopped";

export type AdminProduct = {
  productId: number;
  name: string;
  description: string | null;
  price: number;
  taxRateId: number;
  taxRate: number;
  categoryId: number;
  stockQuantity: number;
  lowStockThreshold: number;
  status: AdminProductStatus;
  createdAt: string;
  updatedAt: string;
};

export type AdminProductList = {
  products: AdminProduct[];
};

export type AdminProductCreateInput = {
  name: string;
  description: string | null;
  price: number;
  taxRateId: number;
  categoryId: number;
  stockQuantity: number;
  lowStockThreshold: number;
  status: AdminProductStatus;
};

export type AdminProductUpdateInput = {
  name?: string;
  description?: string | null;
  price?: number;
  taxRateId?: number;
  categoryId?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
};
