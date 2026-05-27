require("dotenv").config();
const express = require("express");
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const XLSX = require('xlsx');
const nodemailer = require('nodemailer');

loadEnvFile(path.join(__dirname, '.env'));

// OTP Configuration
const OTP_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
const OTP_LENGTH = 6;
const OTP_STORAGE_FILE = path.join(__dirname, 'otp_cache.json');
const VALID_COUPON_CODE = 'BHAVYA2026';
const COUPON_STORAGE_FILE = path.join(__dirname, 'coupon_cache.json');

const app = express();
const PORT = Number(process.env.PORT) || 3000;
const USERS_FILE = path.join(__dirname, 'users.json');
const PAYMENTS_FILE = path.join(__dirname, 'payments.json');
const BANK_ACCOUNTS_FILE = path.join(__dirname, 'bankaccounts.json');
const PASSWORD_SCHEME = 'scrypt';
const PASSWORD_KEY_LENGTH = 64;
const ENCRYPTION_ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY_LENGTH = 32;
const RAZORPAY_API_BASE_URL = 'https://api.razorpay.com/v1';
const RAZORPAY_KEY_ID = normalizeText(process.env.RAZORPAY_KEY_ID);
const RAZORPAY_KEY_SECRET = normalizeText(process.env.RAZORPAY_KEY_SECRET);
const RAZORPAY_WEBHOOK_SECRET = normalizeText(process.env.RAZORPAY_WEBHOOK_SECRET);
const APP_AUTH_SECRET = normalizeText(process.env.APP_AUTH_SECRET) || RAZORPAY_KEY_SECRET;
const ENCRYPTION_KEY = crypto.scryptSync(APP_AUTH_SECRET, 'salt', ENCRYPTION_KEY_LENGTH);
const APP_AUTH_TTL_MS = 1000 * 60 * 60 * 24 * 7;
const ADMIN_EMAIL = normalizeEmail(process.env.ADMIN_EMAIL);
const STORE_CURRENCY = 'INR';
const STORE_NAME = 'LearnShop';
const BENEFICIARY_NAME = normalizeText(process.env.BENEFICIARY_NAME);
const BENEFICIARY_UPI_ID = normalizeText(process.env.BENEFICIARY_UPI_ID);
const BENEFICIARY_BANK_NAME = normalizeText(process.env.BENEFICIARY_BANK_NAME);
const BENEFICIARY_ACCOUNT_NAME = normalizeText(process.env.BENEFICIARY_ACCOUNT_NAME);
const BENEFICIARY_ACCOUNT_NUMBER = normalizeText(process.env.BENEFICIARY_ACCOUNT_NUMBER);
const BENEFICIARY_IFSC = normalizeText(process.env.BENEFICIARY_IFSC);
const PRODUCTS_FILE = path.join(__dirname, 'products.json');

const DEFAULT_PRODUCTS = [
  {
    id: 'intro-eating',
    name: 'Introduction to Eating',
    description: 'A guided starter program for food habits, kitchen basics, and confidence-building routines.',
    amount: 99900,
  },
  {
    id: 'benefits-eating',
    name: 'Benefits of Eating',
    description: 'A practical course focused on nutrition awareness, meal timing, and better daily energy.',
    amount: 49900,
  },
  {
    id: 'what-is-food',
    name: 'What is food?',
    description: 'A quick fundamentals track explaining ingredients, food groups, and smart buying choices.',
    amount: 29900,
  },
];

function loadProducts() {
  if (!fs.existsSync(PRODUCTS_FILE)) {
    return DEFAULT_PRODUCTS;
  }

  const raw = fs.readFileSync(PRODUCTS_FILE, 'utf8').trim();
  if (!raw) {
    return DEFAULT_PRODUCTS;
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : DEFAULT_PRODUCTS;
  } catch (error) {
    console.error('Unable to parse products.json. Falling back to defaults.', error);
    return DEFAULT_PRODUCTS;
  }
}

function saveProducts(products) {
  saveJsonArray(PRODUCTS_FILE, products);
}

app.use(cors());
app.use(express.json({
  verify: (req, res, buffer) => {
    req.rawBody = Buffer.from(buffer);
  },
}));
app.disable('x-powered-by');
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  next();
});

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const lines = fs.readFileSync(filePath, 'utf8').split(/\r?\n/);

  for (const line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine || trimmedLine.startsWith('#')) {
      continue;
    }

    const separatorIndex = trimmedLine.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const key = trimmedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) {
      continue;
    }

    let value = trimmedLine.slice(separatorIndex + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }

    process.env[key] = value;
  }
}

function normalizeText(value) {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeEmail(value) {
  return normalizeText(value).toLowerCase();
}

function encodeBase64Url(value) {
  return Buffer.from(value)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

function decodeBase64Url(value) {
  const normalizedValue = `${value}`.replace(/-/g, '+').replace(/_/g, '/');
  const padding = normalizedValue.length % 4 === 0 ? '' : '='.repeat(4 - (normalizedValue.length % 4));
  return Buffer.from(`${normalizedValue}${padding}`, 'base64').toString('utf8');
}

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function isValidPincode(pincode) {
  return /^\d{4,10}$/.test(pincode);
}

function maskAccountNumber(accountNumber) {
  const digitsOnly = accountNumber.replace(/\s+/g, '');
  if (digitsOnly.length <= 4) {
    return digitsOnly;
  }

  return `${'*'.repeat(Math.max(0, digitsOnly.length - 4))}${digitsOnly.slice(-4)}`;
}

function constantTimeEquals(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  if (leftBuffer.length !== rightBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex');
  return `${PASSWORD_SCHEME}$${salt}$${hash}`;
}

function hashLegacyPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

function verifyPassword(password, storedPassword) {
  if (!storedPassword) {
    return { isValid: false, needsUpgrade: false };
  }

  if (storedPassword.startsWith(`${PASSWORD_SCHEME}$`)) {
    const parts = storedPassword.split('$');
    if (parts.length !== 3) {
      return { isValid: false, needsUpgrade: false };
    }

    const [, salt, storedHash] = parts;
    const candidateHash = crypto.scryptSync(password, salt, PASSWORD_KEY_LENGTH).toString('hex');

    return {
      isValid: constantTimeEquals(candidateHash, storedHash),
      needsUpgrade: false,
    };
  }

  const legacyHash = hashLegacyPassword(password);

  return {
    isValid: constantTimeEquals(legacyHash, storedPassword),
    needsUpgrade: true,
  };
}

function loadJsonArray(filePath) {
  if (!fs.existsSync(filePath)) {
    return [];
  }

  const raw = fs.readFileSync(filePath, 'utf8').trim();
  if (!raw) {
    return [];
  }

  const parsed = JSON.parse(raw);
  return Array.isArray(parsed) ? parsed : [];
}

function saveJsonArray(filePath, items) {
  fs.writeFileSync(filePath, JSON.stringify(items, null, 2));
}

function loadUsers() {
  return loadJsonArray(USERS_FILE);
}

function saveUsers(users) {
  saveJsonArray(USERS_FILE, users);
}

function loadPayments() {
  return loadJsonArray(PAYMENTS_FILE);
}

function savePayments(payments) {
  saveJsonArray(PAYMENTS_FILE, payments);
}

function findUserByEmail(email) {
  if (!email) {
    return null;
  }

  const users = loadUsers();
  return users.find((user) => normalizeEmail(user.email) === normalizeEmail(email)) || null;
}

function formatProductsForClient() {
  return loadProducts().map((product) => ({
    id: product.id,
    name: product.name,
    description: product.description,
    amount: product.amount,
    currency: STORE_CURRENCY,
  }));
}

function findProductById(productId) {
  return loadProducts().find((product) => product.id === productId);
}

function buildOrderItemsFromRequest(body) {
  const requestedItems = Array.isArray(body.items) ? body.items : [];
  const normalizedItems = requestedItems
    .map((item) => ({
      productId: normalizeText(item && item.productId),
      quantity: Number(item && item.quantity) || 0,
    }))
    .filter((item) => item.productId && item.quantity > 0);

  if (normalizedItems.length) {
    return normalizedItems;
  }

  const fallbackProductId = normalizeText(body.productId);
  return fallbackProductId ? [{ productId: fallbackProductId, quantity: 1 }] : [];
}

function resolveOrderItems(requestedItems) {
  return requestedItems.map((item) => {
    const product = findProductById(item.productId);
    if (!product) {
      throw new Error(`Product not found: ${item.productId}`);
    }

    return {
      id: product.id,
      name: product.name,
      description: product.description,
      quantity: item.quantity,
      unitAmount: product.amount,
      amount: product.amount * item.quantity,
      currency: STORE_CURRENCY,
    };
  });
}

function calculateOrderAmount(items) {
  return items.reduce((total, item) => total + item.amount, 0);
}

function summarizeOrderItems(items) {
  if (!items.length) {
    return {
      id: 'cart-order',
      name: 'Cart Order',
      description: 'Combined LearnShop order',
    };
  }

  if (items.length === 1) {
    return {
      id: items[0].id,
      name: items[0].name,
      description: items[0].description,
    };
  }

  return {
    id: 'cart-order',
    name: `${items.length} items`,
    description: items.map((item) => `${item.name} x${item.quantity}`).join(', '),
  };
}

function normalizeStoredItems(payment) {
  if (Array.isArray(payment.items) && payment.items.length) {
    return payment.items;
  }

  if (payment.product) {
    return [{
      id: payment.product.id,
      name: payment.product.name,
      description: payment.product.description,
      quantity: 1,
      unitAmount: Number(payment.amount) || 0,
      amount: Number(payment.amount) || 0,
      currency: payment.currency || STORE_CURRENCY,
    }];
  }

  return [];
}

function findPaymentByOrderId(orderId) {
  return loadPayments().find((payment) => payment.orderId === orderId) || null;
}

function getRazorpayAuthHeader() {
  const credentials = Buffer.from(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`).toString('base64');
  return `Basic ${credentials}`;
}

function isRazorpayConfigured() {
  return Boolean(RAZORPAY_KEY_ID && RAZORPAY_KEY_SECRET);
}

function createGatewayError(message, statusCode = 502, code = 'RAZORPAY_GATEWAY_ERROR') {
  const error = new Error(message);
  error.statusCode = statusCode;
  error.code = code;
  return error;
}

function buildRazorpayError(response, payload, fallbackMessage) {
  const razorpayMessage = payload && payload.error && payload.error.description
    ? payload.error.description
    : fallbackMessage;

  if (response.status === 401) {
    return createGatewayError(
      'Razorpay rejected the API key or secret. Update RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in backend/.env, then restart the backend.',
      502,
      'RAZORPAY_AUTH_FAILED'
    );
  }

  return createGatewayError(razorpayMessage, 502);
}

function isAdminEmail(email) {
  return Boolean(ADMIN_EMAIL) && normalizeEmail(email) === ADMIN_EMAIL;
}

// ===== OTP & Email Functions =====
function initializeEmailTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS,
    },
  });
}

function generateOTP() {
  return Math.floor(Math.random() * Math.pow(10, OTP_LENGTH))
    .toString()
    .padStart(OTP_LENGTH, '0');
}

function loadOTPCache() {
  if (!fs.existsSync(OTP_STORAGE_FILE)) {
    return {};
  }
  const raw = fs.readFileSync(OTP_STORAGE_FILE, 'utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveOTPCache(cache) {
  fs.writeFileSync(OTP_STORAGE_FILE, JSON.stringify(cache, null, 2));
}

function storeOTP(email, otp) {
  const cache = loadOTPCache();
  cache[normalizeEmail(email)] = {
    otp,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
    attempts: 0,
  };
  saveOTPCache(cache);
}

function verifyOTP(email, otp) {
  const cache = loadOTPCache();
  const record = cache[normalizeEmail(email)];
  
  if (!record) {
    return { valid: false, message: 'OTP not found. Request a new one.' };
  }
  
  if (Date.now() > record.expiresAt) {
    delete cache[normalizeEmail(email)];
    saveOTPCache(cache);
    return { valid: false, message: 'OTP has expired. Request a new one.' };
  }
  
  if (record.attempts >= 3) {
    delete cache[normalizeEmail(email)];
    saveOTPCache(cache);
    return { valid: false, message: 'Too many attempts. Request a new OTP.' };
  }
  
  if (record.otp !== otp) {
    record.attempts += 1;
    saveOTPCache(cache);
    return { valid: false, message: 'Invalid OTP. Try again.' };
  }
  
  delete cache[normalizeEmail(email)];
  saveOTPCache(cache);
  return { valid: true, message: 'OTP verified successfully' };
}

async function sendOTPEmail(email, otp) {
  try {
    const transporter = initializeEmailTransporter();
    const mailOptions = {
      from: process.env.EMAIL_USER || 'your-email@gmail.com',
      to: email,
      subject: 'Your LearnShop OTP Code',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #2f6fed;">LearnShop - Email Verification</h2>
          <p>Your One-Time Password (OTP) is:</p>
          <h1 style="color: #2f6fed; letter-spacing: 5px; font-size: 32px;">${otp}</h1>
          <p style="color: #666;">This OTP will expire in 10 minutes.</p>
          <p style="color: #999; font-size: 12px;">If you didn't request this, please ignore this email.</p>
        </div>
      `,
    };
    
    await transporter.sendMail(mailOptions);
    return { success: true, message: 'OTP sent to email' };
  } catch (error) {
    console.error('Email sending failed:', error);
    return { success: false, message: 'Unable to send OTP email. Check email configuration.' };
  }
}

function loadCouponCache() {
  if (!fs.existsSync(COUPON_STORAGE_FILE)) {
    return {};
  }
  const raw = fs.readFileSync(COUPON_STORAGE_FILE, 'utf8').trim();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return {};
  }
}

function saveCouponCache(cache) {
  fs.writeFileSync(COUPON_STORAGE_FILE, JSON.stringify(cache, null, 2));
}

function verifyCoupon(email, code) {
  if (normalizeText(code) !== VALID_COUPON_CODE) {
    return { valid: false, message: 'Invalid coupon code' };
  }
  
  const cache = loadCouponCache();
  cache[normalizeEmail(email)] = {
    verified: true,
    verifiedAt: new Date().toISOString(),
  };
  saveCouponCache(cache);
  return { valid: true, message: 'Coupon verified' };
}

function isCouponVerified(email) {
  const cache = loadCouponCache();
  return cache[normalizeEmail(email)] && cache[normalizeEmail(email)].verified;
}

function createSignedValue(value) {
  return crypto.createHmac('sha256', APP_AUTH_SECRET).update(value).digest('hex');
}

function createAuthToken(user) {
  const payload = {
    email: normalizeEmail(user.email),
    loginName: normalizeText(user.loginName),
    isAdmin: isAdminEmail(user.email),
    exp: Date.now() + APP_AUTH_TTL_MS,
  };
  const encodedPayload = encodeBase64Url(JSON.stringify(payload));
  const signature = createSignedValue(encodedPayload);
  return `${encodedPayload}.${signature}`;
}

function readBearerToken(req) {
  const headerValue = normalizeText(req.headers.authorization);
  if (!headerValue.toLowerCase().startsWith('bearer ')) {
    return normalizeText(req.query && req.query.token);
  }

  return normalizeText(headerValue.slice(7));
}

function readAuthTokenPayload(token) {
  if (!APP_AUTH_SECRET || !token) {
    return null;
  }

  const [encodedPayload, signature] = token.split('.');
  if (!encodedPayload || !signature) {
    return null;
  }

  const expectedSignature = createSignedValue(encodedPayload);
  if (!constantTimeEquals(signature, expectedSignature)) {
    return null;
  }

  let parsedPayload;
  try {
    parsedPayload = JSON.parse(decodeBase64Url(encodedPayload));
  } catch (error) {
    return null;
  }

  if (!parsedPayload || Date.now() > Number(parsedPayload.exp || 0)) {
    return null;
  }

  return {
    email: normalizeEmail(parsedPayload.email),
    loginName: normalizeText(parsedPayload.loginName),
    isAdmin: Boolean(parsedPayload.isAdmin),
  };
}

function getAuthenticatedUser(req) {
  const token = readBearerToken(req);
  const payload = readAuthTokenPayload(token);
  if (!payload || !payload.email) {
    return null;
  }

  return payload;
}

function getBeneficiaryDetails() {
  const hasTransferDetails = Boolean(
    BENEFICIARY_NAME ||
    BENEFICIARY_UPI_ID ||
    BENEFICIARY_BANK_NAME ||
    BENEFICIARY_ACCOUNT_NAME ||
    BENEFICIARY_ACCOUNT_NUMBER ||
    BENEFICIARY_IFSC
  );

  return {
    enabled: hasTransferDetails,
    name: BENEFICIARY_NAME,
    upiId: BENEFICIARY_UPI_ID,
    bankName: BENEFICIARY_BANK_NAME,
    accountName: BENEFICIARY_ACCOUNT_NAME,
    accountNumberMasked: BENEFICIARY_ACCOUNT_NUMBER ? maskAccountNumber(BENEFICIARY_ACCOUNT_NUMBER) : '',
    ifsc: BENEFICIARY_IFSC,
  };
}

async function createRazorpayOrder(items, customer) {
  const orderAmount = calculateOrderAmount(items);
  if (!Number.isFinite(orderAmount) || orderAmount < 100) {
    throw new Error('Order amount must be at least 100 paise');
  }

  const summary = summarizeOrderItems(items);
  const receipt = `ls_${summary.id}_${Date.now()}`;
  const response = await fetch(`${RAZORPAY_API_BASE_URL}/orders`, {
    method: 'POST',
    headers: {
      Authorization: getRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      amount: orderAmount,
      currency: STORE_CURRENCY,
      receipt,
      notes: {
        productIds: items.map((item) => item.id).join(','),
        itemCount: String(items.length),
        orderSummary: summary.name,
        customerEmail: customer.email || '',
        customerName: customer.name || '',
      },
    }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw buildRazorpayError(response, payload, 'Unable to create Razorpay order');
  }

  return payload;
}

async function fetchRazorpayPayment(paymentId) {
  const response = await fetch(`${RAZORPAY_API_BASE_URL}/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      Authorization: getRazorpayAuthHeader(),
      'Content-Type': 'application/json',
    },
  });

  const payload = await response.json();
  if (!response.ok) {
    throw buildRazorpayError(response, payload, 'Unable to fetch Razorpay payment');
  }

  return payload;
}

function verifyRazorpaySignature(orderId, paymentId, signature) {
  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_KEY_SECRET)
    .update(`${orderId}|${paymentId}`)
    .digest('hex');

  return constantTimeEquals(expectedSignature, signature);
}

function createReceiptNumber(paymentCount) {
  return `LS-${String(paymentCount + 1).padStart(5, '0')}`;
}

function formatCurrency(amount, currency = STORE_CURRENCY) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount / 100);
}

function buildReceiptDocument(payment) {
  const items = normalizeStoredItems(payment);
  const itemLines = items.length
    ? items.flatMap((item, index) => ([
      `Item ${index + 1}: ${item.name}`,
      `Item ID: ${item.id}`,
      `Description: ${item.description}`,
      `Quantity: ${item.quantity}`,
      `Unit Price: ${formatCurrency(item.unitAmount, item.currency || payment.currency)}`,
      `Line Total: ${formatCurrency(item.amount, item.currency || payment.currency)}`,
      '',
    ]))
    : [
      'Item 1: Order details unavailable',
      '',
    ];

  const lines = [
    `${STORE_NAME} Payment Receipt`,
    '',
    `Receipt Number: ${payment.receiptNumber}`,
    `Payment ID: ${payment.paymentId}`,
    `Order ID: ${payment.orderId}`,
    `Date: ${new Date(payment.paidAt).toLocaleString('en-IN')}`,
    '',
    'Customer',
    `Name: ${payment.customerName || 'Guest Checkout'}`,
    `Email: ${payment.customerEmail || 'Not provided'}`,
    `Address: ${payment.customerAddress || 'Not provided'}`,
    `Pincode: ${payment.customerPincode || 'Not provided'}`,
    '',
    'Items',
    ...itemLines,
    '',
    'Amount',
    `Paid: ${formatCurrency(payment.amount, payment.currency)}`,
    `Currency: ${payment.currency}`,
    '',
    'Status',
    `Verification: ${payment.verified ? 'Verified' : 'Pending'}`,
    `Mode Preference: ${payment.paymentMode || 'standard'}`,
    '',
    'Thank you for choosing LearnShop.',
  ];

  return lines.join('\n');
}

function sanitizePaymentForClient(payment) {
  const items = normalizeStoredItems(payment);
  return {
    receiptNumber: payment.receiptNumber,
    paymentId: payment.paymentId,
    orderId: payment.orderId,
    paidAt: payment.paidAt,
    amount: payment.amount,
    currency: payment.currency,
    customerName: payment.customerName,
    customerEmail: payment.customerEmail,
    customerAddress: payment.customerAddress,
    customerPincode: payment.customerPincode,
    items,
    product: payment.product || summarizeOrderItems(items),
    paymentMode: payment.paymentMode,
    verified: payment.verified,
  };
}

function upsertPaymentRecord(nextRecord) {
  const payments = loadPayments();
  const paymentIndex = payments.findIndex((payment) => {
    return (
      (nextRecord.paymentId && payment.paymentId === nextRecord.paymentId) ||
      (nextRecord.orderId && payment.orderId === nextRecord.orderId)
    );
  });

  if (paymentIndex === -1) {
    const paymentRecord = {
      receiptNumber: createReceiptNumber(payments.length),
      ...nextRecord,
    };
    payments.unshift(paymentRecord);
    savePayments(payments);
    return paymentRecord;
  }

  const paymentRecord = {
    ...payments[paymentIndex],
    ...nextRecord,
    receiptNumber: payments[paymentIndex].receiptNumber,
  };
  payments[paymentIndex] = paymentRecord;
  savePayments(payments);
  return paymentRecord;
}

function requireAuth(req, res) {
  const user = getAuthenticatedUser(req);
  if (!user) {
    if (process.env.DEBUG) {
      const authHeader = normalizeText(req.headers.authorization || '');
      const queryToken = normalizeText(req.query && req.query.token);
      const redactedHeader = authHeader ? authHeader.replace(/(Bearer\s+).+/, '$1[REDACTED]') : '<none>';
      const redactedQuery = queryToken ? '[REDACTED]' : '<none>';
      console.error('Auth failed for request', {
        method: req.method,
        path: req.originalUrl || req.url,
        authorization: redactedHeader,
        query_token: redactedQuery,
      });
    }
    res.status(401).json({ message: 'Sign in again to continue securely' });
    return null;
  }

  return user;
}

function requireAdmin(req, res) {
  const user = requireAuth(req, res);
  if (!user) {
    return null;
  }

  if (!user.isAdmin) {
    res.status(403).json({ message: 'Owner access required' });
    return null;
  }

  return user;
}

function verifyWebhookSignature(rawBody, signature) {
  if (!RAZORPAY_WEBHOOK_SECRET || !rawBody || !signature) {
    return false;
  }

  const expectedSignature = crypto
    .createHmac('sha256', RAZORPAY_WEBHOOK_SECRET)
    .update(rawBody)
    .digest('hex');

  return constantTimeEquals(expectedSignature, signature);
}

function encryptData(plainText) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ENCRYPTION_ALGORITHM, ENCRYPTION_KEY, iv);
  let encrypted = cipher.update(plainText, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag();
  
  return {
    iv: iv.toString('hex'),
    encrypted,
    authTag: authTag.toString('hex'),
  };
}

function decryptData(encryptedData) {
  try {
    const decipher = crypto.createDecipheriv(
      ENCRYPTION_ALGORITHM,
      ENCRYPTION_KEY,
      Buffer.from(encryptedData.iv, 'hex')
    );
    decipher.setAuthTag(Buffer.from(encryptedData.authTag, 'hex'));
    let decrypted = decipher.update(encryptedData.encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (error) {
    return null;
  }
}

function loadBankAccounts() {
  return loadJsonArray(BANK_ACCOUNTS_FILE);
}

function saveBankAccounts(accounts) {
  saveJsonArray(BANK_ACCOUNTS_FILE, accounts);
}

function getUserBankAccounts(email) {
  const accounts = loadBankAccounts();
  return accounts.filter((account) => normalizeEmail(account.email) === normalizeEmail(email));
}

function sanitizeBankAccount(account) {
  return {
    id: account.id,
    email: account.email,
    bankName: account.bankName,
    accountHolderName: account.accountHolderName,
    accountNumberMasked: maskAccountNumber(decryptData(account.accountNumberEncrypted) || ''),
    ifsc: account.ifsc,
    upiId: account.upiId,
    createdAt: account.createdAt,
  };
}


app.post('/api/register', async (req, res) => {
  try {
    const body = req.body || {};
    const loginName = normalizeText(body.loginName);
    const email = normalizeEmail(body.email);
    const address = normalizeText(body.address);
    const pincode = normalizeText(body.pincode);

    if (!loginName || !email || !address || !pincode) {
      return res.status(400).json({ message: 'All fields are required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    if (!isValidPincode(pincode)) {
      return res.status(400).json({ message: 'Pincode must be 4 to 10 digits' });
    }

    const users = loadUsers();
    const normalizedLoginName = loginName.toLowerCase();
    const existingUser = users.find((user) => {
      return normalizeText(user.loginName).toLowerCase() === normalizedLoginName || normalizeEmail(user.email) === email;
    });

    if (existingUser) {
      return res.status(400).json({ message: 'User already exists' });
    }

    // Generate and send OTP
    const otp = generateOTP();
    storeOTP(email, otp);
    
    const emailResult = await sendOTPEmail(email, otp);
    if (!emailResult.success) {
      return res.status(500).json({ message: emailResult.message });
    }

    // Store registration data temporarily
    const pendingUsers = loadUsers();
    pendingUsers.push({
      loginName,
      email,
      address,
      pincode,
      status: 'pending_verification',
      createdAt: new Date().toISOString(),
    });
    saveUsers(pendingUsers);

    return res.json({ 
      message: 'OTP sent to your email. Verify to complete registration.',
      email,
      requiresOTP: true 
    });
  } catch (error) {
    console.error('Register failed:', error);
    return res.status(500).json({ message: 'Unable to register right now' });
  }
});

app.post('/api/register/verify-otp', (req, res) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const otp = normalizeText(body.otp);

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpCheck = verifyOTP(email, otp);
    if (!otpCheck.valid) {
      return res.status(401).json({ message: otpCheck.message });
    }

    const users = loadUsers();
    const userIndex = users.findIndex((user) => normalizeEmail(user.email) === email);
    
    if (userIndex === -1) {
      return res.status(404).json({ message: 'Registration data not found' });
    }

    const user = users[userIndex];
    if (user.status !== 'pending_verification') {
      return res.status(400).json({ message: 'User registration already verified or invalid' });
    }

    // Mark user as verified
    users[userIndex] = {
      ...user,
      status: 'verified',
      verifiedAt: new Date().toISOString(),
    };
    delete users[userIndex].password; // Remove password field as we're not using it
    saveUsers(users);

    return res.json({ 
      message: 'Registration verified successfully. You can now login.',
      user: { loginName: user.loginName, email: user.email }
    });
  } catch (error) {
    console.error('Register verification failed:', error);
    return res.status(500).json({ message: 'Unable to verify registration right now' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);

    if (!email) {
      return res.status(400).json({ message: 'Email is required' });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({ message: 'Enter a valid email address' });
    }

    const users = loadUsers();
    const user = users.find((user) => normalizeEmail(user.email) === email && (user.status === 'verified' || !user.status));

    if (!user) {
      return res.status(401).json({ message: 'Email not found or not verified' });
    }

    // Generate and send OTP
    const otp = generateOTP();
    storeOTP(email, otp);
    
    const emailResult = await sendOTPEmail(email, otp);
    if (!emailResult.success) {
      return res.status(500).json({ message: emailResult.message });
    }

    return res.json({ 
      message: 'OTP sent to your email',
      email,
      requiresOTP: true 
    });
  } catch (error) {
    console.error('Login failed:', error);
    return res.status(500).json({ message: 'Unable to sign in right now' });
  }
});

app.post('/api/login/verify-otp', (req, res) => {
  try {
    const body = req.body || {};
    const email = normalizeEmail(body.email);
    const otp = normalizeText(body.otp);

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and OTP are required' });
    }

    const otpCheck = verifyOTP(email, otp);
    if (!otpCheck.valid) {
      return res.status(401).json({ message: otpCheck.message });
    }

    const users = loadUsers();
    const user = users.find((user) => normalizeEmail(user.email) === email && (user.status === 'verified' || !user.status));

    if (!user) {
      return res.status(401).json({ message: 'Invalid email or user not verified' });
    }

    const token = createAuthToken(user);

    return res.json({
      message: 'Login successful',
      token,
      user: {
        loginName: user.loginName,
        email: user.email,
        isAdmin: isAdminEmail(user.email),
      },
    });
  } catch (error) {
    console.error('Login verification failed:', error);
    return res.status(500).json({ message: 'Unable to verify login right now' });
  }
});

app.get('/api/auth/me', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const user = findUserByEmail(authenticatedUser.email);
    return res.json({
      user: {
        loginName: normalizeText((user && user.loginName) || authenticatedUser.loginName),
        email: authenticatedUser.email,
        isAdmin: isAdminEmail(authenticatedUser.email),
      },
    });
  } catch (error) {
    console.error('Auth session check failed:', error);
    return res.status(500).json({ message: 'Unable to validate session right now' });
  }
});

app.post('/api/videos/verify-coupon', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const body = req.body || {};
    const couponCode = normalizeText(body.couponCode);

    if (!couponCode) {
      return res.status(400).json({ message: 'Coupon code is required' });
    }

    const result = verifyCoupon(authenticatedUser.email, couponCode);
    
    if (!result.valid) {
      return res.status(401).json({ message: result.message });
    }

    return res.json({ 
      message: result.message,
      verified: true,
      email: authenticatedUser.email 
    });
  } catch (error) {
    console.error('Coupon verification failed:', error);
    return res.status(500).json({ message: 'Unable to verify coupon right now' });
  }
});

app.get('/api/videos/check-coupon', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const verified = isCouponVerified(authenticatedUser.email);
    return res.json({ verified });
  } catch (error) {
    console.error('Coupon check failed:', error);
    return res.status(500).json({ message: 'Unable to check coupon status' });
  }
});

app.get('/api/payments/config', (req, res) => {
  res.json({
    keyId: RAZORPAY_KEY_ID || '',
    currency: STORE_CURRENCY,
    configured: isRazorpayConfigured(),
    mode: RAZORPAY_KEY_ID.startsWith('rzp_live_') ? 'live' : 'test',
    adminConfigured: Boolean(ADMIN_EMAIL),
    webhookConfigured: Boolean(RAZORPAY_WEBHOOK_SECRET),
    beneficiary: getBeneficiaryDetails(),
    products: formatProductsForClient(),
  });
});

app.get('/api/admin/status', (req, res) => {
  const user = getAuthenticatedUser(req);

  res.json({
    authorized: Boolean(user && user.isAdmin),
    configured: Boolean(ADMIN_EMAIL),
  });
});

async function handleCreateOrderRequest(req, res) {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: 'Razorpay is not configured on the server yet' });
    }

    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const body = req.body || {};
    const requestedItems = buildOrderItemsFromRequest(body);
    const buyer = findUserByEmail(authenticatedUser.email);
    const customer = {
      name: normalizeText((buyer && buyer.loginName) || authenticatedUser.loginName),
      email: authenticatedUser.email,
      contact: normalizeText(body.customerContact),
    };

    if (!requestedItems.length) {
      return res.status(400).json({ message: 'Add at least one product to the cart' });
    }

    const items = resolveOrderItems(requestedItems);
    const order = await createRazorpayOrder(items, customer);
    const orderSummary = summarizeOrderItems(items);
    upsertPaymentRecord({
      orderId: order.id,
      paymentId: '',
      paidAt: '',
      amount: order.amount,
      currency: order.currency,
      customerName: customer.name,
      customerEmail: customer.email,
      customerAddress: normalizeText(buyer && buyer.address),
      customerPincode: normalizeText(buyer && buyer.pincode),
      paymentMode: normalizeText(body.paymentMode) || 'standard',
      verified: false,
      items,
      product: orderSummary,
    });

    return res.json({
      keyId: RAZORPAY_KEY_ID,
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      items,
      product: orderSummary,
    });
  } catch (error) {
    console.error('Order creation failed:', error);
    const statusCode = error.message && error.message.startsWith('Product not found:') ? 404 : (error.statusCode || 500);
    return res.status(statusCode).json({
      message: error.message || 'Unable to create payment order',
      code: error.code || 'ORDER_CREATION_FAILED',
    });
  }
}

app.post('/api/payments/order', handleCreateOrderRequest);
app.post('/api/create-order', handleCreateOrderRequest);

async function handleVerifyPaymentRequest(req, res) {
  try {
    if (!isRazorpayConfigured()) {
      return res.status(503).json({ message: 'Razorpay is not configured on the server yet' });
    }

    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const body = req.body || {};
    const orderId = normalizeText(body.orderId);
    const paymentId = normalizeText(body.razorpay_payment_id);
    const signature = normalizeText(body.razorpay_signature);
    const paymentMode = normalizeText(body.paymentMode) || 'standard';
    const buyer = findUserByEmail(authenticatedUser.email);
    const pendingPayment = findPaymentByOrderId(orderId);

    if (!orderId || !paymentId || !signature || !pendingPayment) {
      return res.status(400).json({ message: 'Missing payment verification details' });
    }

    const isValid = verifyRazorpaySignature(orderId, paymentId, signature);
    if (!isValid) {
      return res.status(400).json({ message: 'Payment signature verification failed' });
    }

    const razorpayPayment = await fetchRazorpayPayment(paymentId);
    if (normalizeText(razorpayPayment.order_id) !== orderId) {
      return res.status(400).json({ message: 'Payment does not match this order' });
    }

    if (Number(razorpayPayment.amount) !== Number(pendingPayment.amount) || normalizeText(razorpayPayment.currency) !== STORE_CURRENCY) {
      return res.status(400).json({ message: 'Payment amount mismatch detected' });
    }

    const normalizedStatus = normalizeText(razorpayPayment.status).toLowerCase();
    if (normalizedStatus !== 'captured') {
      return res.status(400).json({ message: 'Payment is not finalized yet' });
    }

    const paymentRecord = upsertPaymentRecord({
      paymentId,
      orderId,
      paidAt: new Date().toISOString(),
      amount: product.amount,
      currency: STORE_CURRENCY,
      customerName: normalizeText((buyer && buyer.loginName) || authenticatedUser.loginName),
      customerEmail: authenticatedUser.email,
      customerAddress: normalizeText(buyer && buyer.address),
      customerPincode: normalizeText(buyer && buyer.pincode),
      paymentMode,
      verified: true,
      items: normalizeStoredItems(pendingPayment),
      product: pendingPayment.product || summarizeOrderItems(normalizeStoredItems(pendingPayment)),
    });

    return res.json({
      verified: true,
      message: 'Payment verified successfully',
      paymentId,
      orderId,
      receiptNumber: paymentRecord.receiptNumber,
      receiptUrl: `/api/payments/${paymentId}/receipt`,
      items: normalizeStoredItems(paymentRecord),
      product: paymentRecord.product,
    });
  } catch (error) {
    console.error('Payment verification failed:', error);
    return res.status(error.statusCode || 500).json({
      message: error.message || 'Unable to verify payment right now',
      code: error.code || 'PAYMENT_VERIFICATION_FAILED',
    });
  }
}

app.post('/api/payments/verify', handleVerifyPaymentRequest);
app.post('/api/verify-payment', handleVerifyPaymentRequest);

app.get('/api/payments/history', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const payments = loadPayments();
    const filteredPayments = payments.filter((payment) => normalizeEmail(payment.customerEmail) === authenticatedUser.email);

    return res.json({
      payments: filteredPayments.map(sanitizePaymentForClient),
    });
  } catch (error) {
    console.error('Payment history failed:', error);
    return res.status(500).json({ message: 'Unable to load payment history right now' });
  }
});

app.get('/api/payments/orders', (req, res) => {
  try {
    const authenticatedUser = requireAdmin(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const payments = loadPayments();

    return res.json({
      payments: payments.map(sanitizePaymentForClient),
    });
  } catch (error) {
    console.error('Orders listing failed:', error);
    return res.status(500).json({ message: 'Unable to load orders right now' });
  }
});

app.get('/api/admin/products', (req, res) => {
  try {
    const authenticatedUser = requireAdmin(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const products = loadProducts();
    return res.json({ products });
  } catch (error) {
    console.error('Load products failed:', error);
    return res.status(500).json({ message: 'Unable to load products right now' });
  }
});

app.post('/api/admin/products', (req, res) => {
  try {
    const authenticatedUser = requireAdmin(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const body = req.body || {};
    const productId = normalizeText(body.id);
    const name = normalizeText(body.name);
    const description = normalizeText(body.description);
    const amount = Number(body.amount);

    if (!productId || !name || !description || !Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ message: 'Product id, name, description and amount (>=100 paise) are required' });
    }

    const products = loadProducts();
    if (products.some((product) => product.id === productId)) {
      return res.status(400).json({ message: 'A product with this id already exists' });
    }

    const nextProduct = {
      id: productId,
      name,
      description,
      amount,
    };

    products.push(nextProduct);
    saveProducts(products);

    return res.status(201).json({ product: nextProduct });
  } catch (error) {
    console.error('Create product failed:', error);
    return res.status(500).json({ message: 'Unable to save product right now' });
  }
});

app.put('/api/admin/products/:productId', (req, res) => {
  try {
    const authenticatedUser = requireAdmin(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const productId = normalizeText(req.params.productId);
    const body = req.body || {};
    const name = normalizeText(body.name);
    const description = normalizeText(body.description);
    const amount = Number(body.amount);

    if (!productId || !name || !description || !Number.isFinite(amount) || amount < 100) {
      return res.status(400).json({ message: 'Product id, name, description and amount (>=100 paise) are required' });
    }

    const products = loadProducts();
    const productIndex = products.findIndex((product) => product.id === productId);
    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }

    const updatedProduct = {
      id: productId,
      name,
      description,
      amount,
    };

    products[productIndex] = updatedProduct;
    saveProducts(products);

    return res.json({ product: updatedProduct });
  } catch (error) {
    console.error('Update product failed:', error);
    return res.status(500).json({ message: 'Unable to update product right now' });
  }
});

app.delete('/api/admin/products/:productId', (req, res) => {
  try {
    const authenticatedUser = requireAdmin(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const productId = normalizeText(req.params.productId);
    const products = loadProducts();
    const productIndex = products.findIndex((product) => product.id === productId);

    if (productIndex === -1) {
      return res.status(404).json({ message: 'Product not found' });
    }

    products.splice(productIndex, 1);
    saveProducts(products);

    return res.json({ message: 'Product removed successfully' });
  } catch (error) {
    console.error('Delete product failed:', error);
    return res.status(500).json({ message: 'Unable to delete product right now' });
  }
});

app.get('/api/payments/:paymentId/receipt', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const paymentId = normalizeText(req.params.paymentId);
    const payments = loadPayments();
    const payment = payments.find((entry) => entry.paymentId === paymentId);

    if (!payment) {
      return res.status(404).send('Receipt not found');
    }

    if (!authenticatedUser.isAdmin && normalizeEmail(payment.customerEmail) !== authenticatedUser.email) {
      return res.status(403).send('Receipt access denied');
    }

    const receiptText = buildReceiptDocument(payment);
    res.setHeader('Content-Disposition', `attachment; filename=${payment.receiptNumber}.txt`);
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    return res.send(receiptText);
  } catch (error) {
    console.error('Receipt generation failed:', error);
    return res.status(500).send('Unable to generate receipt right now');
  }
});

app.post('/api/payments/webhook', (req, res) => {
  try {
    const signature = normalizeText(req.headers['x-razorpay-signature']);
    const isValid = verifyWebhookSignature(req.rawBody, signature);

    if (!isValid) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const event = req.body || {};
    const eventName = normalizeText(event.event);
    const paymentEntity = event.payload && event.payload.payment && event.payload.payment.entity;
    const orderEntity = event.payload && event.payload.order && event.payload.order.entity;
    const paymentId = normalizeText(paymentEntity && paymentEntity.id);
    const orderId = normalizeText(paymentEntity && paymentEntity.order_id) || normalizeText(orderEntity && orderEntity.id);
    const pendingPayment = findPaymentByOrderId(orderId);

    if ((eventName !== 'payment.captured' && eventName !== 'order.paid') || !paymentId || !orderId || !pendingPayment) {
      return res.json({ received: true });
    }

    const emailFromNotes = normalizeEmail(orderEntity && orderEntity.notes && orderEntity.notes.customerEmail);
    const buyer = findUserByEmail(emailFromNotes);
    upsertPaymentRecord({
      paymentId,
      orderId,
      paidAt: new Date().toISOString(),
      amount: Number(paymentEntity.amount) || product.amount,
      currency: normalizeText(paymentEntity.currency) || STORE_CURRENCY,
      customerName: normalizeText((buyer && buyer.loginName) || (orderEntity && orderEntity.notes && orderEntity.notes.customerName)),
      customerEmail: emailFromNotes,
      customerAddress: normalizeText(buyer && buyer.address),
      customerPincode: normalizeText(buyer && buyer.pincode),
      paymentMode: normalizeText(paymentEntity.method) || 'standard',
      verified: true,
      items: normalizeStoredItems(pendingPayment),
      product: pendingPayment.product || summarizeOrderItems(normalizeStoredItems(pendingPayment)),
    });

    return res.json({ received: true });
  } catch (error) {
    console.error('Webhook handling failed:', error);
    return res.status(500).json({ message: 'Unable to process webhook right now' });
  }
});

app.get('/api/export', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    if (!authenticatedUser.isAdmin) {
      return res.status(403).json({ message: 'Owner access required' });
    }

    const users = loadUsers();
    const data = users.map((user) => ({
      LoginName: user.loginName,
      Email: user.email,
      Address: user.address,
      Pincode: user.pincode,
      RegisteredAt: user.registeredAt,
    }));

    const worksheet = XLSX.utils.json_to_sheet(data);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Users');
    const buffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    res.setHeader('Content-Disposition', 'attachment; filename=users.xlsx');
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    return res.send(buffer);
  } catch (error) {
    console.error('Export failed:', error);
    return res.status(500).json({ message: 'Unable to export users right now' });
  }
});

app.post('/api/bank-accounts', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const body = req.body || {};
    const bankName = normalizeText(body.bankName);
    const accountHolderName = normalizeText(body.accountHolderName);
    const accountNumber = normalizeText(body.accountNumber);
    const ifsc = normalizeText(body.ifsc);
    const upiId = normalizeText(body.upiId);

    if (!bankName || !accountHolderName) {
      return res.status(400).json({ message: 'Bank name and account holder name are required' });
    }

    if (!accountNumber && !upiId) {
      return res.status(400).json({ message: 'Either account number or UPI ID is required' });
    }

    if (accountNumber && accountNumber.replace(/\D/g, '').length < 8) {
      return res.status(400).json({ message: 'Account number must be at least 8 digits' });
    }

    if (ifsc && !/^[A-Z]{4}0[A-Z0-9]{6}$/.test(ifsc)) {
      return res.status(400).json({ message: 'Invalid IFSC code format' });
    }

    const accounts = loadBankAccounts();
    const accountId = `ba_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const newAccount = {
      id: accountId,
      email: authenticatedUser.email,
      bankName,
      accountHolderName,
      accountNumberEncrypted: accountNumber ? encryptData(accountNumber) : null,
      ifsc,
      upiId,
      createdAt: new Date().toISOString(),
    };

    accounts.push(newAccount);
    saveBankAccounts(accounts);

    return res.json({
      message: 'Bank account added successfully',
      account: sanitizeBankAccount(newAccount),
    });
  } catch (error) {
    console.error('Add bank account failed:', error);
    return res.status(500).json({ message: 'Unable to add bank account right now' });
  }
});

app.get('/api/bank-accounts', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const accounts = getUserBankAccounts(authenticatedUser.email);

    return res.json({
      accounts: accounts.map(sanitizeBankAccount),
    });
  } catch (error) {
    console.error('Get bank accounts failed:', error);
    return res.status(500).json({ message: 'Unable to load bank accounts right now' });
  }
});

app.delete('/api/bank-accounts/:accountId', (req, res) => {
  try {
    const authenticatedUser = requireAuth(req, res);
    if (!authenticatedUser) {
      return undefined;
    }

    const accountId = normalizeText(req.params.accountId);
    const accounts = loadBankAccounts();
    const accountIndex = accounts.findIndex((acc) => acc.id === accountId);

    if (accountIndex === -1) {
      return res.status(404).json({ message: 'Bank account not found' });
    }

    if (normalizeEmail(accounts[accountIndex].email) !== authenticatedUser.email) {
      return res.status(403).json({ message: 'You cannot delete this bank account' });
    }

    accounts.splice(accountIndex, 1);
    saveBankAccounts(accounts);

    return res.json({ message: 'Bank account deleted successfully' });
  } catch (error) {
    console.error('Delete bank account failed:', error);
    return res.status(500).json({ message: 'Unable to delete bank account right now' });
  }
});

const FRONTEND_BUILD_PATH = path.join(__dirname, '../frontend/dist');
const FRONTEND_INDEX_FILE = path.join(FRONTEND_BUILD_PATH, 'index.html');
const HAS_FRONTEND_BUILD = fs.existsSync(FRONTEND_INDEX_FILE);

if (HAS_FRONTEND_BUILD) {
  app.use(express.static(FRONTEND_BUILD_PATH));

  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) {
      return next();
    }
    return res.sendFile(FRONTEND_INDEX_FILE);
  });
} else {
  app.get('/', (req, res) => {
    res.send('LearnShop backend is running. Use /api/* endpoints.');
  });
}

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
