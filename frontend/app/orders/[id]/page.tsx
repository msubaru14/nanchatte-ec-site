"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchOrderDetail } from "../../../features/order/api";
import type { OrderDetail } from "../../../features/order/api";
import { ApiError } from "../../../lib/errors";
import styles from "./OrderDetailPage.module.css";

type OrderDetailPageProps = {
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

const orderStatusLabels: Record<OrderDetail["orderStatus"], string> = {
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

export default function OrderDetailPage({ params }: OrderDetailPageProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [orderId, setOrderId] = useState<string | null>(null);
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [notFoundMessage, setNotFoundMessage] = useState<string | null>(null);
  const [invalidRequestMessage, setInvalidRequestMessage] = useState<string | null>(
    null,
  );

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
      router.replace(`/login?returnTo=${encodeURIComponent(`/orders/${id}`)}`);
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

    try {
      const nextOrder = await fetchOrderDetail(orderId);
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

        setErrorMessage(error.message);
        return;
      }

      setErrorMessage("注文詳細を取得できませんでした。");
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [orderId, redirectToLogin]);

  useEffect(() => {
    void loadOrder();
  }, [loadOrder]);

  return (
    <section className={styles.page} aria-labelledby="order-detail-title">
      <Link className={styles.backLink} href="/orders">
        注文履歴へ戻る
      </Link>

      <div className={styles.header}>
        <p className={styles.eyebrow}>Order detail</p>
        <h1 className={styles.title} id="order-detail-title">
          注文詳細
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          注文詳細を読み込み中...
        </p>
      ) : notFoundMessage ? (
        <GuidancePanel title="注文が見つかりません" message={notFoundMessage} />
      ) : invalidRequestMessage ? (
        <GuidancePanel title="注文IDを確認してください" message={invalidRequestMessage} />
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>注文詳細を取得できませんでした。</p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} type="button" onClick={loadOrder}>
            再読み込み
          </button>
        </div>
      ) : order ? (
        <div className={styles.detailLayout}>
          <section className={styles.summaryPanel} aria-labelledby="order-summary-title">
            <div className={styles.summaryHeader}>
              <h2 className={styles.sectionTitle} id="order-summary-title">
                注文概要
              </h2>
              <span className={styles.statusBadge}>
                {orderStatusLabels[order.orderStatus]}
              </span>
            </div>
            <dl className={styles.summaryList}>
              <div>
                <dt>注文番号</dt>
                <dd>{order.orderNumber}</dd>
              </div>
              <div>
                <dt>注文日時</dt>
                <dd>{formatOrderedAt(order.orderedAt)}</dd>
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
          </section>

          <section className={styles.itemsSection} aria-labelledby="order-items-title">
            <h2 className={styles.sectionTitle} id="order-items-title">
              注文明細
            </h2>
            <ul className={styles.itemList}>
              {order.items.map((item) => (
                <li className={styles.item} key={`${order.orderId}-${item.productId}`}>
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

                  <div className={styles.itemBody}>
                    <h3 className={styles.itemName}>{item.productName}</h3>
                    <dl className={styles.itemMeta}>
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
      <Link className={styles.primaryLink} href="/orders">
        注文履歴へ戻る
      </Link>
    </div>
  );
}
