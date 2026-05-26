import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { getAuthHeaders, loadStoredUser } from "../auth";

function Orders({ user: signedInUser }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [authorized, setAuthorized] = useState(false);
  const [user, setUser] = useState(null);

  useEffect(() => {
    let ignore = false;

    async function loadOrders() {
      const currentUser = signedInUser || loadStoredUser();

      if (!currentUser?.email) {
        setLoading(false);
        setMessageTone("warning");
        setMessage("Sign in with the owner account to access all orders.");
        return;
      }

      setUser(currentUser);

      try {
        const statusResponse = await fetch(`${API_BASE_URL}/api/admin/status`, {
          headers: getAuthHeaders(currentUser),
        });
        const statusData = await parseApiResponse(statusResponse);

        if (ignore) {
          return;
        }

        if (!statusResponse.ok) {
          throw new Error(statusData.message || "Unable to validate owner access");
        }

        if (!statusData.configured) {
          setMessageTone("warning");
          setMessage("Set ADMIN_EMAIL in backend/.env to protect the Orders page.");
          setLoading(false);
          return;
        }

        if (!statusData.authorized) {
          setMessageTone("error");
          setMessage("This account is not allowed to view all orders.");
          setLoading(false);
          return;
        }

        setAuthorized(true);

        const response = await fetch(`${API_BASE_URL}/api/payments/orders`, {
          headers: getAuthHeaders(currentUser),
        });
        const data = await parseApiResponse(response);

        if (!response.ok) {
          throw new Error(data.message || "Unable to load orders");
        }

        const nextPayments = Array.isArray(data.payments) ? data.payments : [];
        setPayments(nextPayments);

        if (!nextPayments.length) {
          setMessageTone("info");
          setMessage("No paid orders yet. Once a customer completes payment, it will appear here.");
        } else {
          setMessage("");
        }
      } catch (error) {
        if (!ignore) {
          setMessageTone("error");
          setMessage(error.message || "Unable to load orders right now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadOrders();

    return () => {
      ignore = true;
    };
  }, [signedInUser]);

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>All Orders</h1>
          <p>Owner view of every successful LearnShop payment, including buyer details, receipt numbers, and receipt downloads.</p>
        </div>
        <div className="payment-badge">
          <span>Owner</span>
          <strong>{user?.email || "Not signed in"}</strong>
        </div>
      </div>

      {message && <div className={`payment-message ${messageTone}`}>{message}</div>}

      {loading ? (
        <div className="payment-message info">Loading all orders...</div>
      ) : authorized && payments.length ? (
        <div className="history-grid">
          {payments.map((payment) => (
            <article key={payment.paymentId || payment.orderId} className="card history-card">
              <div className="history-topline">{payment.receiptNumber}</div>
              <h3>{payment.product.name}</h3>
              <p>{payment.product.description}</p>
              <div className="history-line-items">
                {getPaymentItems(payment).map((item) => (
                  <div key={`${payment.orderId}-${item.id}`} className="history-line-item">
                    <span>{item.name} x{item.quantity}</span>
                    <strong>{formatCurrency(item.amount, item.currency || payment.currency)}</strong>
                  </div>
                ))}
              </div>
              <div className="history-meta">
                <span>{formatCurrency(payment.amount, payment.currency)}</span>
                <span>{formatPaidAt(payment.paidAt)}</span>
              </div>
              <div className="history-details">
                <div>Buyer: {payment.customerName || "Guest Checkout"}</div>
                <div>Email: {payment.customerEmail || "Not provided"}</div>
                <div>Address: {payment.customerAddress || "Not provided"}</div>
                <div>Pincode: {payment.customerPincode || "Not provided"}</div>
                <div>Payment ID: {payment.paymentId}</div>
                <div>Order ID: {payment.orderId}</div>
                <div>Mode: {payment.paymentMode || "standard"}</div>
                <div>Status: {payment.verified ? "Verified" : "Pending"}</div>
              </div>
              {payment.verified && payment.paymentId ? (
                <a
                  className="btn btn-secondary receipt-link"
                  href={`${API_BASE_URL}/api/payments/${payment.paymentId}/receipt?token=${encodeURIComponent(user?.token || "")}`}
                >
                  Download Receipt
                </a>
              ) : (
                <button type="button" className="btn btn-secondary receipt-link" disabled>
                  Receipt Available After Capture
                </button>
              )}
            </article>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function getPaymentItems(payment) {
  if (Array.isArray(payment.items) && payment.items.length) {
    return payment.items;
  }

  if (payment.product) {
    return [{
      id: payment.product.id,
      name: payment.product.name,
      quantity: 1,
      amount: payment.amount,
      currency: payment.currency,
    }];
  }

  return [];
}

function formatCurrency(amount, currency) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function formatPaidAt(value) {
  if (!value) {
    return "Awaiting capture";
  }

  const parsedValue = new Date(value);
  return Number.isNaN(parsedValue.getTime()) ? "Awaiting capture" : parsedValue.toLocaleString("en-IN");
}

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return { message: text || "Unexpected server response" };
}

export default Orders;
