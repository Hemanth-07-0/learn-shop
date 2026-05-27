import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Register() {
  const [loginName, setLoginName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [otp, setOtp] = useState("");
  const [message, setMessage] = useState("");
  const [step, setStep] = useState("details"); // "details" or "otp"
  const [loading, setLoading] = useState(false);
  const [timer, setTimer] = useState(0);
  const navigate = useNavigate();

  useEffect(() => {
    const savedUser = localStorage.getItem("learnshopUser");
    if (!savedUser) {
      return undefined;
    }

    setMessage("You are already signed in. Redirecting to home...");
    const redirectTimer = setTimeout(() => {
      navigate("/");
    }, 600);

    return () => clearTimeout(redirectTimer);
  }, [navigate]);

  // Timer for resend OTP
  useEffect(() => {
    if (timer > 0) {
      const interval = setTimeout(() => setTimer(timer - 1), 1000);
      return () => clearTimeout(interval);
    }
  }, [timer]);

  const handleDetailsSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginName,
          email,
          address,
          pincode,
        }),
      });

      const data = await parseApiResponse(response);

      if (response.ok) {
        setMessage("OTP sent to your email. Verify to complete registration.");
        setStep("otp");
        setTimer(60);
      } else {
        setMessage(data.message || `Registration failed (${response.status})`);
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
      const response = await fetch(`${API_BASE_URL}/api/register/verify-otp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ email, otp }),
      });

      const data = await parseApiResponse(response);

      if (response.ok) {
        setMessage("Registration verified successfully. Please login now.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
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
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginName,
          email,
          address,
          pincode,
        }),
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
    <div className="page register-page">
      <div className="login-card">
        <div className="form-head">
          <h1>Create Account</h1>
          <p>Join LearnShop today. Fill in your details to get started.</p>
        </div>

        {step === "details" ? (
          <form className="login-form" onSubmit={handleDetailsSubmit}>
            <label>Login Name</label>
            <input
              type="text"
              placeholder="Your login name"
              value={loginName}
              onChange={(e) => setLoginName(e.target.value)}
              required
              disabled={loading}
            />

            <label>Email Address</label>
            <input
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
            />

            <label>Address</label>
            <input
              type="text"
              placeholder="Your address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
              disabled={loading}
            />

            <label>Pincode</label>
            <input
              type="text"
              placeholder="Your pincode (4-10 digits)"
              value={pincode}
              onChange={(e) => setPincode(e.target.value.replace(/\D/g, '').slice(0, 10))}
              required
              disabled={loading}
            />

            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? "Registering..." : "Register & Send OTP"}
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
              {loading ? "Verifying..." : "Verify & Complete Registration"}
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
                  setStep("details");
                  setOtp("");
                  setMessage("");
                }}
                disabled={loading}
              >
                Back to Details
              </button>
            </div>
          </form>
        )}

        {message && (
          <div className={`login-message ${message.includes("successfully") ? "success" : "error"}`}>
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

export default Register;
