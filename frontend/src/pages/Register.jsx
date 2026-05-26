import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../config";

function Register() {
  const [loginName, setLoginName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [address, setAddress] = useState("");
  const [pincode, setPincode] = useState("");
  const [message, setMessage] = useState("");
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

  const handleSubmit = async (event) => {
    event.preventDefault();

    try {
      const response = await fetch(`${API_BASE_URL}/api/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          loginName,
          email,
          password,
          address,
          pincode,
        }),
      });

      const data = await parseApiResponse(response);

      if (response.ok) {
        setMessage("Registration successful. Please login.");
        setTimeout(() => {
          navigate("/login");
        }, 2000);
      } else {
        setMessage(data.message || `Registration failed (${response.status})`);
      }
    } catch (error) {
      setMessage("Cannot reach the LearnShop server. Start the backend and try again.");
    }
  };

  return (
    <div className="page register-page">
      <div className="login-card">
        <div className="form-head">
          <h1>Register</h1>
          <p>Create your LearnShop account.</p>
        </div>

        <form className="login-form" onSubmit={handleSubmit}>
          <label>Login Name</label>
          <input
            type="text"
            placeholder="Your login name"
            value={loginName}
            onChange={(e) => setLoginName(e.target.value)}
            required
          />

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

          <label>Address</label>
          <input
            type="text"
            placeholder="Your address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
          />

          <label>Pincode</label>
          <input
            type="text"
            placeholder="Your pincode"
            value={pincode}
            onChange={(e) => setPincode(e.target.value)}
            required
          />

          <button type="submit" className="btn btn-primary">
            Register
          </button>
        </form>

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

export default Register;
