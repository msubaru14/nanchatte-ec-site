"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchAdminOrders } from "../../../features/order/api";
import type {
  AdminOrderList,
  AdminOrderSummary,
} from "../../../features/order/api";
import { ApiError } from "../../../lib/errors";
import styles from "./AdminOrdersPage.module.css";

const ADMIN_ORDERS_RETURN_TO = "/admin/orders";

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const orderStatusLabels: Record<AdminOrderSummary["orderStatus"], string> = {
  ordered: "注文済み",
  canceled: "キャンセル済み",
};

const formatDateTime = (value: string | null) => {
  if (!value) {
    return "未キャンセル";
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
};

const getAdminOrderListErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "管理者注文一覧を取得できませんでした。";
  }

  if (error.code === ERROR_CODES.FORBIDDEN) {
    return "管理者権限がないため、注文管理画面を表示できません。";
  }

  return error.message;
};

export default function AdminOrdersPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [orderList, setOrderList] = useState<AdminOrderList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(
      `/admin/login?returnTo=${encodeURIComponent(ADMIN_ORDERS_RETURN_TO)}`,
    );
  }, [router, setUser]);

  const loadOrders = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);

    try {
      const nextOrderList = await fetchAdminOrders();
      setOrderList(nextOrderList);
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setOrderList(null);
      setErrorMessage(getAdminOrderListErrorMessage(error));
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
    <section className={styles.page} aria-labelledby="admin-orders-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin orders</p>
        <h1 className={styles.title} id="admin-orders-title">
          注文管理
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          管理者注文一覧を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>
            管理者注文一覧を取得できませんでした。
          </p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button
            className={styles.retryButton}
            type="button"
            onClick={loadOrders}
          >
            再読み込み
          </button>
        </div>
      ) : orderList && orderList.orders.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>管理対象の注文はありません。</p>
        </div>
      ) : orderList ? (
        <ul className={styles.orderList}>
          {orderList.orders.map((order) => (
            <li className={styles.orderItem} key={order.orderId}>
              <div className={styles.orderSummary}>
                <div className={styles.orderHeading}>
                  <div className={styles.orderIdentity}>
                    <p className={styles.orderId}>Order #{order.orderId}</p>
                    <h2 className={styles.orderNumber}>{order.orderNumber}</h2>
                  </div>
                  <span
                    className={`${styles.statusBadge} ${
                      styles[`status-${order.orderStatus}`]
                    }`}
                  >
                    {orderStatusLabels[order.orderStatus]}
                  </span>
                </div>

                <dl className={styles.orderMeta}>
                  <div>
                    <dt>User ID</dt>
                    <dd>{order.userId}</dd>
                  </div>
                  <div>
                    <dt>注文者</dt>
                    <dd>{order.userName}</dd>
                  </div>
                  <div>
                    <dt>Email</dt>
                    <dd>{order.userEmail}</dd>
                  </div>
                  <div>
                    <dt>税込合計</dt>
                    <dd>{priceFormatter.format(order.totalIncludingTax)}</dd>
                  </div>
                  <div>
                    <dt>注文日時</dt>
                    <dd>{formatDateTime(order.orderedAt)}</dd>
                  </div>
                  <div>
                    <dt>キャンセル日時</dt>
                    <dd>{formatDateTime(order.canceledAt)}</dd>
                  </div>
                  <div>
                    <dt>商品数</dt>
                    <dd>{order.itemCount}点</dd>
                  </div>
                </dl>
              </div>

              <div className={styles.orderActions}>
                <Link
                  className={styles.detailLink}
                  href={`/admin/orders/${order.orderId}`}
                >
                  注文詳細を見る
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
