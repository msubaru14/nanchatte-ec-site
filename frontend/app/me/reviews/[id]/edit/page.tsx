"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../../../constants/errorCodes";
import { useAuth } from "../../../../../contexts/AuthContext";
import {
  fetchMyReviewDetail,
  updateMyReview,
} from "../../../../../features/reviews/api";
import type { MyReview } from "../../../../../features/reviews/api";
import { ApiError } from "../../../../../lib/errors";
import styles from "./MyReviewEditPage.module.css";

const ratingOptions = [1, 2, 3, 4, 5];

const reviewStatusLabels: Record<MyReview["status"], string> = {
  draft: "下書き",
  published: "公開中",
  hidden: "非表示",
};

type Feedback = {
  kind: "error" | "success";
  message: string;
};

const formatUpdateError = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "レビューを保存できませんでした。再度お試しください。";
  }

  if (error.code === ERROR_CODES.VALIDATION_ERROR) {
    const details = error.validationDetails.map((detail) => detail.message);

    return details.length > 0 ? details.join("\n") : "入力内容を確認してください。";
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return "レビューが見つかりませんでした。";
  }

  if (error.code === ERROR_CODES.CONFLICT) {
    return "このレビューは現在編集できません。";
  }

  return error.message || "レビューを保存できませんでした。再度お試しください。";
};

export default function MyReviewEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const reviewId = params.id;
  const { setUser } = useAuth();
  const [review, setReview] = useState<MyReview | null>(null);
  const [rating, setRating] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<Feedback | null>(null);

  const editPath = `/me/reviews/${reviewId}/edit`;

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(`/login?returnTo=${encodeURIComponent(editPath)}`);
  }, [editPath, router, setUser]);

  const loadReview = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setLoadErrorMessage(null);
    setFeedback(null);

    try {
      const nextReview = await fetchMyReviewDetail(reviewId);
      setReview(nextReview);
      setRating(String(nextReview.rating));
      setTitle(nextReview.title ?? "");
      setComment(nextReview.comment ?? "");
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setReview(null);
      setLoadErrorMessage(formatUpdateError(error));
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [redirectToLogin, reviewId]);

  useEffect(() => {
    void loadReview();
  }, [loadReview]);

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
      const updatedReview = await updateMyReview(reviewId, {
        rating: ratingValue,
        title: trimmedTitle || null,
        comment: trimmedComment || null,
      });

      setReview(updatedReview);
      setRating(String(updatedReview.rating));
      setTitle(updatedReview.title ?? "");
      setComment(updatedReview.comment ?? "");
      setFeedback({ kind: "success", message: "レビューを保存しました。" });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      setFeedback({ kind: "error", message: formatUpdateError(error) });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="review-edit-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Edit review</p>
        <h1 className={styles.title} id="review-edit-title">
          レビュー編集
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          レビューを読み込み中...
        </p>
      ) : loadErrorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>レビューを取得できませんでした。</p>
          <p className={styles.errorMessage}>{loadErrorMessage}</p>
          <div className={styles.actionRow}>
            <button
              className={styles.primaryButton}
              type="button"
              onClick={loadReview}
            >
              再読み込み
            </button>
            <Link className={styles.secondaryLink} href="/me/reviews">
              一覧へ戻る
            </Link>
          </div>
        </div>
      ) : review && review.status !== "draft" ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>このレビューは編集できません。</p>
          <p className={styles.errorMessage}>
            現在の状態は「{reviewStatusLabels[review.status]}」です。編集できるのは下書きレビューのみです。
          </p>
          <Link className={styles.secondaryLink} href="/me/reviews">
            一覧へ戻る
          </Link>
        </div>
      ) : review ? (
        <form
          className={styles.form}
          aria-label="レビュー編集"
          onSubmit={handleSubmit}
        >
          <div className={styles.productPanel}>
            <span className={styles.productLabel}>対象商品</span>
            <p className={styles.productName}>{review.productName}</p>
          </div>

          <div className={styles.field}>
            <span className={styles.label} id="review-edit-rating-label">
              評価
            </span>
            <div
              className={styles.ratingInput}
              role="radiogroup"
              aria-labelledby="review-edit-rating-label"
            >
              {ratingOptions.map((value) => {
                const currentRating = Number(rating);
                const isSelected = rating === String(value);
                const isFilled = currentRating >= value;

                return (
                  <button
                    key={value}
                    className={`${styles.starButton} ${
                      isFilled ? styles.starButtonFilled : ""
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

          <label className={styles.field}>
            <span className={styles.label}>タイトル</span>
            <input
              className={styles.input}
              type="text"
              value={title}
              disabled={isSubmitting}
              onChange={(event) => {
                setTitle(event.target.value);
                setFeedback(null);
              }}
            />
          </label>

          <label className={styles.field}>
            <span className={styles.label}>コメント</span>
            <textarea
              className={styles.textarea}
              value={comment}
              disabled={isSubmitting}
              onChange={(event) => {
                setComment(event.target.value);
                setFeedback(null);
              }}
              rows={6}
            />
          </label>

          <div className={styles.actionRow}>
            <button
              className={styles.primaryButton}
              type="submit"
              disabled={isSubmitting}
            >
              {isSubmitting ? "保存中..." : "保存する"}
            </button>
            <Link className={styles.secondaryLink} href="/me/reviews">
              キャンセル
            </Link>
          </div>

          {feedback ? (
            <p
              className={
                feedback.kind === "success" ? styles.success : styles.formError
              }
              role={feedback.kind === "success" ? "status" : "alert"}
            >
              {feedback.message}
            </p>
          ) : null}
        </form>
      ) : null}
    </section>
  );
}
