import type { OrderCreateResult } from "../api";

const LATEST_ORDER_STORAGE_KEY = "latestOrder";

export const storeLatestOrder = (order: OrderCreateResult) => {
  try {
    sessionStorage.setItem(LATEST_ORDER_STORAGE_KEY, JSON.stringify(order));
  } catch {
    // 注文自体は成功しているため、保存失敗では遷移を止めない。
  }
};

export const loadLatestOrder = () => {
  try {
    const json = sessionStorage.getItem(LATEST_ORDER_STORAGE_KEY);

    if (!json) {
      return null;
    }

    return JSON.parse(json) as OrderCreateResult;
  } catch {
    return null;
  }
};
