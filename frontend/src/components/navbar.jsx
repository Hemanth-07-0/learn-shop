import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { API_BASE_URL } from "../config";
import { getAuthHeaders } from "../auth";

function Navbar({ user, onLogout, cartCount }) {
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function loadAdminStatus() {
      if (!user?.email) {
        setIsAdmin(false);
        return;
      }

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/status`, {
          headers: getAuthHeaders(user),
        });
        const data = await response.json();

        if (!ignore) {
          setIsAdmin(Boolean(response.ok && data.authorized));
        }
      } catch (error) {
        if (!ignore) {
          setIsAdmin(false);
        }
      }
    }

    loadAdminStatus();

    return () => {
      ignore = true;
    };
  }, [user]);

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <h2 className="logo">LearnShop</h2>
        <p className="tagline">Professional learning at scale</p>
      </div>

      <div className="nav-links">
        <Link to="/">Home</Link>
        <Link to="/videos">Videos</Link>
        <Link to="/products">Products</Link>
        <Link to="/cart">Cart{cartCount ? ` (${cartCount})` : ""}</Link>
        {user ? <Link to="/payments">Payments</Link> : null}
        {isAdmin ? <Link to="/orders">Orders</Link> : null}
        {isAdmin ? <Link to="/admin/products">Product Admin</Link> : null}
        {!user ? <Link to="/login">Login</Link> : null}
        {!user ? <Link to="/register">Register</Link> : null}
      </div>

      <div className="nav-actions">
        {user ? (
          <>
            <div className="user-status">
              <span className="user-chip">{user.email}</span>
              {isAdmin ? <span className="admin-badge">Admin</span> : null}
            </div>
            <button type="button" className="btn btn-ghost" onClick={onLogout}>
              Logout
            </button>
          </>
        ) : (
          <Link className="btn btn-outline" to="/login">
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
