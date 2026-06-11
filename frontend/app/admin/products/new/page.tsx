"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

import { ERROR_CODES } from "../../../../constants/errorCodes";
import { useAuth } from "../../../../contexts/AuthContext";
import {
  createAdminProduct,
  type AdminProductCreateInput,
  type AdminProductUpdateInput,
} from "../../../../features/products/api";
import { ApiError } from "../../../../lib/errors";
import AdminProductForm, {
  adminProductToFormValues,
  type AdminProductFieldErrors,
} from "../AdminProductForm";
import {
  getAdminProductFieldErrors,
  getAdminProductSaveErrorMessage,
} from "../adminProductFormErrors";
import styles from "../AdminProductFormPage.module.css";

const ADMIN_PRODUCT_NEW_RETURN_TO = "/admin/products/new";

type Feedback = {
  kind: "error" | "success";
  message: string;
};

export default function AdminProductNewPage() {
  const router = useRouter();
  const { isLoading, setUser, user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdminProductFieldErrors>({});
  const isAdmin = user?.roles.includes("admin") ?? false;
  const initialValues = useMemo(() => adminProductToFormValues(), []);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace(
        `/admin/login?returnTo=${encodeURIComponent(ADMIN_PRODUCT_NEW_RETURN_TO)}`,
      );
    }
  }, [isLoading, router, user]);

  const handleSubmit = async (
    input: AdminProductCreateInput | AdminProductUpdateInput,
  ) => {
    if (isSubmitting) {
      return;
    }

    setIsSubmitting(true);
    setFeedback(null);
    setFieldErrors({});

    try {
      await createAdminProduct(input as AdminProductCreateInput);
      router.push("/admin/products?message=created");
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        setUser(null);
        router.replace(
          `/admin/login?returnTo=${encodeURIComponent(ADMIN_PRODUCT_NEW_RETURN_TO)}`,
        );
        return;
      }

      setFieldErrors(getAdminProductFieldErrors(error));
      setFeedback({
        kind: "error",
        message: getAdminProductSaveErrorMessage(
          error,
          "商品を登録できませんでした。",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || !user) {
    return (
      <section className={styles.page} aria-labelledby="admin-product-new-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Admin products</p>
          <h1 className={styles.title} id="admin-product-new-title">
            商品登録
          </h1>
        </div>
        <p className={styles.status} role="status" aria-live="polite">
          認証状態を確認中...
        </p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className={styles.page} aria-labelledby="admin-product-new-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Admin products</p>
          <h1 className={styles.title} id="admin-product-new-title">
            商品登録
          </h1>
        </div>
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>管理者権限がありません。</p>
          <p className={styles.errorMessage}>
            商品を登録するには、管理者アカウントでログインしてください。
          </p>
          <Link className={styles.secondaryLink} href="/admin/products">
            商品一覧へ戻る
          </Link>
        </div>
      </section>
    );
  }

  return (
    <section className={styles.page} aria-labelledby="admin-product-new-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin products</p>
        <h1 className={styles.title} id="admin-product-new-title">
          商品登録
        </h1>
        <p className={styles.lead}>
          商品名、価格、在庫数、販売状態を入力して商品を登録します。
        </p>
      </div>

      <div className={styles.topActions}>
        <Link className={styles.secondaryLink} href="/admin/products">
          商品一覧へ戻る
        </Link>
      </div>

      <AdminProductForm
        mode="create"
        initialValues={initialValues}
        isSubmitting={isSubmitting}
        feedback={feedback}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
