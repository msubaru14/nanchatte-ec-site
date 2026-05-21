import styles from "./ProductsPage.module.css";

const skeletonItems = Array.from({ length: 4 }, (_, index) => index);

export default function ProductsLoading() {
  return (
    <section className={styles.page} aria-labelledby="products-loading-title">
      <div className={styles.header}>
        <div>
          <p className={styles.eyebrow}>Products</p>
          <h1 className={styles.title} id="products-loading-title">
            商品一覧
          </h1>
        </div>
        <p className={styles.summary}>読み込み中</p>
      </div>

      <div className={styles.grid} aria-label="商品一覧を読み込み中">
        {skeletonItems.map((item) => (
          <div className={styles.skeletonCard} key={item}>
            <div className={styles.skeletonImage} />
            <div className={styles.skeletonBody}>
              <div className={styles.skeletonLineShort} />
              <div className={styles.skeletonLine} />
              <div className={styles.skeletonLineTiny} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
