"use client";

import { useEffect, useState } from "react";

import {
  fetchProductReviews,
  fetchProductReviewSummary,
} from "../../../features/reviews/api";
import type {
  ProductReview,
  ProductReviewList,
  ProductReviewSummary,
} from "../../../features/reviews/api";
import { ApiError } from "../../../lib/errors";
import styles from "./ProductDetailPage.module.css";
import ProductReviewForm from "./ProductReviewForm";

type ProductReviewsSectionProps = {
  productId: string;
};

type ReviewDisplayState =
  | {
      kind: "loading";
    }
  | {
      kind: "success";
      reviews: ProductReviewList;
      summary: ProductReviewSummary;
    }
  | {
      kind: "error";
      message: string;
    };

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const formatReviewDate = (dateText: string) => {
  const date = new Date(dateText);

  if (Number.isNaN(date.getTime())) {
    return dateText;
  }

  return dateTimeFormatter.format(date);
};

const formatReviewErrorMessage = (error: unknown) => {
  if (error instanceof ApiError) {
    return `${error.message} (${error.code})`;
  }

  return "レビュー情報の取得に失敗しました。";
};

function ProductReviewItem({ review }: { review: ProductReview }) {
  return (
    <li className={styles.reviewItem}>
      <div className={styles.reviewItemHeader}>
        <div>
          <p className={styles.reviewTitle}>{review.title ?? "タイトルなし"}</p>
          <p className={styles.reviewerName}>{review.reviewerName}</p>
        </div>
        <div className={styles.reviewRating}>評価 {review.rating} / 5</div>
      </div>

      {review.comment ? (
        <p className={styles.reviewComment}>{review.comment}</p>
      ) : (
        <p className={styles.reviewNoComment}>コメントはありません。</p>
      )}

      <p className={styles.reviewDate}>
        投稿日: {formatReviewDate(review.createdAt)}
      </p>
    </li>
  );
}

export default function ProductReviewsSection({
  productId,
}: ProductReviewsSectionProps) {
  const [state, setState] = useState<ReviewDisplayState>({ kind: "loading" });

  useEffect(() => {
    let isActive = true;

    const loadReviews = async () => {
      setState({ kind: "loading" });

      try {
        const [summary, reviews] = await Promise.all([
          fetchProductReviewSummary(productId),
          fetchProductReviews(productId),
        ]);

        if (isActive) {
          setState({ kind: "success", reviews, summary });
        }
      } catch (error) {
        if (isActive) {
          setState({
            kind: "error",
            message: formatReviewErrorMessage(error),
          });
        }
      }
    };

    void loadReviews();

    return () => {
      isActive = false;
    };
  }, [productId]);

  return (
    <section className={styles.reviewSection} aria-labelledby="reviews-title">
      <div className={styles.reviewHeader}>
        <h2 className={styles.sectionTitle} id="reviews-title">
          レビュー
        </h2>
        {state.kind === "success" ? (
          <div className={styles.reviewSummary} aria-label="レビュー概要">
            <span>平均評価: {state.summary.averageRating.toFixed(1)} / 5</span>
            <span>レビュー {state.summary.reviewCount}件</span>
          </div>
        ) : null}
      </div>

      {state.kind === "loading" ? (
        <p className={styles.reviewEmpty}>レビューを読み込んでいます。</p>
      ) : null}

      {state.kind === "error" ? (
        <p className={styles.reviewError} role="alert">
          {state.message}
        </p>
      ) : null}

      {state.kind === "success" && state.reviews.reviews.length === 0 ? (
        <p className={styles.reviewEmpty}>まだレビューはありません。</p>
      ) : null}

      {state.kind === "success" && state.reviews.reviews.length > 0 ? (
        <ul className={styles.reviewList}>
          {state.reviews.reviews.map((review) => (
            <ProductReviewItem key={review.reviewId} review={review} />
          ))}
        </ul>
      ) : null}

      <ProductReviewForm productId={productId} />
    </section>
  );
}
