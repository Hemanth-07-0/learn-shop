import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { getAuthHeaders } from "../auth";

const CHECKOUT_SCRIPT_URL = "https://checkout.razorpay.com/v1/checkout.js";

function Products({ user, onAddToCart, cartItems, onAuthExpired }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [activeProductId, setActiveProductId] = useState("");
  const [checkoutReady, setCheckoutReady] = useState(false);
  const [lastOrderDebug, setLastOrderDebug] = useState(null);
  const [razorpayConfigured, setRazorpayConfigured] = useState(false);
  const [webhookConfigured, setWebhookConfigured] = useState(false);
  const [paymentMode, setPaymentMode] = useState("upi");
  const [beneficiary, setBeneficiary] = useState(null);
  const isMobileDevice = /Android|iPhone|iPad|iPod/i.test(typeof navigator === "undefined" ? "" : navigator.userAgent);

  useEffect(() => {
    let ignore = false;

    async function loadPaymentConfig() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/config`);
        const data = await response.json();

        if (ignore) return;

        setProducts(Array.isArray(data.products) ? data.products : []);
        setRazorpayConfigured(Boolean(data.configured));
        setWebhookConfigured(Boolean(data.webhookConfigured));
        setBeneficiary(data.beneficiary || null);

        if (!data.configured) {
          setMessageTone("warning");
          setMessage("Razorpay keys are not configured yet. Add them on the backend to accept live payments.");
        }
      } catch (error) {
        if (!ignore) {
          setMessageTone("error");
          setMessage("Unable to load payment options right now.");
        }
      } finally {
        if (!ignore) setLoading(false);
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

  const handleBuyNow = async (product) => {
    if (!user?.token) {
      setMessageTone("warning");
      setMessage("Sign in before starting a real-money checkout so your payment stays tied to your account.");
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

    setActiveProductId(product.id);
    setMessageTone("info");
    setMessage(`Creating secure order for ${product.name}...`);

    try {
      const orderUrl = `${API_BASE_URL}/api/payments/order${user?.token ? `?token=${encodeURIComponent(user.token)}` : ''}`;

      const orderResponse = await fetch(orderUrl, {
        method: "POST",
        headers: {
          ...getAuthHeaders(user),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ productId: product.id, paymentMode }),
      });

      const orderData = await parseApiResponse(orderResponse);
      if (!orderResponse.ok) {
        console.error("Order creation failed:", orderResponse.status, orderData);
        if (orderResponse.status === 401) {
          onAuthExpired?.();
          setMessageTone("error");
          setMessage("Your sign-in session expired. Please sign in again, then start checkout.");
          return;
        }

        setMessageTone("error");
        setMessage(orderData.message || `Unable to create payment order (${orderResponse.status})`);
        return;
      }

      const razorpayKey = orderData.keyId || import.meta.env.VITE_RAZORPAY_KEY_ID;
      // expose minimal debug info on the page to aid troubleshooting QR issues
      setLastOrderDebug({ orderId: orderData.orderId, amount: orderData.amount, key: razorpayKey });
      if (!razorpayKey) {
        throw new Error("Razorpay key ID is missing on client or server");
      }

      console.info("Opening Razorpay checkout with order", orderData.orderId, "amount", orderData.amount);
      const razorpay = new window.Razorpay({
        key: razorpayKey,
        amount: orderData.amount,
        currency: orderData.currency,
        name: "LearnShop",
        description: `${product.name} purchase`,
        order_id: orderData.orderId,
        display: buildDisplayConfig(paymentMode),
        prefill: { name: user?.loginName || "", email: user?.email || "" },
        theme: { color: "#2f6fed" },
        handler: async (paymentResponse) => {
          try {
            const verifyUrl = `${API_BASE_URL}/api/payments/verify${user?.token ? `?token=${encodeURIComponent(user.token)}` : ''}`;

            const verifyResponse = await fetch(verifyUrl, {
              method: "POST",
              headers: { ...getAuthHeaders(user), "Content-Type": "application/json" },
              body: JSON.stringify({ productId: product.id, orderId: orderData.orderId, paymentMode, ...paymentResponse }),
            });

            const verifyData = await parseApiResponse(verifyResponse);
            if (!verifyResponse.ok) {
              console.error("Payment verification failed:", verifyResponse.status, verifyData);
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

            setMessageTone("success");
            setMessage(`Payment confirmed for ${product.name}. Receipt ${verifyData.receiptNumber} is ready on the Payments page.`);
          } catch (error) {
            console.error("Payment handler error:", error);
            setMessageTone("error");
            setMessage(error.message || "Payment completed, but verification failed.");
          } finally {
            setActiveProductId("");
          }
        },
        modal: {
          ondismiss: () => {
            setActiveProductId("");
            setMessageTone("warning");
            setMessage("Payment window closed before completion.");
          },
        },
      });

      razorpay.on("payment.failed", (response) => {
        console.error("Razorpay payment.failed event:", response);
        setActiveProductId("");
        setMessageTone("error");
        const errMsg = response && response.error && (response.error.description || response.error.reason || response.error.reason_code);
        setMessage(errMsg || "Payment failed. Please try again.");
      });

      razorpay.open();
    } catch (error) {
      setActiveProductId("");
      setMessageTone("error");
      setMessage(error.message || "Unable to start payment right now.");
    }
  };

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Solutions</h1>
          <p>Choose a LearnShop plan and pay in real time with Razorpay Standard Checkout. UPI is available now.</p>
        </div>
        <div className="payment-badge">
          <span>Gateway</span>
          <strong>{razorpayConfigured ? "Razorpay Live Flow Ready" : "Awaiting Razorpay Keys"}</strong>
        </div>
      </div>

      <div className="catalog-toolbar">
        <div className="payment-message info compact">
          Cart ready: {cartItems.reduce((sum, item) => sum + item.quantity, 0)} item{cartItems.reduce((sum, item) => sum + item.quantity, 0) === 1 ? "" : "s"} selected.
        </div>
        <Link className="btn btn-outline" to="/cart">
          Open Cart
        </Link>
      </div>

      {!webhookConfigured && razorpayConfigured ? (
        <div className="payment-message warning">
          Razorpay checkout is active, but webhook verification is not configured yet. Payments still verify in-browser, but add
          `RAZORPAY_WEBHOOK_SECRET` on the backend for stronger real-time confirmation.
        </div>
      ) : null}

      <div className="payment-mode-panel">
        <div className="payment-mode-copy">
          <h2>Choose payment mode</h2>
          <p>Pick UPI to open a UPI-only Razorpay checkout. On Android mobile web, supported UPI apps can open directly.</p>
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

      {paymentMode === "upi" && (
        <div className="payment-message info">
          {isMobileDevice
            ? "UPI mode is best tested on Android mobile web, where Razorpay can show supported UPI app intents."
            : "You are on desktop web. Razorpay UPI app intent does not open directly on desktop, so expect a UPI QR or desktop-compatible UPI flow instead."}
        </div>
      )}

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

      {message && <div className={`payment-message ${messageTone}`}>{message}</div>}

      {loading ? (
        <div className="payment-message info">Loading products and payment configuration...</div>
      ) : (
        <div className="products">
          {products.map((product) => (
            <div key={product.id} className="card product-card">
              <div className="product-topline">Real-time checkout</div>
              <h3>{product.name}</h3>
              <p>{product.description}</p>
              <div className="product-price">{formatCurrency(product.amount, product.currency)}</div>
              <div className="product-mode-hint">
                {paymentMode === "upi" ? "Checkout opens with UPI first" : "Checkout opens with full payment mix"}
              </div>
              <div className="product-actions">
                <button type="button" className="btn btn-secondary" onClick={() => onAddToCart(product)}>
                  Add to Cart
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => handleBuyNow(product)}
                  disabled={activeProductId === product.id}
                >
                  {activeProductId === product.id ? "Starting Payment..." : paymentMode === "upi" ? "Pay With UPI" : "Buy With Razorpay"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {lastOrderDebug ? (
        <div className="debug-panel">
          <strong>Last order (debug):</strong>
          <div>orderId: {lastOrderDebug.orderId}</div>
          <div>amount: {lastOrderDebug.amount}</div>
          <div>key: {lastOrderDebug.key}</div>
        </div>
      ) : null}
    </div>
  );
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency, maximumFractionDigits: 2 }).format(amount / 100);
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
  if (contentType.includes("application/json")) return response.json();
  const text = await response.text();
  return { message: text || "Unexpected server response" };
}

export default Products;
