import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "./components/navbar";
import Home from "./pages/Home";
import Videos from "./pages/Videos";
import Products from "./pages/Products";
import Cart from "./pages/Cart";
import AdminProducts from "./pages/AdminProducts";
import PaymentHistory from "./pages/PaymentHistory";
import Orders from "./pages/Orders";
import Login from "./pages/Login";
import Register from "./pages/Register";
import { API_BASE_URL } from "./config";
import { clearStoredUser, getAuthHeaders, loadStoredUser, saveStoredUser } from "./auth";
import { clearStoredCart, loadStoredCart, saveStoredCart } from "./cart";

function App() {
  const [user, setUser] = useState(null);
  const [cartItems, setCartItems] = useState([]);

  useEffect(() => {
    const storedUser = loadStoredUser();
    setUser(storedUser);
    setCartItems(loadStoredCart());

    if (!storedUser?.token) {
      return undefined;
    }

    let ignore = false;

    async function validateStoredSession() {
      try {
        const response = await fetch(`${API_BASE_URL}/api/auth/me`, {
          headers: getAuthHeaders(storedUser),
        });

        if (ignore) {
          return;
        }

        if (response.status === 401) {
          clearStoredUser();
          setUser(null);
        }
      } catch (error) {
        // Keep the stored user if the backend is temporarily unavailable.
      }
    }

    validateStoredSession();

    return () => {
      ignore = true;
    };
  }, []);

  const handleLogin = (userData) => {
    saveStoredUser(userData);
    setUser(userData);
  };

  const handleLogout = () => {
    clearStoredUser();
    setUser(null);
  };

  const handleAuthExpired = () => {
    clearStoredUser();
    setUser(null);
  };

  const persistCart = (nextCartItems) => {
    setCartItems(nextCartItems);
    saveStoredCart(nextCartItems);
  };

  const handleAddToCart = (product) => {
    const existingItem = cartItems.find((item) => item.id === product.id);
    const nextCartItems = existingItem
      ? cartItems.map((item) => item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item)
      : [...cartItems, { ...product, quantity: 1 }];
    persistCart(nextCartItems);
  };

  const handleUpdateCartQuantity = (productId, nextQuantityValue) => {
    const nextQuantity = Math.max(1, Number(nextQuantityValue) || 1);
    persistCart(cartItems.map((item) => item.id === productId ? { ...item, quantity: nextQuantity } : item));
  };

  const handleRemoveCartItem = (productId) => {
    persistCart(cartItems.filter((item) => item.id !== productId));
  };

  const handleClearCart = () => {
    setCartItems([]);
    clearStoredCart();
  };

  return (
    <BrowserRouter>
      <Navbar user={user} onLogout={handleLogout} cartCount={cartItems.reduce((sum, item) => sum + item.quantity, 0)} />
      <div className="container">
        <Routes>
          <Route path="/" element={<Home user={user} />} />
          <Route path="/videos" element={<Videos />} />
          <Route
            path="/products"
            element={
              <Products
                user={user}
                onAddToCart={handleAddToCart}
                cartItems={cartItems}
                onAuthExpired={handleAuthExpired}
              />
            }
          />
          <Route
            path="/cart"
            element={
              <Cart
                user={user}
                cartItems={cartItems}
                onUpdateQuantity={handleUpdateCartQuantity}
                onRemoveItem={handleRemoveCartItem}
                onClearCart={handleClearCart}
                onAuthExpired={handleAuthExpired}
              />
            }
          />
          <Route path="/admin/products" element={<AdminProducts user={user} />} />
          <Route path="/payments" element={<PaymentHistory user={user} />} />
          <Route path="/orders" element={<Orders user={user} />} />
          <Route path="/login" element={<Login user={user} onLogin={handleLogin} />} />
          <Route path="/register" element={<Register />} />
        </Routes>
        <footer className="footer">
          {"\u00A9"} {new Date().getFullYear()} LearnShop. Professional learning crafted for modern teams.
        </footer>
      </div>
    </BrowserRouter>
  );
}

export default App;
