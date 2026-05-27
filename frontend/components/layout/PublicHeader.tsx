"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "../../contexts/AuthContext";
import { logout } from "../../features/auth/api";
import { ApiError } from "../../lib/errors";
import styles from "./PublicHeader.module.css";

export function PublicHeader() {
  const router = useRouter();
  const { isLoading, setUser, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);

  const handleLogout = async () => {
    setIsLoggingOut(true);
    setLogoutError(null);

    try {
      await logout();
    } catch (error) {
      setLogoutError(
        error instanceof ApiError
          ? error.message
          : "ログアウト処理に失敗しました。",
      );
    } finally {
      setUser(null);
      setIsLoggingOut(false);
      router.push("/products");
    }
  };

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
          {isLoading ? (
            <span className={styles.authStatus}>認証状態を確認中...</span>
          ) : user ? (
            <>
              <Link href="/cart">カート</Link>
              <span className={styles.userName}>{user.name}</span>
              <button
                className={styles.logoutButton}
                disabled={isLoggingOut}
                onClick={handleLogout}
                type="button"
              >
                {isLoggingOut ? "ログアウト中..." : "ログアウト"}
              </button>
            </>
          ) : (
            <>
              <Link href="/login">ログイン</Link>
              <Link className={styles.registerLink} href="/register">
                ユーザー登録
              </Link>
            </>
          )}
          {logoutError && (
            <span className={styles.logoutError} role="alert">
              {logoutError}
            </span>
          )}
        </nav>
      </div>
    </header>
  );
}
