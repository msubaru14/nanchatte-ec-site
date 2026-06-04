"use client";

import Link from "next/link";
import { useState } from "react";

import { useAuth } from "../../../contexts/AuthContext";
import styles from "./ProductDetailPage.module.css";

type ProductReviewFormProps = {
  productId: string;
};

const ratingOptions = [1, 2, 3, 4, 5];

export default function ProductReviewForm({ productId }: ProductReviewFormProps) {
  const { isAuthenticated, isLoading } = useAuth();
  const [rating, setRating] = useState("");
  const [title, setTitle] = useState("");
  const [comment, setComment] = useState("");

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
    <form className={styles.reviewForm} aria-label="レビュー投稿">
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
                onClick={() => setRating(String(value))}
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
          onChange={(event) => setTitle(event.target.value)}
          placeholder="例: 使いやすい商品です"
        />
      </label>

      <label className={styles.reviewField}>
        <span className={styles.reviewLabel}>コメント</span>
        <textarea
          className={styles.reviewTextarea}
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="商品の感想を入力してください"
          rows={5}
        />
      </label>

      <button className={styles.reviewSubmitButton} type="submit" disabled>
        投稿する
      </button>
    </form>
  );
}
