"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchMyReviews } from "../../../features/reviews/api";
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
          <Link className={styles.primaryLink} href="/products">
            商品を探す
          </Link>
        </div>
      ) : reviewList ? (
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
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
