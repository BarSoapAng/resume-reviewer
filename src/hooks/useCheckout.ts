import { useState } from "react";
import { createCheckout } from "../lib/api";

export function useCheckout(onError: (message: string) => void) {
  const [checkoutPending, setCheckoutPending] = useState(false);
  const openCheckout = async () => {
    const checkout = window.open("about:blank", "_blank");
    if (!checkout) { onError("Allow pop-ups to open Stripe checkout"); return; }
    checkout.opener = null;
    setCheckoutPending(true);
    try {
      const { url } = await createCheckout();
      checkout.location.href = url;
    } catch (error) {
      checkout.close();
      onError(error instanceof Error ? error.message : "Could not open checkout");
    } finally { setCheckoutPending(false); }
  };
  return { checkoutPending, openCheckout };
}
