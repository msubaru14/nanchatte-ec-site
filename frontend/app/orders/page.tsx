"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../constants/errorCodes";
import { useAuth } from "../../contexts/AuthContext";
import { fetchOrders } from "../../features/order/api";
import type { OrderList, OrderSummary } from "../../features/order/api";
import { ApiError } from "../../lib/errors";
import styles from "./OrdersPage.module.css";

const ORDERS_RETURN_TO = "/orders";

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const orderStatusLabels: Record<OrderSummary["orderStatus"], string> = {
  ordered: "注文済み",
  canceled: "キャンセル済み",
};

const formatOrderedAt = (orderedAt: string) => {
  const date = new Date(orderedAt);

  if (Number.isNaN(date.getTime())) {
    return orderedAt;
  }

  return dateTimeFormatter.format(date);
};

export default function OrdersPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [orders, setOrders] = useState<OrderList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(`/login?returnTo=${encodeURIComponent(ORDERS_RETURN_TO)}`);
  }, [router, setUser]);

  const loadOrders = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextOrders = await fetchOrders();
      setOrders(nextOrders);
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setOrders(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "注文履歴を取得できませんでした。",
      );
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadOrders();
  }, [loadOrders]);

  return (
    <section className={styles.page} aria-labelledby="orders-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Order history</p>
        <h1 className={styles.title} id="orders-title">
          注文履歴
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          注文履歴を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>注文履歴を取得できませんでした。</p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} type="button" onClick={loadOrders}>
            再読み込み
          </button>
        </div>
      ) : orders && orders.orders.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>注文履歴はまだありません。</p>
          <Link className={styles.primaryLink} href="/products">
            商品を探す
          </Link>
        </div>
      ) : orders ? (
        <ul className={styles.orderList}>
          {orders.orders.map((order) => (
            <li className={styles.orderItem} key={order.orderId}>
              <div className={styles.orderMain}>
                <div className={styles.orderHeading}>
                  <h2 className={styles.orderNumber}>{order.orderNumber}</h2>
                  <span className={styles.statusBadge}>
                    {orderStatusLabels[order.orderStatus]}
                  </span>
                </div>
                <dl className={styles.orderMeta}>
                  <div>
                    <dt>注文日時</dt>
                    <dd>{formatOrderedAt(order.orderedAt)}</dd>
                  </div>
                  <div>
                    <dt>商品数</dt>
                    <dd>{order.itemCount}点</dd>
                  </div>
                  <div>
                    <dt>合計金額</dt>
                    <dd>{priceFormatter.format(order.totalIncludingTax)}</dd>
                  </div>
                </dl>
              </div>
              <Link className={styles.detailLink} href={`/orders/${order.orderId}`}>
                詳細を見る
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
