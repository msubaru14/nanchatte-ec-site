"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import {
  fetchAdminReviews,
  hideAdminReview,
  publishAdminReview,
} from "../../../features/reviews/api";
import type {
  AdminReview,
  AdminReviewList,
} from "../../../features/reviews/api";
import { ApiError } from "../../../lib/errors";
import styles from "./AdminReviewsPage.module.css";

const ADMIN_REVIEWS_RETURN_TO = "/admin/reviews";

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const reviewStatusLabels: Record<AdminReview["status"], string> = {
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

const getOperationErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "レビューの状態を更新できませんでした。";
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return "対象レビューが見つかりませんでした。";
  }

  if (error.code === ERROR_CODES.VALIDATION_ERROR) {
    return "このレビューは現在の状態では操作できません。";
  }

  return error.message;
};

export default function AdminReviewsPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [reviewList, setReviewList] = useState<AdminReviewList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<{
    kind: "error" | "success";
    message: string;
    reviewId?: number;
  } | null>(null);
  const [operatingReviewId, setOperatingReviewId] = useState<number | null>(
    null,
  );

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(
      `/admin/login?returnTo=${encodeURIComponent(ADMIN_REVIEWS_RETURN_TO)}`,
    );
  }, [router, setUser]);

  const loadReviews = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);
    setOperationFeedback(null);

    try {
      const nextReviewList = await fetchAdminReviews();
      setReviewList(nextReviewList);
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setReviewList(null);
      setErrorMessage(
        error instanceof ApiError && error.code === ERROR_CODES.FORBIDDEN
          ? "管理者権限がないため、レビュー管理画面を表示できません。"
          : error instanceof ApiError
            ? error.message
            : "管理者レビュー一覧を取得できませんでした。",
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

  const updateReview = (nextReview: AdminReview) => {
    setReviewList((current) =>
      current
        ? {
            reviews: current.reviews.map((review) =>
              review.reviewId === nextReview.reviewId ? nextReview : review,
            ),
          }
        : current,
    );
  };

  const handleHideReview = async (review: AdminReview) => {
    if (operatingReviewId !== null) {
      return;
    }

    const shouldHide = window.confirm("このレビューを非表示にしますか？");

    if (!shouldHide) {
      return;
    }

    setOperatingReviewId(review.reviewId);
    setOperationFeedback(null);

    try {
      const nextReview = await hideAdminReview(review.reviewId);
      updateReview(nextReview);
      setOperationFeedback({
        kind: "success",
        message: "レビューを非表示にしました。",
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      setOperationFeedback({
        kind: "error",
        message: getOperationErrorMessage(error),
        reviewId: review.reviewId,
      });
    } finally {
      setOperatingReviewId(null);
    }
  };

  const handlePublishReview = async (review: AdminReview) => {
    if (operatingReviewId !== null) {
      return;
    }

    const shouldPublish = window.confirm("このレビューを再公開しますか？");

    if (!shouldPublish) {
      return;
    }

    setOperatingReviewId(review.reviewId);
    setOperationFeedback(null);

    try {
      const nextReview = await publishAdminReview(review.reviewId);
      updateReview(nextReview);
      setOperationFeedback({
        kind: "success",
        message: "レビューを再公開しました。",
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      setOperationFeedback({
        kind: "error",
        message: getOperationErrorMessage(error),
        reviewId: review.reviewId,
      });
    } finally {
      setOperatingReviewId(null);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="admin-reviews-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin reviews</p>
        <h1 className={styles.title} id="admin-reviews-title">
          レビュー管理
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          管理者レビュー一覧を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>
            管理者レビュー一覧を取得できませんでした。
          </p>
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
            管理対象のレビューはありません。
          </p>
          {operationFeedback?.kind === "success" ? (
            <p className={styles.successMessage} role="status">
              {operationFeedback.message}
            </p>
          ) : null}
        </div>
      ) : reviewList ? (
        <>
          {operationFeedback?.kind === "success" ? (
            <p className={styles.successMessage} role="status">
              {operationFeedback.message}
            </p>
          ) : null}
          <ul className={styles.reviewList}>
            {reviewList.reviews.map((review) => (
              <li className={styles.reviewItem} key={review.reviewId}>
                <div className={styles.reviewSummary}>
                  <div className={styles.reviewHeading}>
                    <div className={styles.reviewIdentity}>
                      <p className={styles.reviewId}>
                        Review #{review.reviewId}
                      </p>
                      <h2 className={styles.productName}>
                        {review.productName}
                      </h2>
                      <p className={styles.reviewerName}>
                        {review.reviewerName}
                      </p>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[`status-${review.status}`]
                      }`}
                    >
                      {reviewStatusLabels[review.status]}
                    </span>
                  </div>

                  <div className={styles.reviewContent}>
                    <p className={styles.rating}>★{review.rating}</p>
                    <p className={styles.reviewTitle}>
                      {getOptionalText(review.title)}
                    </p>
                    <p className={styles.reviewComment}>
                      {getOptionalText(review.comment)}
                    </p>
                  </div>

                  <dl className={styles.reviewMeta}>
                    <div>
                      <dt>User ID</dt>
                      <dd>{review.userId}</dd>
                    </div>
                    <div>
                      <dt>Product ID</dt>
                      <dd>{review.productId}</dd>
                    </div>
                    <div>
                      <dt>作成日時</dt>
                      <dd>{formatDateTime(review.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>更新日時</dt>
                      <dd>{formatDateTime(review.updatedAt)}</dd>
                    </div>
                  </dl>
                  {operationFeedback?.kind === "error" &&
                  operationFeedback.reviewId === review.reviewId ? (
                    <p className={styles.operationError} role="alert">
                      {operationFeedback.message}
                    </p>
                  ) : null}
                </div>

                <div className={styles.reviewActions}>
                  <Link
                    className={styles.productLink}
                    href={`/products/${review.productId}`}
                  >
                    商品詳細を見る
                  </Link>
                  {review.status === "hidden" ? (
                    <button
                      className={styles.publishButton}
                      type="button"
                      disabled={operatingReviewId !== null}
                      onClick={() => void handlePublishReview(review)}
                    >
                      {operatingReviewId === review.reviewId
                        ? "再公開中..."
                        : "再公開する"}
                    </button>
                  ) : (
                    <button
                      className={styles.hideButton}
                      type="button"
                      disabled={operatingReviewId !== null}
                      onClick={() => void handleHideReview(review)}
                    >
                      {operatingReviewId === review.reviewId
                        ? "非表示化中..."
                        : "非表示にする"}
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      ) : null}
    </section>
  );
}
