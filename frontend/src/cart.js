const STORAGE_KEY = "learnshopCart";

export function loadStoredCart() {
  const rawValue = localStorage.getItem(STORAGE_KEY);
  if (!rawValue) {
    return [];
  }

  try {
    const parsedValue = JSON.parse(rawValue);
    return Array.isArray(parsedValue) ? parsedValue : [];
  } catch (error) {
    localStorage.removeItem(STORAGE_KEY);
    return [];
  }
}

export function saveStoredCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function clearStoredCart() {
  localStorage.removeItem(STORAGE_KEY);
}
