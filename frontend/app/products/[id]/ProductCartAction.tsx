"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import { addCartItem } from "../../../features/cart/api";
import type { OutOfStockDetails } from "../../../features/cart/api";
import { ApiError } from "../../../lib/errors";
import styles from "./ProductDetailPage.module.css";

type ProductCartActionProps = {
  isOutOfStock: boolean;
  productId: number;
  productName: string;
};

type Feedback = {
  kind: "error" | "success";
  message: string;
};

const isOutOfStockDetails = (details: unknown): details is OutOfStockDetails => {
  return (
    typeof details === "object" &&
    details !== null &&
    "availableQuantity" in details &&
    typeof details.availableQuantity === "number" &&
    Number.isInteger(details.availableQuantity) &&
    details.availableQuantity >= 0
  );
};

export default function ProductCartAction({
  isOutOfStock,
  productId,
  productName,
}: ProductCartActionProps) {
  const router = useRouter();
  const { setUser } = useAuth();
  const [quantity, setQuantity] = useState(1);
  const [isAdding, setIsAdding] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const redirectToLogin = () => {
    setUser(null);
    router.replace(
      `/login?returnTo=${encodeURIComponent(`/products/${productId}`)}`,
    );
  };

  const attemptAddItem = async (
    requestedQuantity: number,
    canOfferAdjustment: boolean,
  ): Promise<void> => {
    try {
      await addCartItem({ productId, quantity: requestedQuantity });
      setQuantity(requestedQuantity);
      setFeedback({ kind: "success", message: "カートに追加しました。" });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      if (error instanceof ApiError && error.code === ERROR_CODES.OUT_OF_STOCK) {
        const details = isOutOfStockDetails(error.details) ? error.details : null;

        if (
          canOfferAdjustment &&
          details &&
          details.availableQuantity > 0 &&
          window.confirm(
            `在庫が不足しています。\n購入可能な最大数量(${details.availableQuantity}個)でカートへ追加しますか？`,
          )
        ) {
          setQuantity(details.availableQuantity);
          await attemptAddItem(details.availableQuantity, false);
          return;
        }

        setFeedback({
          kind: "error",
          message:
            details?.availableQuantity === 0
              ? "在庫がないため、カートに追加できませんでした。"
              : "在庫が不足しています。数量を調整して再度お試しください。",
        });
        return;
      }

      setFeedback({
        kind: "error",
        message:
          error instanceof ApiError && error.code === ERROR_CODES.VALIDATION_ERROR
            ? "この商品はカートに追加できません。"
            : "カートへの追加に失敗しました。再度お試しください。",
      });
    }
  };

  const handleAddItem = async () => {
    if (isOutOfStock || isAdding) {
      return;
    }

    setIsAdding(true);
    setFeedback(null);

    try {
      await attemptAddItem(quantity, true);
    } finally {
      setIsAdding(false);
    }
  };

  return (
    <section className={styles.cartArea} aria-label="カート追加">
      <div className={styles.quantity}>
        <span className={styles.quantityLabel}>数量</span>
        <div className={styles.stepper} aria-label={`${productName}の数量`}>
          <button
            className={styles.stepperButton}
            type="button"
            aria-label={`${productName}の数量を減らす`}
            disabled={isOutOfStock || isAdding || quantity <= 1}
            onClick={() => {
              setQuantity((current) => current - 1);
              setFeedback(null);
            }}
          >
            -
          </button>
          <span className={styles.quantityValue}>{quantity}</span>
          <button
            className={styles.stepperButton}
            type="button"
            aria-label={`${productName}の数量を増やす`}
            disabled={isOutOfStock || isAdding}
            onClick={() => {
              setQuantity((current) => current + 1);
              setFeedback(null);
            }}
          >
            +
          </button>
        </div>
      </div>

      <button
        className={styles.cartButton}
        type="button"
        disabled={isOutOfStock || isAdding}
        onClick={handleAddItem}
      >
        {isOutOfStock ? "在庫なし" : isAdding ? "追加中..." : "カートに追加"}
      </button>

      {feedback ? (
        <p
          className={
            feedback.kind === "success" ? styles.cartSuccess : styles.cartError
          }
          role={feedback.kind === "success" ? "status" : "alert"}
        >
          {feedback.message}
        </p>
      ) : null}

      {feedback?.kind === "success" ? (
        <Link className={styles.cartLink} href="/cart">
          カートを見る
        </Link>
      ) : null}
    </section>
  );
}
