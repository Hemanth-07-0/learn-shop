import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { getAuthHeaders } from "../auth";

function PaymentHistory({ user }) {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");

  useEffect(() => {
    let ignore = false;

    async function loadPayments() {
      if (!user?.email) {
        setLoading(false);
        setMessageTone("warning");
        setMessage("Sign in to view your payment history and download receipts.");
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/payments/history`, {
          headers: getAuthHeaders(user),
        });
        const data = await parseApiResponse(response);

        if (ignore) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Unable to load payment history");
        }

        const nextPayments = Array.isArray(data.payments) ? data.payments : [];
        setPayments(nextPayments);

        if (!nextPayments.length) {
          setMessageTone("info");
          setMessage("No successful payments recorded yet. Complete a checkout and it will appear here.");
        } else {
          setMessage("");
        }
      } catch (error) {
        if (!ignore) {
          setMessageTone("error");
          setMessage(error.message || "Unable to load payment history right now.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadPayments();

    return () => {
      ignore = true;
    };
  }, [user]);

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Payment History</h1>
          <p>Review successful LearnShop purchases and download a receipt for each verified payment.</p>
        </div>
        <div className="payment-badge">
          <span>Account</span>
          <strong>{user?.email || "Guest View"}</strong>
        </div>
      </div>

      {message && <div className={`payment-message ${messageTone}`}>{message}</div>}

      {loading ? (
        <div className="payment-message info">Loading payment history...</div>
      ) : payments.length ? (
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
                <div>Payment ID: {payment.paymentId}</div>
                <div>Mode: {payment.paymentMode || "standard"}</div>
                <div>Status: {payment.verified ? "Verified" : "Pending"}</div>
              </div>
              {payment.verified && payment.paymentId ? (
                <a
                  className="btn btn-secondary receipt-link"
                  href={`${API_BASE_URL}/api/payments/${payment.paymentId}/receipt?token=${encodeURIComponent(user.token || "")}`}
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

export default PaymentHistory;
