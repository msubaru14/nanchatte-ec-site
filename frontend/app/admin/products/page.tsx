"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../../constants/errorCodes";
import { useAuth } from "../../../contexts/AuthContext";
import { fetchAdminProducts } from "../../../features/products/api";
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

export default function AdminProductsPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [productList, setProductList] = useState<AdminProductList | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

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

  return (
    <section className={styles.page} aria-labelledby="admin-products-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Admin products</p>
        <h1 className={styles.title} id="admin-products-title">
          商品管理
        </h1>
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
        </div>
      ) : productList ? (
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
              </div>

              <div className={styles.productActions}>
                <Link
                  className={styles.productLink}
                  href={`/products/${product.productId}`}
                >
                  商品詳細を見る
                </Link>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
