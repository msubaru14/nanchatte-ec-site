import Link from "next/link";
import styles from "./PublicHeader.module.css";

export function PublicHeader() {
  return (
    <header className={styles.header}>
      <div className={styles.inner}>
        <Link className={styles.brand} href="/">
          <span className={styles.brandMark} aria-hidden="true">
            G
          </span>
          なんちゃってECサイト
        </Link>
        <nav className={styles.nav} aria-label="公開画面ナビゲーション">
          <Link href="/products">商品一覧</Link>
          <Link href="/login">Login</Link>
          <Link className={styles.registerLink} href="/register">
            Register
          </Link>
        </nav>
      </div>
    </header>
  );
}
