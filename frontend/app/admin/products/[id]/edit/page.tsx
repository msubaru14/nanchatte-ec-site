"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import { ERROR_CODES } from "../../../../../constants/errorCodes";
import { useAuth } from "../../../../../contexts/AuthContext";
import {
  fetchAdminProductDetail,
  updateAdminProduct,
  type AdminProduct,
  type AdminProductCreateInput,
  type AdminProductUpdateInput,
} from "../../../../../features/products/api";
import { ApiError } from "../../../../../lib/errors";
import AdminProductForm, {
  adminProductToFormValues,
  type AdminProductFieldErrors,
} from "../../AdminProductForm";
import {
  getAdminProductFieldErrors,
  getAdminProductSaveErrorMessage,
} from "../../adminProductFormErrors";
import styles from "../../AdminProductFormPage.module.css";

type Feedback = {
  kind: "error" | "success";
  message: string;
};

const adminProductToEditFormValues = (product: AdminProduct) =>
  adminProductToFormValues({
    name: product.name,
    description: product.description ?? "",
    price: String(product.price),
    taxRateId: String(product.taxRateId),
    categoryId: String(product.categoryId),
    stockQuantity: String(product.stockQuantity),
    lowStockThreshold: String(product.lowStockThreshold),
    status: product.status,
  });

const getLoadErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "商品を取得できませんでした。";
  }

  if (error.code === ERROR_CODES.FORBIDDEN) {
    return "管理者権限がないため、商品編集画面を表示できません。";
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return "対象商品が見つかりませんでした。";
  }

  return error.message || "商品を取得できませんでした。";
};

export default function AdminProductEditPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const productId = params.id;
  const { isLoading: isAuthLoading, setUser, user } = useAuth();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [loadErrorMessage, setLoadErrorMessage] = useState<string | null>(null);
  const [isNotFound, setIsNotFound] = useState(false);
  const [feedback, setFeedback] = useState<Feedback | null>(null);
  const [fieldErrors, setFieldErrors] = useState<AdminProductFieldErrors>({});
  const isAdmin = user?.roles.includes("admin") ?? false;
  const editPath = `/admin/products/${productId}/edit`;

  const initialValues = useMemo(() => {
    return product
      ? adminProductToEditFormValues(product)
      : adminProductToFormValues();
  }, [product]);

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(`/admin/login?returnTo=${encodeURIComponent(editPath)}`);
  }, [editPath, router, setUser]);

  const loadProduct = useCallback(async () => {
    if (!user) {
      return;
    }

    let isRedirectingToLogin = false;

    setIsLoading(true);
    setLoadErrorMessage(null);
    setIsNotFound(false);
    setFeedback(null);
    setFieldErrors({});

    try {
      const nextProduct = await fetchAdminProductDetail(productId);
      setProduct(nextProduct);
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setProduct(null);
      setIsNotFound(
        error instanceof ApiError && error.code === ERROR_CODES.NOT_FOUND,
      );
      setLoadErrorMessage(getLoadErrorMessage(error));
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [productId, redirectToLogin, user]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!user) {
      redirectToLogin();
      return;
    }

    if (!isAdmin) {
      setIsLoading(false);
      return;
    }

    void loadProduct();
  }, [isAdmin, isAuthLoading, loadProduct, redirectToLogin, user]);

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
      await updateAdminProduct(productId, input as AdminProductUpdateInput);
      router.push("/admin/products?message=updated");
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      setFieldErrors(getAdminProductFieldErrors(error));
      setFeedback({
        kind: "error",
        message: getAdminProductSaveErrorMessage(
          error,
          "商品を保存できませんでした。",
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isAuthLoading || !user || isLoading) {
    return (
      <section className={styles.page} aria-labelledby="admin-product-edit-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Admin products</p>
          <h1 className={styles.title} id="admin-product-edit-title">
            商品編集
          </h1>
        </div>
        <p className={styles.status} role="status" aria-live="polite">
          商品を読み込み中...
        </p>
      </section>
    );
  }

  if (!isAdmin) {
    return (
      <section className={styles.page} aria-labelledby="admin-product-edit-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Admin products</p>
          <h1 className={styles.title} id="admin-product-edit-title">
            商品編集
          </h1>
        </div>
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>管理者権限がありません。</p>
          <p className={styles.errorMessage}>
            商品を編集するには、管理者アカウントでログインしてください。
          </p>
          <Link className={styles.secondaryLink} href="/admin/products">
            商品一覧へ戻る
          </Link>
        </div>
      </section>
    );
  }

  if (loadErrorMessage) {
    return (
      <section className={styles.page} aria-labelledby="admin-product-edit-title">
        <div className={styles.header}>
          <p className={styles.eyebrow}>Admin products</p>
          <h1 className={styles.title} id="admin-product-edit-title">
            商品編集
          </h1>
        </div>
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>
            {isNotFound ? "商品が見つかりません。" : "商品を取得できませんでした。"}
          </p>
          <p className={styles.errorMessage}>{loadErrorMessage}</p>
          <div className={styles.actionRow}>
            {!isNotFound ? (
              <button
                className={styles.primaryButton}
                type="button"
                onClick={loadProduct}
              >
                再読み込み
              </button>
            ) : null}
            <Link className={styles.secondaryLink} href="/admin/products">
              商品一覧へ戻る
            </Link>
          </div>
        </div>
      </section>
    );
  }

  if (!product) {
    return null;
  }

  return (
    <section className={styles.page} aria-labelledby="admin-product-edit-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin products</p>
        <h1 className={styles.title} id="admin-product-edit-title">
          商品編集
        </h1>
        <p className={styles.lead}>
          Product #{product.productId} の商品情報を編集します。
        </p>
      </div>

      <div className={styles.topActions}>
        <Link className={styles.secondaryLink} href="/admin/products">
          商品一覧へ戻る
        </Link>
      </div>

      <AdminProductForm
        mode="edit"
        initialValues={initialValues}
        isSubmitting={isSubmitting}
        feedback={feedback}
        fieldErrors={fieldErrors}
        onSubmit={handleSubmit}
      />
    </section>
  );
}
