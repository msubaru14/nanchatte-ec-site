import Link from "next/link";
import { notFound } from "next/navigation";
import { ERROR_CODES } from "../../../constants/errorCodes";
import { fetchProductDetail } from "../../../features/products/api/productsApi";
import type { Product, StockStatus } from "../../../features/products/types/product";
import { ApiError } from "../../../lib/errors";
import ProductCartAction from "./ProductCartAction";
import styles from "./ProductDetailPage.module.css";

type ProductDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
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

const formatReleasedAt = (releasedAt: string) => {
  const [year, month, day] = releasedAt.split("-");

  return `${year}年${Number(month)}月${Number(day)}日`;
};

async function getProductDetail(productId: string): Promise<Product> {
  try {
    return await fetchProductDetail(productId);
  } catch (error) {
    if (error instanceof ApiError && error.code === ERROR_CODES.NOT_FOUND) {
      notFound();
    }

    throw error;
  }
}

export default async function ProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { id } = await params;
  const product = await getProductDetail(id);

  const isOutOfStock = product.stockStatus === "out_of_stock";

  return (
    <section className={styles.page} aria-labelledby="product-detail-title">
      <Link className={styles.backLink} href="/products">
        商品一覧へ戻る
      </Link>

      <div className={styles.detailLayout}>
        <div className={styles.imageFrame}>
          {product.imageUrl ? (
            <img className={styles.image} src={product.imageUrl} alt={product.name} />
          ) : (
            <div className={styles.placeholder}>No Image</div>
          )}
        </div>

        <div className={styles.content}>
          <div className={styles.badgeRow}>
            <span className={styles.category}>{product.category.name}</span>
            <span
              className={`${styles.stock} ${stockStatusClassNames[product.stockStatus]}`}
            >
              {stockStatusLabels[product.stockStatus]}
            </span>
          </div>

          <h1 className={styles.title} id="product-detail-title">
            {product.name}
          </h1>

          <p className={styles.price}>
            {priceFormatter.format(product.priceIncludingTax)}
            <span className={styles.taxLabel}>(税込)</span>
          </p>

          <ProductCartAction
            isOutOfStock={isOutOfStock}
            productId={product.id}
            productName={product.name}
          />

          <dl className={styles.metaList}>
            <div className={styles.metaItem}>
              <dt>メーカー</dt>
              <dd>{product.makerName ?? "メーカー未設定"}</dd>
            </div>
            {product.modelNumber ? (
              <div className={styles.metaItem}>
                <dt>型番</dt>
                <dd>{product.modelNumber}</dd>
              </div>
            ) : null}
            {product.releasedAt ? (
              <div className={styles.metaItem}>
                <dt>発売日</dt>
                <dd>{formatReleasedAt(product.releasedAt)}</dd>
              </div>
            ) : null}
          </dl>

          <div className={styles.descriptionBlock}>
            <h2 className={styles.sectionTitle}>商品説明</h2>
            <p className={styles.description}>
              {product.description ?? "商品説明はありません"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
