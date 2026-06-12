"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import {
  fetchAdminProducts,
  resumeSellingAdminProduct,
  stopSellingAdminProduct,
} from "../../../features/products/api";
import type {
  AdminProduct,
  AdminProductList,
} from "../../../features/products/api";
import { ApiError } from "../../../lib/errors";
import styles from "./AdminProductsPage.module.css";

const ADMIN_PRODUCTS_RETURN_TO = "/admin/products";

const dateTimeFormatter = new Intl.DateTimeFormat("ja-JP", {
  dateStyle: "medium",
  timeStyle: "short",
});

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const percentFormatter = new Intl.NumberFormat("ja-JP", {
  style: "percent",
  maximumFractionDigits: 2,
});

const productStatusLabels: Record<AdminProduct["status"], string> = {
  active: "販売中",
  stopped: "販売停止",
};

const successMessages: Record<string, string> = {
  created: "商品を登録しました。",
  updated: "商品を保存しました。",
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

const getStockStatus = (product: AdminProduct) => {
  if (product.stockQuantity === 0) {
    return "在庫なし";
  }

  if (product.stockQuantity <= product.lowStockThreshold) {
    return "残りわずか";
  }

  return "在庫あり";
};

const getProductListErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "管理者商品一覧を取得できませんでした。";
  }

  if (error.code === ERROR_CODES.FORBIDDEN) {
    return "管理者権限がないため、商品管理画面を表示できません。";
  }

  return error.message;
};

const getOperationErrorMessage = (error: unknown) => {
  if (!(error instanceof ApiError)) {
    return "商品の販売状態を更新できませんでした。";
  }

  if (error.code === ERROR_CODES.NOT_FOUND) {
    return "対象商品が見つかりませんでした。";
  }

  if (
    error.code === ERROR_CODES.VALIDATION_ERROR ||
    error.code === ERROR_CODES.INVALID_REQUEST
  ) {
    return "この商品は現在の状態では操作できません。";
  }

  return error.message;
};

export default function AdminProductsPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [productList, setProductList] = useState<AdminProductList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [operationFeedback, setOperationFeedback] = useState<{
    kind: "error" | "success";
    message: string;
    productId?: number;
  } | null>(null);
  const [operatingProductId, setOperatingProductId] = useState<number | null>(
    null,
  );

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(
      `/admin/login?returnTo=${encodeURIComponent(ADMIN_PRODUCTS_RETURN_TO)}`,
    );
  }, [router, setUser]);

  const loadProducts = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);
    setOperationFeedback(null);

    try {
      const nextProductList = await fetchAdminProducts();
      setProductList(nextProductList);
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setProductList(null);
      setErrorMessage(getProductListErrorMessage(error));
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    const messageKey = new URLSearchParams(window.location.search).get(
      "message",
    );
    const message = messageKey ? successMessages[messageKey] : null;

    if (!message) {
      return;
    }

    setOperationFeedback({
      kind: "success",
      message,
    });
  }, []);

  const updateProduct = (nextProduct: AdminProduct) => {
    setProductList((current) =>
      current
        ? {
            products: current.products.map((product) =>
              product.productId === nextProduct.productId
                ? nextProduct
                : product,
            ),
          }
        : current,
    );
  };

  const handleStopSellingProduct = async (product: AdminProduct) => {
    if (operatingProductId !== null) {
      return;
    }

    const shouldStop = window.confirm("この商品を販売停止にしますか？");

    if (!shouldStop) {
      return;
    }

    setOperatingProductId(product.productId);
    setOperationFeedback(null);

    try {
      const nextProduct = await stopSellingAdminProduct(product.productId);
      updateProduct(nextProduct);
      setOperationFeedback({
        kind: "success",
        message: "商品を販売停止にしました。",
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      setOperationFeedback({
        kind: "error",
        message: getOperationErrorMessage(error),
        productId: product.productId,
      });
    } finally {
      setOperatingProductId(null);
    }
  };

  const handleResumeSellingProduct = async (product: AdminProduct) => {
    if (operatingProductId !== null) {
      return;
    }

    const shouldResume = window.confirm("この商品を販売再開しますか？");

    if (!shouldResume) {
      return;
    }

    setOperatingProductId(product.productId);
    setOperationFeedback(null);

    try {
      const nextProduct = await resumeSellingAdminProduct(product.productId);
      updateProduct(nextProduct);
      setOperationFeedback({
        kind: "success",
        message: "商品を販売再開しました。",
      });
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        redirectToLogin();
        return;
      }

      setOperationFeedback({
        kind: "error",
        message: getOperationErrorMessage(error),
        productId: product.productId,
      });
    } finally {
      setOperatingProductId(null);
    }
  };

  return (
    <section className={styles.page} aria-labelledby="admin-products-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin products</p>
        <h1 className={styles.title} id="admin-products-title">
          商品管理
        </h1>
      </div>

      <div className={styles.toolbar}>
        <Link className={styles.createLink} href="/admin/products/new">
          商品を登録する
        </Link>
      </div>

      {isLoading ? (
        <p className={styles.status} role="status" aria-live="polite">
          管理者商品一覧を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>
            管理者商品一覧を取得できませんでした。
          </p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button
            className={styles.retryButton}
            type="button"
            onClick={loadProducts}
          >
            再読み込み
          </button>
        </div>
      ) : productList && productList.products.length === 0 ? (
        <div className={styles.empty}>
          <p className={styles.emptyMessage}>管理対象の商品はありません。</p>
          {operationFeedback?.kind === "success" ? (
            <p className={styles.successMessage} role="status">
              {operationFeedback.message}
            </p>
          ) : null}
        </div>
      ) : productList ? (
        <>
          {operationFeedback?.kind === "success" ? (
            <p className={styles.successMessage} role="status">
              {operationFeedback.message}
            </p>
          ) : null}
          <ul className={styles.productList}>
            {productList.products.map((product) => (
              <li className={styles.productItem} key={product.productId}>
                <div className={styles.productSummary}>
                  <div className={styles.productHeading}>
                    <div className={styles.productIdentity}>
                      <p className={styles.productId}>
                        Product #{product.productId}
                      </p>
                      <h2 className={styles.productName}>{product.name}</h2>
                    </div>
                    <span
                      className={`${styles.statusBadge} ${
                        styles[`status-${product.status}`]
                      }`}
                    >
                      {productStatusLabels[product.status]}
                    </span>
                  </div>

                  <p className={styles.productDescription}>
                    {getOptionalText(product.description)}
                  </p>

                  <dl className={styles.productMeta}>
                    <div>
                      <dt>価格</dt>
                      <dd>{priceFormatter.format(product.price)}</dd>
                    </div>
                    <div>
                      <dt>税率</dt>
                      <dd>{percentFormatter.format(product.taxRate)}</dd>
                    </div>
                    <div>
                      <dt>Tax Rate ID</dt>
                      <dd>{product.taxRateId}</dd>
                    </div>
                    <div>
                      <dt>Category ID</dt>
                      <dd>{product.categoryId}</dd>
                    </div>
                    <div>
                      <dt>在庫数</dt>
                      <dd>{product.stockQuantity}</dd>
                    </div>
                    <div>
                      <dt>低在庫しきい値</dt>
                      <dd>{product.lowStockThreshold}</dd>
                    </div>
                    <div>
                      <dt>在庫状態</dt>
                      <dd>{getStockStatus(product)}</dd>
                    </div>
                    <div>
                      <dt>作成日時</dt>
                      <dd>{formatDateTime(product.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>更新日時</dt>
                      <dd>{formatDateTime(product.updatedAt)}</dd>
                    </div>
                  </dl>
                  {operationFeedback?.kind === "error" &&
                  operationFeedback.productId === product.productId ? (
                    <p className={styles.operationError} role="alert">
                      {operationFeedback.message}
                    </p>
                  ) : null}
                </div>

                <div className={styles.productActions}>
                  <Link
                    className={styles.productLink}
                    href={`/products/${product.productId}`}
                  >
                    商品詳細を見る
                  </Link>
                  <Link
                    className={styles.productLink}
                    href={`/admin/products/${product.productId}/edit`}
                  >
                    編集
                  </Link>
                  {product.status === "active" ? (
                    <button
                      className={styles.stopButton}
                      type="button"
                      disabled={operatingProductId !== null}
                      onClick={() => void handleStopSellingProduct(product)}
                    >
                      {operatingProductId === product.productId
                        ? "販売停止中..."
                        : "販売停止にする"}
                    </button>
                  ) : (
                    <button
                      className={styles.resumeButton}
                      type="button"
                      disabled={operatingProductId !== null}
                      onClick={() => void handleResumeSellingProduct(product)}
                    >
                      {operatingProductId === product.productId
                        ? "販売再開中..."
                        : "販売再開する"}
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
