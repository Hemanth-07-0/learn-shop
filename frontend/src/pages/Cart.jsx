import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { getAuthHeaders } from "../auth";

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function Cart({ user, cartItems, onUpdateQuantity, onRemoveItem, onClearCart, onAuthExpired }) {
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [paymentMode, setPaymentMode] = useState("upi");
  const [activeCheckout, setActiveCheckout] = useState(false);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [beneficiary, setBeneficiary] = useState(null);

  const totals = useMemo(() => {
    const quantity = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    const amount = cartItems.reduce((sum, item) => sum + (item.amount * item.quantity), 0);
    return { quantity, amount };
  }, [cartItems]);

  useEffect(() => {
    let ignore = false;

    async function loadPaymentConfig() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/config`);
        const data = await response.json();

        if (ignore) {
          return;
        }

        setRazorpayConfigured(Boolean(data.configured));
        setWebhookConfigured(Boolean(data.webhookConfigured));
        setBeneficiary(data.beneficiary || null);
      } catch (error) {
        if (!ignore) {
          setMessageTone("error");
          setMessage("Unable to load payment settings right now.");
        }
      }
    }

    function loadCheckoutScript() {
      if (window.Razorpay) {
        setCheckoutReady(true);
        return;
      }

      const existingScript = document.querySelector(`script[src="${CHECKOUT_SCRIPT_URL}"]`);
      if (existingScript) {
        existingScript.addEventListener("load", () => setCheckoutReady(true), { once: true });
        existingScript.addEventListener("error", () => setCheckoutReady(false), { once: true });
        return;
      }

      const script = document.createElement("script");
      script.src = CHECKOUT_SCRIPT_URL;
      script.async = true;
      script.onload = () => setCheckoutReady(true);
      script.onerror = () => {
        setCheckoutReady(false);
        setMessageTone("error");
        setMessage("Razorpay Checkout failed to load. Please refresh and try again.");
      };
      document.body.appendChild(script);
    }

    loadPaymentConfig();
    loadCheckoutScript();

    return () => {
      ignore = true;
    };
  }, []);

  const handleCheckout = async () => {
    if (!user?.token) {
      setMessageTone("warning");
      setMessage("Sign in before starting checkout so the order stays attached to your account.");
      return;
    }

    if (!cartItems.length) {
      setMessageTone("warning");
      setMessage("Your cart is empty.");
      return;
    }

    if (!razorpayConfigured) {
      setMessageTone("warning");
      setMessage("Razorpay is not configured on the backend yet.");
      return;
    }

    if (!checkoutReady || !window.Razorpay) {
      setMessageTone("error");
      setMessage("Razorpay Checkout is still loading. Please try again in a moment.");
      return;
    }

    setActiveCheckout(true);
    setMessageTone("info");
    setMessage("Creating your cart order...");

    try {
      const payload = {
        items: cartItems.map((item) => ({ productId: item.id, quantity: item.quantity })),
        paymentMode,
      };

      const orderResponse = await fetch(`${API_BASE_URL}/api/payments/order?token=${encodeURIComponent(user.token)}`, {
        method: "POST",
        headers: {
          ...getAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const orderData = await parseApiResponse(orderResponse);
      if (!orderResponse.ok) {
        if (orderResponse.status === 401) {
          onAuthExpired?.();
          setMessageTone("error");
          setMessage("Your sign-in session expired. Please sign in again, then start checkout.");
          setActiveCheckout(false);
          return;
        }

        setMessageTone("error");
        setMessage(orderData.message || `Unable to create payment order (${orderResponse.status})`);
        setActiveCheckout(false);
        return;
      }

      const razorpay = new window.Razorpay({
        key: orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LearnShop",
        description: `${totals.quantity} item checkout`,
        order_id: orderData.orderId,
        display: buildDisplayConfig(paymentMode),
        prefill: {
          name: user?.loginName || "",
          email: user?.email || "",
        },
        theme: { color: "#2f6fed" },
        handler: async (paymentResponse) => {
          try {
            const verifyResponse = await fetch(`${API_BASE_URL}/api/payments/verify?token=${encodeURIComponent(user.token)}`, {
              method: "POST",
              headers: {
                ...getAuthHeaders(user),
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                orderId: orderData.orderId,
                paymentMode,
                ...paymentResponse,
              }),
            });

            const verifyData = await parseApiResponse(verifyResponse);
            if (!verifyResponse.ok) {
              if (verifyResponse.status === 401) {
                onAuthExpired?.();
                setMessageTone("error");
                setMessage("Your sign-in session expired. Please sign in again, then start checkout.");
                return;
              }

              setMessageTone("error");
              setMessage(verifyData.message || `Payment verification failed (${verifyResponse.status})`);
              return;
            }

            onClearCart();
            setMessageTone("success");
            setMessage(`Payment confirmed. Receipt ${verifyData.receiptNumber} is ready on the Payments page.`);
          } catch (error) {
            setMessageTone("error");
            setMessage(error.message || "Payment completed, but verification failed.");
          } finally {
            setActiveCheckout(false);
          }
        },
        modal: {
          ondismiss: () => {
            setActiveCheckout(false);
            setMessageTone("warning");
            setMessage("Payment window closed before completion.");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        setActiveCheckout(false);
        setMessageTone("error");
        const errorMessage = response && response.error && (response.error.description || response.error.reason || response.error.reason_code);
        setMessage(errorMessage || "Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (error) {
      setActiveCheckout(false);
      setMessageTone("error");
      setMessage(error.message || "Unable to start payment right now.");
    }
  };

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Cart Checkout</h1>
          <p>Review your selected courses, adjust quantities, and complete one combined Razorpay payment.</p>
        </div>
        <div className="payment-badge">
          <span>Cart Total</span>
          <strong>{formatCurrency(totals.amount, "INR")}</strong>
        </div>
      </div>

      {!webhookConfigured && razorpayConfigured ? (
        <div className="payment-message warning">
          Webhook confirmation is not configured yet. Checkout still verifies in-browser, but production should add `RAZORPAY_WEBHOOK_SECRET`.
        </div>
      ) : null}

      {beneficiary?.enabled ? (
        <div className="payment-message info">
          Seller receiving details: {beneficiary.name ? `Name ${beneficiary.name}. ` : ""}
          {beneficiary.upiId ? `UPI ${beneficiary.upiId}. ` : ""}
          {beneficiary.bankName ? `Bank ${beneficiary.bankName}. ` : ""}
          {beneficiary.accountName ? `Account ${beneficiary.accountName}. ` : ""}
          {beneficiary.accountNumberMasked ? `A/C ${beneficiary.accountNumberMasked}. ` : ""}
          {beneficiary.ifsc ? `IFSC ${beneficiary.ifsc}.` : ""}
        </div>
      ) : null}

      <div className="payment-mode-panel">
        <div className="payment-mode-copy">
          <h2>Choose payment mode</h2>
          <p>UPI keeps checkout focused for mobile-first payments. Standard mode keeps cards, netbanking, and other methods available.</p>
        </div>
        <div className="payment-mode-toggle" role="tablist" aria-label="Payment mode">
          <button
            type="button"
            className={`payment-mode-button ${paymentMode === "upi" ? "active" : ""}`}
            onClick={() => setPaymentMode("upi")}
          >
            UPI Mode
          </button>
          <button
            type="button"
            className={`payment-mode-button ${paymentMode === "standard" ? "active" : ""}`}
            onClick={() => setPaymentMode("standard")}
          >
            Standard Mode
          </button>
        </div>
      </div>

      {message ? <div className={`payment-message ${messageTone}`}>{message}</div> : null}

      {cartItems.length ? (
        <div className="cart-layout">
          <div className="cart-items">
            {cartItems.map((item) => (
              <article key={item.id} className="card cart-card">
                <div className="cart-card-main">
                  <div className="product-topline">In cart</div>
                  <h3>{item.name}</h3>
                  <p>{item.description}</p>
                </div>
                <div className="cart-card-side">
                  <div className="cart-price">{formatCurrency(item.amount, item.currency)}</div>
                  <label className="cart-qty-control">
                    <span>Qty</span>
                    <input
                      type="number"
                      min="1"
                      value={item.quantity}
                      onChange={(event) => onUpdateQuantity(item.id, event.target.value)}
                    />
                  </label>
                  <div className="cart-line-total">{formatCurrency(item.amount * item.quantity, item.currency)}</div>
                  <button type="button" className="btn btn-secondary" onClick={() => onRemoveItem(item.id)}>
                    Remove
                  </button>
                </div>
              </article>
            ))}
          </div>

          <aside className="card cart-summary">
            <div className="product-topline">Summary</div>
            <h2>{totals.quantity} item{totals.quantity === 1 ? "" : "s"}</h2>
            <div className="cart-summary-rows">
              <div>
                <span>Subtotal</span>
                <strong>{formatCurrency(totals.amount, "INR")}</strong>
              </div>
              <div>
                <span>Gateway</span>
                <strong>{razorpayConfigured ? "Razorpay ready" : "Setup pending"}</strong>
              </div>
            </div>
            <button type="button" className="btn btn-primary cart-checkout-button" onClick={handleCheckout} disabled={activeCheckout}>
              {activeCheckout ? "Starting Payment..." : paymentMode === "upi" ? "Pay Cart With UPI" : "Pay Cart With Razorpay"}
            </button>
            <button type="button" className="btn btn-outline cart-clear-button" onClick={onClearCart} disabled={activeCheckout}>
              Clear Cart
            </button>
          </aside>
        </div>
      ) : (
        <div className="card empty-cart">
          <h2>Your cart is empty</h2>
          <p>Add products from the catalog, then come back here to complete checkout in one payment.</p>
          <Link className="btn btn-primary" to="/products">
            Browse Products
          </Link>
        </div>
      )}
    </div>
  );
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function buildDisplayConfig(paymentMode) {
  if (paymentMode === "upi") {
    return {
      sequence: ["upi"],
      hide: [
        { method: "card" },
        { method: "netbanking" },
        { method: "wallet" },
        { method: "emi" },
        { method: "paylater" },
      ],
      preferences: { show_default_blocks: false },
    };
  }

  return { sequence: ["card", "upi", "netbanking"], preferences: { show_default_blocks: true } };
}

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return { message: text || "Unexpected server response" };
}

export default Cart;
