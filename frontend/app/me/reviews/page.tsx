"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import { deleteMyReview, fetchMyReviews } from "../../../features/reviews/api";
import type { MyReview, MyReviewList } from "../../../features/reviews/api";
import { ApiError } from "../../../lib/errors";
import styles from "./MyReviewsPage.module.css";

const MY_REVIEWS_RETURN_TO = "/me/reviews";

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const reviewStatusLabels: Record<MyReview["status"], string> = {
  draft: "下書き",
  published: "公開中",
  hidden: "非表示",
};

const formatDateTime = (value: string) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return dateTimeFormatter.format(date);
};

const getOptionalText = (value: string | null) => {
  return value && value.trim() ? value : "未入力";
};

export default function MyReviewsPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [reviewList, setReviewList] = useState<MyReviewList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [deleteFeedback, setDeleteFeedback] = useState<{
    kind: "error" | "success";
    message: string;
    reviewId?: number;
  } | null>(null);
  const [deletingReviewId, setDeletingReviewId] = useState<number | null>(null);

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(
      `/login?returnTo=${encodeURIComponent(MY_REVIEWS_RETURN_TO)}`,
    );
  }, [router, setUser]);

  const loadReviews = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);
    setDeleteFeedback(null);

    try {
      const nextReviewList = await fetchMyReviews();
      setReviewList(nextReviewList);
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setReviewList(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "レビュー一覧を取得できませんでした。",
      );
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadReviews();
  }, [loadReviews]);

  const handleDeleteReview = async (review: MyReview) => {
    if (deletingReviewId !== null) {
      return;
    }

    const shouldDelete = window.confirm("このレビューを削除しますか？");

    if (!shouldDelete) {
      return;
    }

    setDeletingReviewId(review.reviewId);
    setDeleteFeedback(null);

    try {
      await deleteMyReview(review.reviewId);
      setReviewList((current) =>
        current
          ? {
              reviews: current.reviews.filter(
                (currentReview) => currentReview.reviewId !== review.reviewId,
              ),
            }
          : current,
      );
      setDeleteFeedback({
        kind: "success",
        message: "レビューを削除しました。",
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      setDeleteFeedback({
        kind: "error",
        message:
          error instanceof ApiError
            ? error.message
            : "レビューを削除できませんでした。",
        reviewId: review.reviewId,
      });
    } finally {
      setDeletingReviewId(null);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="my-reviews-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>My reviews</p>
        <h1 className={styles.title} id="my-reviews-title">
          自分のレビュー
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          レビュー一覧を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>レビュー一覧を取得できませんでした。</p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button
            className={styles.retryButton}
            type="button"
            onClick={loadReviews}
          >
            再読み込み
          </button>
        </div>
      ) : reviewList && reviewList.reviews.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>
            投稿したレビューはまだありません。
          </p>
          {deleteFeedback?.kind === "success" ? (
            <p className={styles.successMessage} role="status">
              {deleteFeedback.message}
            </p>
          ) : null}
          <Link className={styles.primaryLink} href="/orders">
            注文履歴を見る
          </Link>
        </div>
      ) : reviewList ? (
        <>
          {deleteFeedback?.kind === "success" ? (
            <p className={styles.successMessage} role="status">
              {deleteFeedback.message}
            </p>
          ) : null}
          <ul className={styles.reviewList}>
            {reviewList.reviews.map((review) => (
              <li className={styles.reviewItem} key={review.reviewId}>
                <div className={styles.reviewMain}>
                  <div className={styles.reviewHeading}>
                    <div className={styles.productBlock}>
                      <h2 className={styles.productName}>{review.productName}</h2>
                      <p className={styles.rating}>★{review.rating}</p>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[`status-${review.status}`]
                      }`}
                    >
                      {reviewStatusLabels[review.status]}
                    </span>
                  </div>

                  <div className={styles.reviewBody}>
                    <p className={styles.reviewTitle}>
                      {getOptionalText(review.title)}
                    </p>
                    <p className={styles.reviewComment}>
                      {getOptionalText(review.comment)}
                    </p>
                  </div>

                  <dl className={styles.reviewMeta}>
                    <div>
                      <dt>作成日時</dt>
                      <dd>{formatDateTime(review.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>更新日時</dt>
                      <dd>{formatDateTime(review.updatedAt)}</dd>
                    </div>
                  </dl>
                  {deleteFeedback?.kind === "error" &&
                  deleteFeedback.reviewId === review.reviewId ? (
                    <p className={styles.deleteError} role="alert">
                      {deleteFeedback.message}
                    </p>
                  ) : null}
                </div>

                <div className={styles.reviewActions}>
                  <Link
                    className={styles.detailLink}
                    href={`/products/${review.productId}`}
                  >
                    商品詳細を見る
                  </Link>
                  {review.status === "draft" ? (
                    <Link
                      className={styles.editLink}
                      href={`/me/reviews/${review.reviewId}/edit`}
                    >
                      編集する
                    </Link>
                  ) : (
                    <span className={styles.editUnavailable}>編集不可</span>
                  )}
                  <button
                    className={styles.deleteButton}
                    type="button"
                    disabled={deletingReviewId !== null}
                    onClick={() => void handleDeleteReview(review)}
                  >
                    {deletingReviewId === review.reviewId ? "削除中..." : "削除する"}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
