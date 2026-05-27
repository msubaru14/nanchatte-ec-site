const CART_UPDATED_EVENT = "cart:updated";

export const notifyCartUpdated = () => {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CART_UPDATED_EVENT));
  }
};

export const onCartUpdated = (listener: () => void) => {
  window.addEventListener(CART_UPDATED_EVENT, listener);

  return () => {
    window.removeEventListener(CART_UPDATED_EVENT, listener);
  };
};
