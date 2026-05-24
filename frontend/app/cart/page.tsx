"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../constants/errorCodes";
import { useAuth } from "../../contexts/AuthContext";
import { fetchCart } from "../../features/cart/api";
import type { Cart } from "../../features/cart/api";
import { ApiError } from "../../lib/errors";
import styles from "./CartPage.module.css";

const CART_RETURN_TO = "/cart";

export default function CartPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const loadCart = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      setCart(await fetchCart());
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        setUser(null);
        router.replace(`/login?returnTo=${encodeURIComponent(CART_RETURN_TO)}`);
        return;
      }

      setCart(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "カート情報を取得できませんでした。",
      );
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [router, setUser]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  return (
    <section className={styles.page} aria-labelledby="cart-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Cart</p>
        <h1 className={styles.title} id="cart-title">
          カート
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} aria-live="polite">
          カート情報を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>カート情報を取得できませんでした。</p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} type="button" onClick={loadCart}>
            再読み込み
          </button>
        </div>
      ) : cart ? (
        <p className={styles.status}>カート情報を取得しました。</p>
      ) : null}
    </section>
  );
}
