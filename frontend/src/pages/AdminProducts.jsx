import { useEffect, useState } from "react";
import { API_BASE_URL } from "../config";
import { getAuthHeaders, loadStoredUser } from "../auth";

function AdminProducts({ user: signedInUser }) {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [messageTone, setMessageTone] = useState("info");
  const [editingId, setEditingId] = useState("");
  const [form, setForm] = useState({ id: "", name: "", description: "", amount: "" });

  useEffect(() => {
    let ignore = false;

    async function loadAdminProducts() {
      const currentUser = signedInUser || loadStoredUser();
      if (!currentUser?.email) {
        setMessageTone("warning");
        setMessage("Sign in as the owner account to manage products.");
        setLoading(false);
        return;
      }

      setUser(currentUser);
      setLoading(true);
      setMessage("");

      try {
        const response = await fetch(`${API_BASE_URL}/api/admin/products`, {
          headers: getAuthHeaders(currentUser),
        });
        const data = await parseApiResponse(response);

        if (ignore) {
          return;
        }

        if (!response.ok) {
          throw new Error(data.message || "Unable to load product settings.");
        }

        setProducts(Array.isArray(data.products) ? data.products : []);
        if (!Array.isArray(data.products) || !data.products.length) {
          setMessageTone("info");
          setMessage("No products are configured yet. Add one with the form below.");
        }
      } catch (error) {
        if (!ignore) {
          setMessageTone("error");
          setMessage(error.message || "Unable to load product configuration.");
        }
      } finally {
        if (!ignore) {
          setLoading(false);
        }
      }
    }

    loadAdminProducts();
    return () => {
      ignore = true;
    };
  }, [signedInUser]);

  function parseAmountToPaise(value) {
    const parsed = parseFloat(value.toString().replace(/,/g, ""));
    if (!Number.isFinite(parsed)) {
      return NaN;
    }
    return Math.round(parsed * 100);
  }

  const handleInputChange = (field) => (event) => {
    setForm({ ...form, [field]: event.target.value });
  };

  const resetForm = () => {
    setForm({ id: "", name: "", description: "", amount: "" });
    setEditingId("");
  };

  const refreshProducts = async () => {
    const currentUser = user || loadStoredUser();
    if (!currentUser?.email) {
      return;
    }

    const response = await fetch(`${API_BASE_URL}/api/admin/products`, {
      headers: getAuthHeaders(currentUser),
    });
    const data = await parseApiResponse(response);
    if (response.ok) {
      setProducts(Array.isArray(data.products) ? data.products : []);
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const currentUser = user || loadStoredUser();
    if (!currentUser?.email) {
      setMessageTone("warning");
      setMessage("Sign in as the owner account to manage products.");
      return;
    }

    const amountPaise = parseAmountToPaise(form.amount);
    if (!form.id || !form.name || !form.description || !Number.isFinite(amountPaise) || amountPaise < 100) {
      setMessageTone("error");
      setMessage("Fill all fields and enter a price of at least ₹1.00.");
      return;
    }

    try {
      const method = editingId ? "PUT" : "POST";
      const url = editingId
        ? `${API_BASE_URL}/api/admin/products/${encodeURIComponent(editingId)}`
        : `${API_BASE_URL}/api/admin/products`;

      const response = await fetch(url, {
        method,
        headers: {
          ...getAuthHeaders(currentUser),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          id: form.id.trim(),
          name: form.name.trim(),
          description: form.description.trim(),
          amount: amountPaise,
        }),
      });

      const data = await parseApiResponse(response);
      if (!response.ok) {
        throw new Error(data.message || "Unable to save product.");
      }

      setMessageTone("success");
      setMessage(editingId ? "Product updated successfully." : "Product added successfully.");
      resetForm();
      await refreshProducts();
    } catch (error) {
      setMessageTone("error");
      setMessage(error.message || "Unable to save product.");
    }
  };

  const handleEdit = (product) => {
    setForm({
      id: product.id,
      name: product.name,
      description: product.description,
      amount: product.amount ? (product.amount / 100).toFixed(2) : "",
    });
    setEditingId(product.id);
    setMessage("");
  };

  const handleDelete = async (productId) => {
    const currentUser = user || loadStoredUser();
    if (!currentUser?.email) {
      return;
    }

    if (!window.confirm("Delete this product? This cannot be undone.")) {
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/admin/products/${encodeURIComponent(productId)}`, {
        method: "DELETE",
        headers: getAuthHeaders(currentUser),
      });
      const data = await parseApiResponse(response);
      if (!response.ok) {
        throw new Error(data.message || "Unable to delete product.");
      }

      setMessageTone("success");
      setMessage("Product removed successfully.");
      await refreshProducts();
    } catch (error) {
      setMessageTone("error");
      setMessage(error.message || "Unable to delete product.");
    }
  };

  return (
    <div className="page">
      <div className="section-head">
        <div>
          <h1>Product Catalog Admin</h1>
          <p>Manage LearnShop products and prices directly from the admin interface.</p>
        </div>
        <div className="payment-badge">
          <span>Owner</span>
          <strong>{user?.email || "Not signed in"}</strong>
        </div>
      </div>

      {message && <div className={`payment-message ${messageTone}`}>{message}</div>}

      {loading ? (
        <div className="payment-message info">Loading admin product configuration...</div>
      ) : (
        <>
          <section className="card admin-card">
            <h2>{editingId ? "Edit product" : "Add new product"}</h2>
            <form className="admin-form" onSubmit={handleSubmit}>
              <label>
                Product ID
                <input
                  type="text"
                  value={form.id}
                  onChange={handleInputChange("id")}
                  disabled={Boolean(editingId)}
                  placeholder="intro-eating"
                />
              </label>
              <label>
                Name
                <input
                  type="text"
                  value={form.name}
                  onChange={handleInputChange("name")}
                  placeholder="Introduction to Eating"
                />
              </label>
              <label>
                Description
                <textarea
                  value={form.description}
                  onChange={handleInputChange("description")}
                  placeholder="A guided starter program..."
                />
              </label>
              <label>
                Price (₹)
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={form.amount}
                  onChange={handleInputChange("amount")}
                  placeholder="499.00"
                />
              </label>
              <div className="admin-form-actions">
                <button type="submit" className="btn btn-primary">
                  {editingId ? "Save changes" : "Add product"}
                </button>
                {editingId ? (
                  <button type="button" className="btn btn-secondary" onClick={resetForm}>
                    Cancel
                  </button>
                ) : null}
              </div>
            </form>
          </section>

          <section className="products">
            {products.map((product) => (
              <article key={product.id} className="card product-card admin-product-card">
                <div className="product-topline">{product.id}</div>
                <h3>{product.name}</h3>
                <p>{product.description}</p>
                <div className="product-price">{formatCurrency(product.amount, "INR")}</div>
                <div className="admin-actions">
                  <button type="button" className="btn btn-outline" onClick={() => handleEdit(product)}>
                    Edit
                  </button>
                  <button type="button" className="btn btn-danger" onClick={() => handleDelete(product.id)}>
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </section>
        </>
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

async function parseApiResponse(response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return response.json();
  }

  const text = await response.text();
  return { message: text || "Unexpected server response" };
}

export default AdminProducts;
