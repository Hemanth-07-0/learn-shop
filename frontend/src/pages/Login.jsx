import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Login({ user, onLogin }) {
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("email"); // "email" or "otp"
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    if (user) {
      setMessage(`Already signed in as ${user.email}.`);
      const redirectTimer = setTimeout(() => {
        navigate("/");
      }, 600);

      return () => clearTimeout(redirectTimer);
    }
  }, [user]);

  // Timer for resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const handleRequestOTP = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await parseApiResponse(response);

      if (response.ok) {
        setMessage("OTP sent to your email. Check your inbox!");
        setStep("otp");
        setTimer(60);
      } else {
        setMessage(data.message || `Request failed (${response.status})`);
      }
    } catch (error) {
      setMessage("Cannot reach the LearnShop server. Start the backend and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/login/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await parseApiResponse(response);

      if (response.ok) {
        const loginData = {
          email: data.user.email,
          loginName: data.user.loginName,
          isAdmin: Boolean(data.user.isAdmin),
          token: data.token,
          loggedAt: new Date().toISOString(),
        };
        onLogin(loginData);
        setMessage("Login successful. Redirecting to home...");
        setTimeout(() => {
          navigate("/");
        }, 800);
      } else {
        setMessage(data.message || `Verification failed (${response.status})`);
      }
    } catch (error) {
      setMessage("Cannot reach the LearnShop server. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = async () => {
    if (timer > 0) return;
    setMessage("");
    
    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email }),
      });

      const data = await parseApiResponse(response);
      if (response.ok) {
        setMessage("OTP resent to your email!");
        setTimer(60);
      } else {
        setMessage(data.message || "Failed to resend OTP");
      }
    } catch (error) {
      setMessage("Error resending OTP. Try again.");
    }
  };

  return (
    <div className="page login-page">
      <div className="login-card">
        <div className="form-head">
          <h1>Secure Sign In</h1>
          <p>Enter your email to receive a one-time password.</p>
        </div>

        {step === "email" ? (
          <form className="login-form" onSubmit={handleRequestOTP}>
            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </button>
          </form>
        ) : (
          <form className="login-form" onSubmit={handleVerifyOTP}>
            <label>One-Time Password (OTP)</label>
            <p className="otp-email-display">Sent to: <strong>{email}</strong></p>
            <input
              type="text"
              placeholder="Enter 6-digit OTP"
              value={otp}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              required
              maxLength="6"
              disabled={loading}
              className="otp-input"
            />

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Verifying..." : "Verify & Sign In"}
            </button>

            <div className="otp-actions">
              <button
                type="button"
                className="btn btn-secondary-text"
                onClick={handleResendOTP}
                disabled={timer > 0 || loading}
              >
                {timer > 0 ? `Resend in ${timer}s` : "Resend OTP"}
              </button>
              <button
                type="button"
                className="btn btn-secondary-text"
                onClick={() => {
                  setStep("email");
                  setOtp("");
                  setMessage("");
                }}
                disabled={loading}
              >
                Change Email
              </button>
            </div>
          </form>
        )}

        <p className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        {message && (
          <div className={`login-message ${message.includes("successful") ? "success" : "error"}`}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
}

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return {
    message: text || "Unexpected server response",
  };
}

export default Login;
