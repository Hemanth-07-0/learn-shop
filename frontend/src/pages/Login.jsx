import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Login({ user, onLogin }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
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
        setMessage(data.message || `Login failed (${response.status})`);
      }
    } catch (error) {
      setMessage("Cannot reach the LearnShop server. Start the backend and try again.");
    }
  };

  return (
    <div className="page login-page">
      <div className="login-card">
        <div className="form-head">
          <h1>Secure sign in</h1>
          <p>Store your login details locally for a fast return to LearnShop.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>Email address</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <label>Password</label>
          <input
            type="password"
            placeholder="Enter secure password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />

          <button type="submit" className="btn btn-primary">
            Sign In
          </button>
        </form>

        <p className="register-link">
          Don't have an account? <Link to="/register">Register here</Link>
        </p>

        {message && <div className="login-message">{message}</div>}
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
