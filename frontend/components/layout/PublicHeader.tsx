"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

import { ERROR_CODES } from "../../constants/errorCodes";
import { useAuth } from "../../contexts/AuthContext";
import { logout } from "../../features/auth/api";
import { fetchCart } from "../../features/cart/api";
import { onCartUpdated } from "../../features/cart/utils/cartEvents";
import { ApiError } from "../../lib/errors";
import styles from "./PublicHeader.module.css";

export function PublicHeader() {
  const router = useRouter();
  const { isLoading, setUser, user } = useAuth();
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [logoutError, setLogoutError] = useState<string | null>(null);
  const [cartItemCount, setCartItemCount] = useState<number | null>(null);
  const [isCartLoading, setIsCartLoading] = useState(false);
  const [cartRefreshVersion, setCartRefreshVersion] = useState(0);

  useEffect(() => {
    return onCartUpdated(() => {
      setCartRefreshVersion((current) => current + 1);
    });
  }, []);

  useEffect(() => {
    let isCancelled = false;

    if (isLoading || !user) {
      setCartItemCount(null);
      setIsCartLoading(false);
      return;
    }

    const loadCartItemCount = async () => {
      setCartItemCount(null);
      setIsCartLoading(true);

      try {
        const cart = await fetchCart();

        if (!isCancelled) {
          setCartItemCount(
            cart.items.reduce((total, item) => total + item.quantity, 0),
          );
        }
      } catch (error) {
        if (isCancelled) {
          return;
        }

        setCartItemCount(null);

        if (
          error instanceof ApiError &&
          error.code === ERROR_CODES.UNAUTHORIZED
        ) {
          setUser(null);
        }
      } finally {
        if (!isCancelled) {
          setIsCartLoading(false);
        }
      }
    };

    void loadCartItemCount();

    return () => {
      isCancelled = true;
    };
  }, [cartRefreshVersion, isLoading, setUser, user]);

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
              <Link className={styles.cartLink} href="/cart">
                カート
                {isCartLoading ? (
                  <span
                    className={styles.cartCountStatus}
                    aria-label="カート件数を取得中"
                  >
                    ...
                  </span>
                ) : cartItemCount !== null && cartItemCount > 0 ? (
                  <span
                    className={styles.cartCount}
                    aria-label={`カート内の商品数 ${cartItemCount}件`}
                  >
                    {cartItemCount}
                  </span>
                ) : null}
              </Link>
              <Link className={styles.userName} href="/me">
                {user.name}
              </Link>
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
