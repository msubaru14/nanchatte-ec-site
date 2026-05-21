import styles from "./ProductDetailPage.module.css";

export default function ProductDetailLoading() {
  return (
    <section className={styles.page} aria-label="商品詳細を読み込み中">
      <div className={styles.backLink}>商品一覧へ戻る</div>

      <div className={styles.detailLayout}>
        <div className={styles.skeletonImage} />
        <div className={styles.skeletonContent}>
          <div className={styles.skeletonLineShort} />
          <div className={styles.skeletonLineLarge} />
          <div className={styles.skeletonLineMedium} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonLine} />
          <div className={styles.skeletonButton} />
        </div>
      </div>
    </section>
  );
}
