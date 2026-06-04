"use client";

import Link from "next/link";
import { useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import {
  createProductReview,
  publishMyReview,
} from "../../../features/reviews/api";
import { ApiError } from "../../../lib/errors";
import styles from "./ProductDetailPage.module.css";

type ProductReviewFormProps = {
  productId: string;
  onReviewPublished: () => Promise<void> | void;
};

const ratingOptions = [1, 2, 3, 4, 5];

type ReviewFormFeedback = {
  kind: "error" | "success";
  message: string;
};

const formatReviewSubmitError = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "レビュー投稿に失敗しました。再度お試しください。";
  }

  if (error.code === ERROR_CODES.UNAUTHORIZED) {
    return "ログインが必要です。ログインしてから再度お試しください。";
  }

  if (error.code === ERROR_CODES.VALIDATION_ERROR) {
    const details = error.validationDetails.map((detail) => detail.message);

    return details.length > 0
      ? details.join("\n")
      : "入力内容を確認してください。";
  }

  if (error.code === ERROR_CODES.CONFLICT) {
    return "この商品には既にレビューを投稿済みです。";
  }

  return error.message || "レビュー投稿に失敗しました。再度お試しください。";
};

export default function ProductReviewForm({
  productId,
  onReviewPublished,
}: ProductReviewFormProps) {
  const { isAuthenticated, isLoading, setUser } = useAuth();
  const [rating, setRating] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<ReviewFormFeedback | null>(null);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) {
      return;
    }

    const ratingValue = Number(rating);
    const trimmedTitle = title.trim();
    const trimmedComment = comment.trim();

    if (!Number.isInteger(ratingValue) || ratingValue < 1 || ratingValue > 5) {
      setFeedback({ kind: "error", message: "評価を選択してください。" });
      return;
    }

    if (trimmedComment && !trimmedTitle) {
      setFeedback({
        kind: "error",
        message: "コメントを入力する場合はタイトルも入力してください。",
      });
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);

    try {
      const createdReview = await createProductReview(productId, {
        rating: ratingValue,
        title: trimmedTitle || null,
        comment: trimmedComment || null,
      });

      await publishMyReview(createdReview.reviewId);
      setRating("");
      setTitle("");
      setComment("");
      setFeedback({
        kind: "success",
        message: "レビューを投稿しました。",
      });
      await onReviewPublished();
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        setUser(null);
      }

      setFeedback({
        kind: "error",
        message: formatReviewSubmitError(error),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <div className={styles.reviewFormPanel}>
        <p className={styles.reviewFormText}>認証状態を確認しています。</p>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className={styles.reviewFormPanel}>
        <p className={styles.reviewFormText}>
          レビューを投稿するにはログインしてください。
        </p>
        <Link
          className={styles.reviewLoginLink}
          href={`/login?returnTo=${encodeURIComponent(`/products/${productId}`)}`}
        >
          ログインしてレビューを書く
        </Link>
      </div>
    );
  }

  return (
    <form
      className={styles.reviewForm}
      aria-label="レビュー投稿"
      onSubmit={handleSubmit}
    >
      <div className={styles.reviewFormHeader}>
        <h3 className={styles.reviewFormTitle}>レビューを書く</h3>
      </div>

      <div className={styles.reviewField}>
        <span className={styles.reviewLabel} id="review-rating-label">
          評価
        </span>
        <div
          className={styles.reviewRatingInput}
          role="radiogroup"
          aria-labelledby="review-rating-label"
        >
          {ratingOptions.map((value) => {
            const currentRating = Number(rating);
            const isSelected = rating === String(value);
            const isFilled = currentRating >= value;

            return (
              <button
                key={value}
                className={`${styles.reviewStarButton} ${
                  isFilled ? styles.reviewStarButtonFilled : ""
                }`}
                type="button"
                role="radio"
                aria-checked={isSelected}
                aria-label={`評価 ${value} / 5`}
                disabled={isSubmitting}
                onClick={() => {
                  setRating(String(value));
                  setFeedback(null);
                }}
              >
                ★
              </button>
            );
          })}
        </div>
      </div>

      <label className={styles.reviewField}>
        <span className={styles.reviewLabel}>タイトル</span>
        <input
          className={styles.reviewInput}
          type="text"
          value={title}
          disabled={isSubmitting}
          onChange={(event) => {
            setTitle(event.target.value);
            setFeedback(null);
          }}
          placeholder="例: 使いやすい商品です"
        />
      </label>

      <label className={styles.reviewField}>
        <span className={styles.reviewLabel}>コメント</span>
        <textarea
          className={styles.reviewTextarea}
          value={comment}
          disabled={isSubmitting}
          onChange={(event) => {
            setComment(event.target.value);
            setFeedback(null);
          }}
          placeholder="商品の感想を入力してください"
          rows={5}
        />
      </label>

      <button
        className={styles.reviewSubmitButton}
        type="submit"
        disabled={isSubmitting}
      >
        {isSubmitting ? "投稿中..." : "投稿する"}
      </button>

      {feedback ? (
        <p
          className={
            feedback.kind === "success"
              ? styles.reviewFormSuccess
              : styles.reviewFormError
          }
          role={feedback.kind === "success" ? "status" : "alert"}
        >
          {feedback.message}
        </p>
      ) : null}
    </form>
  );
}
