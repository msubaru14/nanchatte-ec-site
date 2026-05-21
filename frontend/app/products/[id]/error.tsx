"use client";

import Link from "next/link";
import styles from "./ProductDetailPage.module.css";

type ProductDetailErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ProductDetailError({
  error,
  reset,
}: ProductDetailErrorProps) {
  return (
    <section className={styles.page} aria-labelledby="product-error-title">
      <Link className={styles.backLink} href="/products">
        商品一覧へ戻る
      </Link>

      <div className={styles.errorPanel} role="alert">
        <h1 className={styles.errorTitle} id="product-error-title">
          商品情報を取得できませんでした
        </h1>
        <p className={styles.errorMessage}>{error.message}</p>
        <button className={styles.retryButton} type="button" onClick={reset}>
          再読み込み
        </button>
      </div>
    </section>
  );
}
