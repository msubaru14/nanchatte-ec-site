"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../constants/errorCodes";
import { useAuth } from "../../contexts/AuthContext";
import { fetchCart } from "../../features/cart/api";
import type { Cart, CartStockStatus } from "../../features/cart/api";
import { ApiError } from "../../lib/errors";
import styles from "./CartPage.module.css";

const CART_RETURN_TO = "/cart";

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const stockStatusLabels: Record<CartStockStatus, string> = {
  in_stock: "在庫あり",
  low_stock: "残りわずか",
  out_of_stock: "在庫なし",
};

const stockStatusClassNames: Record<CartStockStatus, string> = {
  in_stock: styles.inStock,
  low_stock: styles.lowStock,
  out_of_stock: styles.outOfStock,
};

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
        cart.items.length === 0 ? (
          <p className={styles.empty}>カートに商品がありません。</p>
        ) : (
          <div className={styles.cartLayout}>
            <ul className={styles.itemList}>
              {cart.items.map((item) => (
                <li className={styles.item} key={item.productId}>
                  <div className={styles.imageFrame}>
                    {item.imageUrl ? (
                      <img className={styles.image} src={item.imageUrl} alt={item.name} />
                    ) : (
                      <span className={styles.placeholder}>No Image</span>
                    )}
                  </div>

                  <div className={styles.itemBody}>
                    <div className={styles.itemHeader}>
                      <h2 className={styles.itemName}>{item.name}</h2>
                      <span
                        className={`${styles.stock} ${stockStatusClassNames[item.stockStatus]}`}
                      >
                        {stockStatusLabels[item.stockStatus]}
                      </span>
                    </div>
                    <p className={styles.price}>
                      {priceFormatter.format(item.priceIncludingTax)}
                      <span className={styles.taxLabel}>(税込)</span>
                    </p>
                    <p className={styles.quantity}>数量: {item.quantity}</p>
                    {!item.canBePurchased && (
                      <p className={styles.unavailable}>
                        この商品は現在購入できません。
                      </p>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <aside className={styles.summary} aria-label="カート合計">
              <p className={styles.summaryLabel}>合計金額</p>
              <p className={styles.total}>{priceFormatter.format(cart.totalAmount)}</p>
              <p className={styles.summaryNote}>税込</p>
            </aside>
          </div>
        )
      ) : null}
    </section>
  );
}
