"use client";

import styles from "./ProductsPage.module.css";

type ProductsErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProductsError({ error, reset }: ProductsErrorProps) {
  return (
    <section className={styles.page} aria-labelledby="products-error-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Products</p>
          <h1 className={styles.title} id="products-error-title">
            商品一覧
          </h1>
        </div>
      </div>

      <div className={styles.errorPanel} role="alert">
        <p className={styles.errorTitle}>商品一覧を取得できませんでした。</p>
        <p className={styles.errorMessage}>{error.message}</p>
        <button className={styles.retryButton} type="button" onClick={reset}>
          再読み込み
        </button>
      </div>
    </section>
  );
}
