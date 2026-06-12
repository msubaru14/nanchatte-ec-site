"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../../constants/errorCodes";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  cancelAdminOrder,
  fetchAdminOrderDetail,
} from "../../../../features/order/api";
import type { AdminOrderDetail } from "../../../../features/order/api";
import { ApiError } from "../../../../lib/errors";
import styles from "./AdminOrderDetailPage.module.css";

type AdminOrderDetailPageProps = {
  params: Promise<{
    id: string;
  }>;
};

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ja-JP", {
  style: "percent",
  maximumFractionDigits: 1,
});

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const orderStatusLabels: Record<AdminOrderDetail["orderStatus"], string> = {
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

const getCancelErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "注文をキャンセルできませんでした。";
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return "対象注文が見つかりませんでした。";
  }

  if (error.code === ERROR_CODES.CONFLICT) {
    return "既にキャンセル済み、または現在の状態ではキャンセルできません。";
  }

  if (error.code === ERROR_CODES.FORBIDDEN) {
    return "管理者権限がないため、注文をキャンセルできません。";
  }

  return error.message;
};

export default function AdminOrderDetailPage({
  params,
}: AdminOrderDetailPageProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<AdminOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCanceling, setIsCanceling] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [invalidRequestMessage, setInvalidRequestMessage] = useState<
    string | null
  >(null);
  const [cancelFeedback, setCancelFeedback] = useState<{
    kind: "error" | "success";
    message: string;
  } | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadParams = async () => {
      const { id } = await params;

      if (!isCancelled) {
        setOrderId(id);
      }
    };

    void loadParams();

    return () => {
      isCancelled = true;
    };
  }, [params]);

  const redirectToLogin = useCallback(
    (id: string) => {
      setUser(null);
      router.replace(
        `/admin/login?returnTo=${encodeURIComponent(`/admin/orders/${id}`)}`,
      );
    },
    [router, setUser],
  );

  const loadOrder = useCallback(async () => {
    if (!orderId) {
      return;
    }

    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);
    setNotFoundMessage(null);
    setInvalidRequestMessage(null);
    setCancelFeedback(null);

    try {
      const nextOrder = await fetchAdminOrderDetail(orderId);
      setOrder(nextOrder);
    } catch (error) {
      setOrder(null);

      if (error instanceof ApiError) {
        if (error.code === ERROR_CODES.UNAUTHORIZED) {
          isRedirectingToLogin = true;
          redirectToLogin(orderId);
          return;
        }
        if (error.code === ERROR_CODES.NOT_FOUND) {
          setNotFoundMessage("注文が見つかりませんでした。");
          return;
        }
        if (error.code === ERROR_CODES.INVALID_REQUEST) {
          setInvalidRequestMessage("不正な注文IDです。");
          return;
        }
        if (error.code === ERROR_CODES.FORBIDDEN) {
          setErrorMessage(
            "管理者権限がないため、注文詳細画面を表示できません。",
          );
          return;
        }

        setErrorMessage(error.message);
        return;
      }

      setErrorMessage("管理者注文詳細を取得できませんでした。");
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [orderId, redirectToLogin]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  const handleCancelOrder = async () => {
    if (!order || !orderId || isCanceling) {
      return;
    }

    const shouldCancel = window.confirm("この注文をキャンセルしますか？");

    if (!shouldCancel) {
      return;
    }

    setIsCanceling(true);
    setCancelFeedback(null);

    try {
      const result = await cancelAdminOrder(order.orderId);
      setOrder({
        ...order,
        orderStatus: result.orderStatus,
        canceledAt: result.canceledAt,
      });
      setCancelFeedback({
        kind: "success",
        message: "注文をキャンセルしました。",
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin(orderId);
        return;
      }

      setCancelFeedback({
        kind: "error",
        message: getCancelErrorMessage(error),
      });
    } finally {
      setIsCanceling(false);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="admin-order-detail-title">
      <Link className={styles.backLink} href="/admin/orders">
        注文管理へ戻る
      </Link>

      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin order detail</p>
        <h1 className={styles.title} id="admin-order-detail-title">
          注文詳細
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          管理者注文詳細を読み込み中...
        </p>
      ) : notFoundMessage ? (
        <GuidancePanel title="注文が見つかりません" message={notFoundMessage} />
      ) : invalidRequestMessage ? (
        <GuidancePanel
          title="注文IDを確認してください"
          message={invalidRequestMessage}
        />
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>
            管理者注文詳細を取得できませんでした。
          </p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} type="button" onClick={loadOrder}>
            再読み込み
          </button>
        </div>
      ) : order ? (
        <div className={styles.detailLayout}>
          <section
            className={styles.summaryPanel}
            aria-labelledby="admin-order-summary-title"
          >
            <div className={styles.summaryHeader}>
              <h2 className={styles.sectionTitle} id="admin-order-summary-title">
                注文概要
              </h2>
              <span
                className={`${styles.statusBadge} ${
                  styles[`status-${order.orderStatus}`]
                }`}
              >
                {orderStatusLabels[order.orderStatus]}
              </span>
            </div>

            <dl className={styles.summaryList}>
              <div>
                <dt>Order ID</dt>
                <dd>{order.orderId}</dd>
              </div>
              <div>
                <dt>注文番号</dt>
                <dd>{order.orderNumber}</dd>
              </div>
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
                <dt>注文日時</dt>
                <dd>{formatDateTime(order.orderedAt)}</dd>
              </div>
              <div>
                <dt>キャンセル日時</dt>
                <dd>{formatDateTime(order.canceledAt)}</dd>
              </div>
              <div>
                <dt>税抜合計</dt>
                <dd>{priceFormatter.format(order.totalExcludingTax)}</dd>
              </div>
              <div>
                <dt>消費税合計</dt>
                <dd>{priceFormatter.format(order.totalTax)}</dd>
              </div>
              <div>
                <dt>税込合計</dt>
                <dd>{priceFormatter.format(order.totalIncludingTax)}</dd>
              </div>
            </dl>

            {cancelFeedback ? (
              <p
                className={
                  cancelFeedback.kind === "success"
                    ? styles.successMessage
                    : styles.operationError
                }
                role={cancelFeedback.kind === "error" ? "alert" : "status"}
              >
                {cancelFeedback.message}
              </p>
            ) : null}

            {order.orderStatus === "ordered" ? (
              <button
                className={styles.cancelButton}
                type="button"
                disabled={isCanceling}
                onClick={() => void handleCancelOrder()}
              >
                {isCanceling ? "キャンセル中..." : "注文をキャンセルする"}
              </button>
            ) : null}
          </section>

          <section
            className={styles.itemsSection}
            aria-labelledby="admin-order-items-title"
          >
            <h2 className={styles.sectionTitle} id="admin-order-items-title">
              注文明細
            </h2>
            <ul className={styles.itemList}>
              {order.items.map((item) => (
                <li
                  className={styles.item}
                  key={`${order.orderId}-${item.productId}`}
                >
                  <div className={styles.itemMedia}>
                    <div className={styles.imageFrame}>
                      {item.productImageUrl ? (
                        <img
                          className={styles.image}
                          src={item.productImageUrl}
                          alt={item.productName}
                        />
                      ) : (
                        <span className={styles.placeholder}>No Image</span>
                      )}
                    </div>
                  </div>

                  <div className={styles.itemBody}>
                    <h3 className={styles.itemName}>{item.productName}</h3>
                    <dl className={styles.itemMeta}>
                      <div>
                        <dt>Product ID</dt>
                        <dd>{item.productId}</dd>
                      </div>
                      <div>
                        <dt>メーカー</dt>
                        <dd>{item.makerName ?? "メーカー未設定"}</dd>
                      </div>
                      <div>
                        <dt>型番</dt>
                        <dd>{item.modelNumber ?? "型番未設定"}</dd>
                      </div>
                      <div>
                        <dt>税抜単価</dt>
                        <dd>{priceFormatter.format(item.unitPriceExcludingTax)}</dd>
                      </div>
                      <div>
                        <dt>税率</dt>
                        <dd>{percentFormatter.format(item.taxRate)}</dd>
                      </div>
                      <div>
                        <dt>税込単価</dt>
                        <dd>{priceFormatter.format(item.unitPriceIncludingTax)}</dd>
                      </div>
                      <div>
                        <dt>数量</dt>
                        <dd>{item.quantity}点</dd>
                      </div>
                      <div>
                        <dt>税抜小計</dt>
                        <dd>{priceFormatter.format(item.subtotalExcludingTax)}</dd>
                      </div>
                      <div>
                        <dt>消費税小計</dt>
                        <dd>{priceFormatter.format(item.subtotalTax)}</dd>
                      </div>
                      <div>
                        <dt>税込小計</dt>
                        <dd>{priceFormatter.format(item.subtotalIncludingTax)}</dd>
                      </div>
                    </dl>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      ) : null}
    </section>
  );
}

function GuidancePanel({ title, message }: { title: string; message: string }) {
  return (
    <div className={styles.guidancePanel} role="alert">
      <p className={styles.guidanceTitle}>{title}</p>
      <p className={styles.guidanceMessage}>{message}</p>
      <Link className={styles.primaryLink} href="/admin/orders">
        注文管理へ戻る
      </Link>
    </div>
  );
}
