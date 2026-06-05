"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "../../contexts/AuthContext";
import styles from "./MyPage.module.css";

const MY_PAGE_RETURN_TO = "/me";

const menuItems = [
  {
    href: "/orders",
    label: "注文履歴",
    description: "これまでの注文内容と注文詳細を確認できます。",
  },
  {
    href: "/me/reviews",
    label: "自分のレビュー",
    description: "投稿したレビューの状態や内容を確認できます。",
  },
] as const;

export default function MyPage() {
  const router = useRouter();
  const { isLoading, user } = useAuth();

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(`/login?returnTo=${encodeURIComponent(MY_PAGE_RETURN_TO)}`);
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <section className={styles.page} aria-labelledby="my-page-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>My page</p>
          <h1 className={styles.title} id="my-page-title">
            マイページ
          </h1>
        </div>
        <p className={styles.status} role="status" aria-live="polite">
          認証状態を確認中...
        </p>
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="my-page-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>My page</p>
        <h1 className={styles.title} id="my-page-title">
          マイページ
        </h1>
        <p className={styles.userName}>{user.name}</p>
      </div>

      <nav className={styles.menu} aria-label="マイページメニュー">
        {menuItems.map((item) => (
          <Link className={styles.menuItem} href={item.href} key={item.href}>
            <span className={styles.menuLabel}>{item.label}</span>
            <span className={styles.menuDescription}>{item.description}</span>
          </Link>
        ))}
      </nav>
    </section>
  );
}
