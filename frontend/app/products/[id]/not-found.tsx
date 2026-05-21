import Link from "next/link";
import styles from "./ProductDetailPage.module.css";

export default function ProductDetailNotFound() {
  return (
    <section className={styles.page} aria-labelledby="product-not-found-title">
      <Link className={styles.backLink} href="/products">
        商品一覧へ戻る
      </Link>

      <div className={styles.notFoundPanel}>
        <h1 className={styles.notFoundTitle} id="product-not-found-title">
          商品が見つかりませんでした
        </h1>
        <p className={styles.notFoundMessage}>
          指定された商品は存在しないか、現在は公開されていません。
        </p>
      </div>
    </section>
  );
}
