"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import type { OrderCreateResult } from "../../../features/order/api";
import { loadLatestOrder } from "../../../features/order/utils/latestOrder";
import styles from "./OrderCompletePage.module.css";

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

export default function OrderCompletePage() {
  const [order, setOrder] = useState<OrderCreateResult | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    setOrder(loadLatestOrder());
    setIsLoaded(true);
  }, []);

  return (
    <section className={styles.page} aria-labelledby="order-complete-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Order complete</p>
        <h1 className={styles.title} id="order-complete-title">
          注文完了
        </h1>
      </div>

      {!isLoaded ? (
        <p className={styles.status} role="status" aria-live="polite">
          注文結果を読み込み中...
        </p>
      ) : order ? (
        <div className={styles.completeLayout}>
          <div className={styles.messagePanel}>
            <p className={styles.completeMessage}>注文が完了しました。</p>
            <dl className={styles.orderSummary}>
              <div className={styles.summaryRow}>
                <dt>注文番号</dt>
                <dd>{order.orderNumber}</dd>
              </div>
              <div className={styles.summaryRow}>
                <dt>合計金額</dt>
                <dd>{priceFormatter.format(order.totalIncludingTax)}</dd>
              </div>
            </dl>
          </div>

          <aside className={styles.nextActions} aria-label="次の操作">
            <Link className={styles.primaryLink} href="/products">
              商品一覧へ
            </Link>
            <Link className={styles.secondaryLink} href="/cart">
              カートへ
            </Link>
          </aside>
        </div>
      ) : (
        <div className={styles.emptyPanel}>
          <p className={styles.emptyTitle}>表示できる注文結果がありません。</p>
          <p className={styles.emptyMessage}>
            注文完了画面を再読み込みした場合は、注文結果を再表示できないことがあります。
          </p>
          <div className={styles.linkRow}>
            <Link className={styles.primaryLink} href="/products">
              商品一覧へ
            </Link>
            <Link className={styles.secondaryLink} href="/cart">
              カートへ
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
