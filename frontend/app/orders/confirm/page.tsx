"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchCart } from "../../../features/cart/api";
import type { Cart, CartItem, CartStockStatus } from "../../../features/cart/api";
import { ApiError } from "../../../lib/errors";
import styles from "./OrderConfirmPage.module.css";

const ORDER_CONFIRM_RETURN_TO = "/orders/confirm";

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

const hasUnavailableItem = (items: CartItem[]) => {
  return items.some((item) => !item.canBePurchased);
};

export default function OrderConfirmPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(`/login?returnTo=${encodeURIComponent(ORDER_CONFIRM_RETURN_TO)}`);
  }, [router, setUser]);

  const loadCart = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      setCart(await fetchCart());
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setCart(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "注文内容を取得できませんでした。",
      );
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const isCartEmpty = cart?.items.length === 0;
  const includesUnavailableItem = cart ? hasUnavailableItem(cart.items) : false;

  return (
    <section className={styles.page} aria-labelledby="order-confirm-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Order confirmation</p>
        <h1 className={styles.title} id="order-confirm-title">
          注文確認
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          注文内容を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>注文内容を取得できませんでした。</p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} type="button" onClick={loadCart}>
            再読み込み
          </button>
        </div>
      ) : cart ? (
        isCartEmpty ? (
          <div className={styles.empty}>
            <p className={styles.emptyMessage}>カートに商品がありません。</p>
            <Link className={styles.primaryLink} href="/products">
              商品を探す
            </Link>
          </div>
        ) : (
          <div className={styles.confirmLayout}>
            <div className={styles.itemsArea}>
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

                      <dl className={styles.itemMeta}>
                        <div className={styles.metaRow}>
                          <dt>単価</dt>
                          <dd>{priceFormatter.format(item.priceIncludingTax)}</dd>
                        </div>
                        <div className={styles.metaRow}>
                          <dt>数量</dt>
                          <dd>{item.quantity}</dd>
                        </div>
                        <div className={styles.metaRow}>
                          <dt>小計</dt>
                          <dd>
                            {priceFormatter.format(
                              item.priceIncludingTax * item.quantity,
                            )}
                          </dd>
                        </div>
                      </dl>

                      {!item.canBePurchased && (
                        <p className={styles.unavailable} role="alert">
                          この商品は現在購入できません。カートで内容を確認してください。
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>

            <aside className={styles.summary} aria-label="注文合計">
              <p className={styles.summaryLabel}>合計金額</p>
              <p className={styles.total}>{priceFormatter.format(cart.totalAmount)}</p>
              <p className={styles.summaryNote}>税込</p>
              {includesUnavailableItem && (
                <p className={styles.summaryAlert} role="alert">
                  購入できない商品が含まれています。カートで内容を確認してください。
                </p>
              )}
              <Link className={styles.secondaryLink} href="/cart">
                カートに戻る
              </Link>
            </aside>
          </div>
        )
      ) : null}
    </section>
  );
}
