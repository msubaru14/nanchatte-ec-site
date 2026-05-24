"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import { ERROR_CODES } from "../../constants/errorCodes";
import { useAuth } from "../../contexts/AuthContext";
import {
  deleteAllCartItems,
  deleteCartItem,
  fetchCart,
  updateCartItemQuantity,
} from "../../features/cart/api";
import type { Cart, CartItem, CartStockStatus } from "../../features/cart/api";
import { ApiError } from "../../lib/errors";
import styles from "./CartPage.module.css";

const CART_RETURN_TO = "/cart";

const priceFormatter = new Intl.NumberFormat("ja-JP", {
  style: "currency",
  currency: "JPY",
  maximumFractionDigits: 0,
});

const stockStatusLabels: Record<CartStockStatus, string> = {
  in_stock: "在庫あり",
  low_stock: "残りわずか",
  out_of_stock: "在庫なし",
};

const stockStatusClassNames: Record<CartStockStatus, string> = {
  in_stock: styles.inStock,
  low_stock: styles.lowStock,
  out_of_stock: styles.outOfStock,
};

type OperationError = {
  productId: number;
  message: string;
};

type DraftQuantities = Record<number, number>;

const createDraftQuantities = (cart: Cart): DraftQuantities => {
  return Object.fromEntries(
    cart.items.map((item) => [item.productId, item.quantity]),
  );
};

const retainDraftQuantities = (
  cart: Cart,
  current: DraftQuantities,
  reflectedProductId: number,
): DraftQuantities => {
  return Object.fromEntries(
    cart.items.map((item) => {
      if (item.productId === reflectedProductId || !item.canBePurchased) {
        return [item.productId, item.quantity];
      }

      const draftQuantity = current[item.productId] ?? item.quantity;
      return [
        item.productId,
        Math.min(Math.max(draftQuantity, 1), item.maxSelectableQuantity),
      ];
    }),
  );
};

export default function CartPage() {
  const router = useRouter();
  const { setUser } = useAuth();
  const [cart, setCart] = useState<Cart | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<number | null>(null);
  const [isClearingCart, setIsClearingCart] = useState(false);
  const [operationError, setOperationError] = useState<OperationError | null>(null);
  const [clearErrorMessage, setClearErrorMessage] = useState<string | null>(null);
  const [draftQuantities, setDraftQuantities] = useState<DraftQuantities>({});

  const redirectToLogin = useCallback(() => {
    setUser(null);
    router.replace(`/login?returnTo=${encodeURIComponent(CART_RETURN_TO)}`);
  }, [router, setUser]);

  const loadCart = useCallback(async () => {
    let isRedirectingToLogin = false;

    setIsLoading(true);
    setErrorMessage(null);
    setOperationError(null);
    setClearErrorMessage(null);

    try {
      const nextCart = await fetchCart();
      setCart(nextCart);
      setDraftQuantities(createDraftQuantities(nextCart));
    } catch (error) {
      if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
        isRedirectingToLogin = true;
        redirectToLogin();
        return;
      }

      setCart(null);
      setErrorMessage(
        error instanceof ApiError
          ? error.message
          : "カート情報を取得できませんでした。",
      );
    } finally {
      if (!isRedirectingToLogin) {
        setIsLoading(false);
      }
    }
  }, [redirectToLogin]);

  useEffect(() => {
    void loadCart();
  }, [loadCart]);

  const applyRefreshedCart = (nextCart: Cart, reflectedProductId: number) => {
    setCart(nextCart);
    setDraftQuantities((current) =>
      retainDraftQuantities(nextCart, current, reflectedProductId),
    );
  };

  const isOperating =
    updatingProductId !== null || deletingProductId !== null || isClearingCart;

  const handleDraftQuantityChange = (item: CartItem, nextQuantity: number) => {
    if (
      isOperating ||
      !item.canBePurchased ||
      nextQuantity < 1 ||
      nextQuantity > item.maxSelectableQuantity
    ) {
      return;
    }

    setDraftQuantities((current) => ({
      ...current,
      [item.productId]: nextQuantity,
    }));
    setOperationError((current) =>
      current?.productId === item.productId ? null : current,
    );
  };

  const handleQuantityReflect = async (item: CartItem) => {
    const draftQuantity = draftQuantities[item.productId] ?? item.quantity;

    if (
      isOperating ||
      !item.canBePurchased ||
      draftQuantity === item.quantity ||
      draftQuantity < 1 ||
      draftQuantity > item.maxSelectableQuantity
    ) {
      return;
    }

    setUpdatingProductId(item.productId);
    setOperationError(null);
    setClearErrorMessage(null);

    try {
      try {
        await updateCartItemQuantity(item.productId, { quantity: draftQuantity });
      } catch (error) {
        if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
          redirectToLogin();
          return;
        }

        let message = "数量の変更に失敗しました。";
        if (error instanceof ApiError && error.code === ERROR_CODES.OUT_OF_STOCK) {
          message = "在庫が不足しているため、数量を変更できませんでした。";

          try {
            const nextCart = await fetchCart();
            applyRefreshedCart(nextCart, item.productId);
          } catch (refreshError) {
            if (
              refreshError instanceof ApiError &&
              refreshError.code === ERROR_CODES.UNAUTHORIZED
            ) {
              redirectToLogin();
              return;
            }
          }
        } else if (
          error instanceof ApiError &&
          error.code === ERROR_CODES.VALIDATION_ERROR
        ) {
          message = "この商品の数量は変更できません。";
        }

        setOperationError({ productId: item.productId, message });
        return;
      }

      try {
        const nextCart = await fetchCart();
        applyRefreshedCart(nextCart, item.productId);
      } catch (error) {
        if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
          redirectToLogin();
          return;
        }

        setOperationError({
          productId: item.productId,
          message: "数量は変更されましたが、最新のカート情報を取得できませんでした。",
        });
      }
    } finally {
      setUpdatingProductId(null);
    }
  };

  const handleDeleteItem = async (item: CartItem) => {
    if (isOperating) {
      return;
    }

    setDeletingProductId(item.productId);
    setOperationError(null);
    setClearErrorMessage(null);

    try {
      try {
        await deleteCartItem(item.productId);
      } catch (error) {
        if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
          redirectToLogin();
          return;
        }

        setOperationError({
          productId: item.productId,
          message: "商品の削除に失敗しました。",
        });
        return;
      }

      try {
        const nextCart = await fetchCart();
        applyRefreshedCart(nextCart, item.productId);
      } catch (error) {
        if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
          redirectToLogin();
          return;
        }

        setOperationError({
          productId: item.productId,
          message: "商品は削除されましたが、最新のカート情報を取得できませんでした。",
        });
      }
    } finally {
      setDeletingProductId(null);
    }
  };

  const handleDeleteAllItems = async () => {
    if (isOperating) {
      return;
    }

    setIsClearingCart(true);
    setOperationError(null);
    setClearErrorMessage(null);

    try {
      try {
        await deleteAllCartItems();
      } catch (error) {
        if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
          redirectToLogin();
          return;
        }

        setClearErrorMessage("カート内の商品をすべて削除できませんでした。");
        return;
      }

      try {
        const nextCart = await fetchCart();
        setCart(nextCart);
        setDraftQuantities(createDraftQuantities(nextCart));
      } catch (error) {
        if (error instanceof ApiError && error.code === ERROR_CODES.UNAUTHORIZED) {
          redirectToLogin();
          return;
        }

        setClearErrorMessage(
          "商品は削除されましたが、最新のカート情報を取得できませんでした。",
        );
      }
    } finally {
      setIsClearingCart(false);
    }
  };

  const hasDraftChanges =
    cart?.items.some(
      (item) => (draftQuantities[item.productId] ?? item.quantity) !== item.quantity,
    ) ?? false;

  return (
    <section className={styles.page} aria-labelledby="cart-title">
      <div className={styles.header}>
        <p className={styles.eyebrow}>Cart</p>
        <h1 className={styles.title} id="cart-title">
          カート
        </h1>
      </div>

      {isLoading ? (
        <p className={styles.status} aria-live="polite">
          カート情報を読み込み中...
        </p>
      ) : errorMessage ? (
        <div className={styles.errorPanel} role="alert">
          <p className={styles.errorTitle}>カート情報を取得できませんでした。</p>
          <p className={styles.errorMessage}>{errorMessage}</p>
          <button className={styles.retryButton} type="button" onClick={loadCart}>
            再読み込み
          </button>
        </div>
      ) : cart ? (
        cart.items.length === 0 ? (
          <p className={styles.empty}>カートに商品がありません。</p>
        ) : (
          <div className={styles.cartLayout}>
            <ul className={styles.itemList}>
              {cart.items.map((item) => {
                const draftQuantity = draftQuantities[item.productId] ?? item.quantity;
                const isQuantityChanged = draftQuantity !== item.quantity;

                return (
                  <li className={styles.item} key={item.productId}>
                    <div className={styles.imageFrame}>
                      {item.imageUrl ? (
                        <img className={styles.image} src={item.imageUrl} alt={item.name} />
                      ) : (
                        <span className={styles.placeholder}>No Image</span>
                      )}
                    </div>

                    <div className={styles.itemBody}>
                      <div className={styles.itemHeader}>
                        <h2 className={styles.itemName}>{item.name}</h2>
                        <span
                          className={`${styles.stock} ${stockStatusClassNames[item.stockStatus]}`}
                        >
                          {stockStatusLabels[item.stockStatus]}
                        </span>
                      </div>
                      <p className={styles.price}>
                        {priceFormatter.format(item.priceIncludingTax)}
                        <span className={styles.taxLabel}>(税込)</span>
                      </p>
                      <div className={styles.quantityRow}>
                        <span className={styles.quantityLabel}>数量</span>
                        <div className={styles.stepper} aria-label={`${item.name}の数量`}>
                          <button
                            className={styles.stepperButton}
                            type="button"
                            aria-label={`${item.name}の数量を減らす`}
                            disabled={
                              isOperating ||
                              !item.canBePurchased ||
                              draftQuantity <= 1
                            }
                            onClick={() =>
                              handleDraftQuantityChange(item, draftQuantity - 1)
                            }
                          >
                            -
                          </button>
                          <span className={styles.quantityValue}>{draftQuantity}</span>
                          <button
                            className={styles.stepperButton}
                            type="button"
                            aria-label={`${item.name}の数量を増やす`}
                            disabled={
                              isOperating ||
                              !item.canBePurchased ||
                              draftQuantity >= item.maxSelectableQuantity
                            }
                            onClick={() =>
                              handleDraftQuantityChange(item, draftQuantity + 1)
                            }
                          >
                            +
                          </button>
                        </div>
                        {updatingProductId === item.productId && (
                          <span className={styles.updating} aria-live="polite">
                            更新中...
                          </span>
                        )}
                      </div>
                      {isQuantityChanged && (
                        <button
                          className={styles.reflectButton}
                          type="button"
                          disabled={isOperating || !item.canBePurchased}
                          onClick={() => void handleQuantityReflect(item)}
                        >
                          料金を再計算
                        </button>
                      )}
                      <button
                        className={styles.deleteButton}
                        type="button"
                        disabled={isOperating}
                        onClick={() => void handleDeleteItem(item)}
                      >
                        {deletingProductId === item.productId
                          ? "削除中..."
                          : "カートから削除"}
                      </button>
                      {operationError?.productId === item.productId && (
                        <p className={styles.operationError} role="alert">
                          {operationError.message}
                        </p>
                      )}
                      {!item.canBePurchased && (
                        <p className={styles.unavailable}>
                          この商品は現在購入できません。
                        </p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>

            <aside className={styles.summary} aria-label="カート合計">
              <p className={styles.summaryLabel}>合計金額</p>
              <p className={styles.total}>{priceFormatter.format(cart.totalAmount)}</p>
              <p className={styles.summaryNote}>税込</p>
              {hasDraftChanges && (
                <p className={styles.pendingNote}>
                  変更した数量は「料金を再計算」で合計に反映されます。
                </p>
              )}
              {clearErrorMessage && (
                <p className={styles.clearError} role="alert">
                  {clearErrorMessage}
                </p>
              )}
              <button
                className={styles.clearButton}
                type="button"
                disabled={isOperating}
                onClick={() => void handleDeleteAllItems()}
              >
                {isClearingCart ? "全削除中..." : "カートを空にする"}
              </button>
            </aside>
          </div>
        )
      ) : null}
    </section>
  );
}
