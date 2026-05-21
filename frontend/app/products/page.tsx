import { fetchProducts } from "../../features/products/api/productsApi";
import { ProductCard } from "../../features/products/components/ProductCard";
import styles from "./ProductsPage.module.css";

export const dynamic = "force-dynamic";

export default async function ProductsPage() {
  const products = await fetchProducts();

  return (
    <section className={styles.page} aria-labelledby="products-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Products</p>
          <h1 className={styles.title} id="products-title">
            商品一覧
          </h1>
        </div>
        <p className={styles.summary}>{products.length}件の商品</p>
      </div>

      {products.length === 0 ? (
        <p className={styles.empty}>表示できる商品はまだありません。</p>
      ) : (
        <div className={styles.grid}>
          {products.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      )}
    </section>
  );
}
