"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

import { useAuth } from "../../contexts/AuthContext";
import styles from "./AdminHomePage.module.css";

const ADMIN_HOME_RETURN_TO = "/admin";

const activeMenuItems = [
  {
    href: "/admin/reviews",
    label: "レビュー管理",
    description: "投稿レビューの確認、非表示化、再公開を行います。",
  },
] as const;

const plannedMenuItems = [
  {
    label: "商品管理",
    description: "商品情報と販売状態の管理は今後追加予定です。",
  },
  {
    label: "注文管理",
    description: "注文状況の確認と管理は今後追加予定です。",
  },
  {
    label: "ユーザー管理",
    description: "ユーザー状態の確認と管理は今後追加予定です。",
  },
] as const;

export default function AdminHomePage() {
  const router = useRouter();
  const { isLoading, user } = useAuth();
  const isAdmin = user?.roles.includes("admin") ?? false;

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(
        `/admin/login?returnTo=${encodeURIComponent(ADMIN_HOME_RETURN_TO)}`,
      );
    }
  }, [isLoading, router, user]);

  if (isLoading || !user) {
    return (
      <section className={styles.page} aria-labelledby="admin-home-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Admin</p>
          <h1 className={styles.title} id="admin-home-title">
            管理画面
          </h1>
        </div>
        <p className={styles.status} role="status" aria-live="polite">
          認証状態を確認中...
        </p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className={styles.page} aria-labelledby="admin-home-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Admin</p>
          <h1 className={styles.title} id="admin-home-title">
            管理画面
          </h1>
        </div>
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>管理者権限がありません。</p>
          <p className={styles.errorMessage}>
            管理画面を表示するには、管理者アカウントでログインしてください。
          </p>
          <Link className={styles.secondaryLink} href="/products">
            商品一覧へ戻る
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="admin-home-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin</p>
        <h1 className={styles.title} id="admin-home-title">
          管理画面
        </h1>
        <p className={styles.userName}>{user.name}</p>
      </div>

      <nav className={styles.menu} aria-label="管理メニュー">
        {activeMenuItems.map((item) => (
          <Link className={styles.menuItem} href={item.href} key={item.href}>
            <span className={styles.menuLabel}>{item.label}</span>
            <span className={styles.menuDescription}>{item.description}</span>
          </Link>
        ))}

        {plannedMenuItems.map((item) => (
          <div
            className={`${styles.menuItem} ${styles.disabledMenuItem}`}
            aria-disabled="true"
            key={item.label}
          >
            <span className={styles.menuLabel}>{item.label}</span>
            <span className={styles.menuDescription}>{item.description}</span>
            <span className={styles.comingSoon}>Coming soon</span>
          </div>
        ))}
      </nav>
    </section>
  );
}
