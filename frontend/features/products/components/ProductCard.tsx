import Link from "next/link";
import type { Product, StockStatus } from "../types/product";
import styles from "./ProductCard.module.css";

type ProductCardProps = {
  product: Product;
};

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const stockStatusLabels: Record<StockStatus, string> = {
  in_stock: "在庫あり",
  low_stock: "残りわずか",
  out_of_stock: "在庫なし",
};

const stockStatusClassNames: Record<StockStatus, string> = {
  in_stock: styles.inStock,
  low_stock: styles.lowStock,
  out_of_stock: styles.outOfStock,
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className={styles.card}>
      <Link className={styles.link} href={`/products/${product.id}`}>
        <div className={styles.imageFrame}>
          {product.imageUrl ? (
            <img className={styles.image} src={product.imageUrl} alt="" />
          ) : (
            <div className={styles.placeholder}>No Image</div>
          )}
        </div>
        <div className={styles.body}>
          <div className={styles.badgeRow}>
            <span className={styles.category}>{product.category.name}</span>
            <span
              className={`${styles.stock} ${stockStatusClassNames[product.stockStatus]}`}
            >
              {stockStatusLabels[product.stockStatus]}
            </span>
          </div>
          <h2 className={styles.name}>{product.name}</h2>
          <p className={styles.maker}>
            {product.makerName ?? product.modelNumber ?? "メーカー未設定"}
          </p>
          <p className={styles.price}>
            {priceFormatter.format(product.priceIncludingTax)}
          </p>
        </div>
      </Link>
    </article>
  );
}
