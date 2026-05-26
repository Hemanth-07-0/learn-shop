# LearnShop Payment API Documentation

## Overview

Complete REST API for the LearnShop payment system with Razorpay integration.

## Base URL
```
http://localhost:3000  (Development)
https://yourdomain.com (Production)
```

## Authentication

Most endpoints require Bearer token authentication. Include in header:
```
Authorization: Bearer <token>
```

Tokens are issued on login and expire after 7 days.

---

## Authentication Endpoints

### Register User
Create a new user account.

**Endpoint:** `POST /api/register`

**Request Body:**
```json
{
  "loginName": "john_doe",
  "email": "john@example.com",
  "password": "securepassword123",
  "address": "123 Main Street, City",
  "pincode": "123456"
}
```

**Response (201):**
```json
{
  "message": "User registered successfully",
  "user": {
    "loginName": "john_doe",
    "email": "john@example.com"
  }
}
```

**Errors:**
- `400` - All fields required, invalid email, invalid pincode, user already exists
- `500` - Server error

---

### Login User
Authenticate and get auth token.

**Endpoint:** `POST /api/login`

**Request Body:**
```json
{
  "email": "john@example.com",
  "password": "securepassword123"
}
```

**Response (200):**
```json
{
  "message": "Login successful",
  "token": "eyJhbGciOiJIUzI1NiIs...",
  "user": {
    "loginName": "john_doe",
    "email": "john@example.com",
    "isAdmin": false
  }
}
```

**Errors:**
- `400` - Email and password required
- `401` - Invalid email or password
- `500` - Server error

---

## Payment Endpoints

### Get Payment Configuration
Get Razorpay configuration, products, and beneficiary details.

**Endpoint:** `GET /api/payments/config`

**Authentication:** Not required

**Response (200):**
```json
{
  "keyId": "rzp_test_xxxxx",
  "currency": "INR",
  "configured": true,
  "mode": "test",
  "adminConfigured": true,
  "webhookConfigured": true,
  "beneficiary": {
    "enabled": true,
    "name": "Your Business Name",
    "upiId": "business@bank",
    "bankName": "HDFC Bank",
    "accountName": "Your Account",
    "accountNumberMasked": "****7890",
    "ifsc": "HDFC0001234"
  },
  "products": [
    {
      "id": "intro-eating",
      "name": "Introduction to Eating",
      "description": "A guided starter program...",
      "amount": 99900,
      "currency": "INR"
    }
  ]
}
```

---

### Create Payment Order
Create a Razorpay order for payment.

**Endpoint:** `POST /api/payments/order`

**Aliases:** `POST /api/create-order`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "productId": "intro-eating",
  "customerContact": "john@example.com",
  "paymentMode": "standard"
}
```

**Response (200):**
```json
{
  "keyId": "rzp_test_xxxxx",
  "orderId": "order_XXXXXXXXXXXXX",
  "amount": 99900,
  "currency": "INR",
  "product": {
    "id": "intro-eating",
    "name": "Introduction to Eating",
    "description": "A guided starter program..."
  }
}
```

**Errors:**
- `400` - Invalid product
- `401` - Not authenticated
- `503` - Razorpay not configured
- `500` - Server error

---

### Verify Payment
Verify payment signature and confirm payment.

**Endpoint:** `POST /api/payments/verify`

**Aliases:** `POST /api/verify-payment`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "orderId": "order_XXXXXXXXXXXXX",
  "productId": "intro-eating",
  "razorpay_payment_id": "pay_XXXXXXXXXXXXX",
  "razorpay_signature": "9ef4dffbfd84f1318f6739a3ce19f9d85851857ae648f114332d8401e0949a3d",
  "paymentMode": "upi"
}
```

**Response (200):**
```json
{
  "verified": true,
  "message": "Payment verified successfully",
  "paymentId": "pay_XXXXXXXXXXXXX",
  "orderId": "order_XXXXXXXXXXXXX",
  "receiptNumber": "LS-00001",
  "receiptUrl": "/api/payments/pay_XXXXXXXXXXXXX/receipt",
  "product": {
    "id": "intro-eating",
    "name": "Introduction to Eating"
  }
}
```

**Errors:**
- `400` - Missing details, signature verification failed, amount mismatch
- `401` - Not authenticated
- `503` - Razorpay not configured
- `500` - Server error

---

### Get Payment History
Get all payments for the authenticated user.

**Endpoint:** `GET /api/payments/history`

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "payments": [
    {
      "receiptNumber": "LS-00001",
      "paymentId": "pay_XXXXXXXXXXXXX",
      "orderId": "order_XXXXXXXXXXXXX",
      "paidAt": "2024-01-15T10:35:00.000Z",
      "amount": 99900,
      "currency": "INR",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerAddress": "123 Main St",
      "customerPincode": "123456",
      "paymentMode": "upi",
      "verified": true,
      "product": {
        "id": "intro-eating",
        "name": "Introduction to Eating",
        "description": "..."
      }
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `500` - Server error

---

### Download Receipt
Download payment receipt as text file.

**Endpoint:** `GET /api/payments/:paymentId/receipt`

**Authentication:** Required (Bearer token)

**Parameters:**
- `paymentId` - Payment ID from payment object

**Response (200):**
- Content-Type: `text/plain`
- Content-Disposition: `attachment; filename=LS-00001.txt`

**Errors:**
- `401` - Not authenticated
- `403` - Receipt access denied
- `404` - Receipt not found
- `500` - Server error

---

### Payment Webhook
Receive real-time payment notifications from Razorpay.

**Endpoint:** `POST /api/payments/webhook`

**Authentication:** Signature verification (x-razorpay-signature header)

**Request Body (from Razorpay):**
```json
{
  "event": "payment.captured",
  "payload": {
    "payment": {
      "entity": {
        "id": "pay_XXXXXXXXXXXXX",
        "order_id": "order_XXXXXXXXXXXXX",
        "amount": 99900,
        "currency": "INR",
        "method": "upi"
      }
    },
    "order": {
      "entity": {
        "id": "order_XXXXXXXXXXXXX",
        "notes": {
          "productId": "intro-eating",
          "customerEmail": "john@example.com"
        }
      }
    }
  }
}
```

**Response (200):**
```json
{
  "received": true
}
```

**Note:** This endpoint automatically updates payment status in the system.

---

## Bank Account Endpoints

### Get Bank Accounts
Get all saved bank accounts for the user.

**Endpoint:** `GET /api/bank-accounts`

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "accounts": [
    {
      "id": "ba_1234567890_abc123",
      "email": "john@example.com",
      "bankName": "HDFC Bank",
      "accountHolderName": "John Doe",
      "accountNumberMasked": "****7890",
      "ifsc": "HDFC0001234",
      "upiId": "",
      "createdAt": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `500` - Server error

---

### Add Bank Account
Save a new bank account with encrypted data.

**Endpoint:** `POST /api/bank-accounts`

**Authentication:** Required (Bearer token)

**Request Body:**
```json
{
  "bankName": "HDFC Bank",
  "accountHolderName": "John Doe",
  "accountNumber": "1234567890123456",
  "ifsc": "HDFC0001234",
  "upiId": ""
}
```

**Note:** Either `accountNumber` or `upiId` is required (not both).

**Response (201):**
```json
{
  "message": "Bank account added successfully",
  "account": {
    "id": "ba_1234567890_abc123",
    "email": "john@example.com",
    "bankName": "HDFC Bank",
    "accountHolderName": "John Doe",
    "accountNumberMasked": "****7890",
    "ifsc": "HDFC0001234",
    "upiId": "",
    "createdAt": "2024-01-15T10:30:00.000Z"
  }
}
```

**Validation:**
- Bank name required
- Account holder name required
- Account number: 8+ digits minimum
- IFSC: Format `XXXX0XXXXXX` (4 letters, 0, 6 alphanumeric)
- UPI: Email format

**Errors:**
- `400` - Validation failed
- `401` - Not authenticated
- `500` - Server error

---

### Delete Bank Account
Remove a saved bank account.

**Endpoint:** `DELETE /api/bank-accounts/:accountId`

**Authentication:** Required (Bearer token)

**Parameters:**
- `accountId` - Bank account ID from account object

**Response (200):**
```json
{
  "message": "Bank account deleted successfully"
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Cannot delete other user's account
- `404` - Bank account not found
- `500` - Server error

---

## Admin Endpoints

### Check Admin Status
Check if user has admin privileges.

**Endpoint:** `GET /api/admin/status`

**Authentication:** Required (Bearer token)

**Response (200):**
```json
{
  "authorized": true,
  "configured": true
}
```

---

### Get All Orders
Get all payments in the system (admin only).

**Endpoint:** `GET /api/payments/orders`

**Authentication:** Required (Bearer token, admin email)

**Response (200):**
```json
{
  "payments": [
    {
      "receiptNumber": "LS-00001",
      "paymentId": "pay_XXXXXXXXXXXXX",
      "orderId": "order_XXXXXXXXXXXXX",
      "paidAt": "2024-01-15T10:35:00.000Z",
      "amount": 99900,
      "currency": "INR",
      "customerName": "John Doe",
      "customerEmail": "john@example.com",
      "customerAddress": "123 Main St",
      "customerPincode": "123456",
      "paymentMode": "upi",
      "verified": true,
      "product": {
        "id": "intro-eating",
        "name": "Introduction to Eating"
      }
    }
  ]
}
```

**Errors:**
- `401` - Not authenticated
- `403` - Admin access required
- `500` - Server error

---

### Export Users
Export all users as Excel file (admin only).

**Endpoint:** `GET /api/export`

**Authentication:** Required (Bearer token, admin email)

**Response (200):**
- Content-Type: `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`
- File: `users.xlsx`

**Errors:**
- `401` - Not authenticated
- `403` - Admin access required
- `500` - Server error

---

## Error Handling

All errors follow standard HTTP status codes:

| Status | Meaning |
|--------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 500 | Server Error |
| 503 | Service Unavailable |

Error Response Format:
```json
{
  "message": "Description of error"
}
```

---

## Security Features

### 1. Signature Verification
All payment-related requests use HMAC-SHA256 signatures to prevent tampering.

### 2. Encryption
- Passwords: Scrypt with 64-byte keys
- Bank Account Numbers: AES-256-GCM
- Auth Tokens: HMAC-SHA256 signed

### 3. Authentication
- Bearer tokens with 7-day expiration
- Timing-safe comparison prevents timing attacks

### 4. Data Validation
- Email format validation
- Pincode length validation
- IFSC code format validation
- Amount verification on payment

### 5. Security Headers
```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: same-origin
Cross-Origin-Opener-Policy: same-origin
```

---

## Rate Limiting

No rate limiting is implemented by default. For production, add rate limiting middleware:

```javascript
const rateLimit = require('express-rate-limit');

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

app.use('/api/', limiter);
```

---

## Webhook Signature Verification

For security, verify webhook signatures server-side:

```javascript
const crypto = require('crypto');

function verifyWebhookSignature(rawBody, signature, secret) {
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  return expectedSignature === signature;
}
```

---

## Testing

### cURL Examples

**Register:**
```bash
curl -X POST http://localhost:3000/api/register \
  -H "Content-Type: application/json" \
  -d '{
    "loginName": "john_doe",
    "email": "john@example.com",
    "password": "password123",
    "address": "123 Main St",
    "pincode": "123456"
  }'
```

**Login:**
```bash
curl -X POST http://localhost:3000/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "john@example.com",
    "password": "password123"
  }'
```

**Get Config:**
```bash
curl http://localhost:3000/api/payments/config
```

**Get Bank Accounts:**
```bash
curl -H "Authorization: Bearer TOKEN_HERE" \
  http://localhost:3000/api/bank-accounts
```

---

## API Status Codes Reference

| Endpoint | 200 | 201 | 400 | 401 | 403 | 404 | 500 | 503 |
|----------|-----|-----|-----|-----|-----|-----|-----|-----|
| Register | | ✓ | ✓ | | | | ✓ | |
| Login | ✓ | | ✓ | ✓ | | | ✓ | |
| Get Config | ✓ | | | | | | | |
| Create Order | ✓ | | ✓ | ✓ | | | ✓ | ✓ |
| Verify Payment | ✓ | | ✓ | ✓ | | | ✓ | ✓ |
| Get History | ✓ | | | ✓ | | | ✓ | |
| Get Receipt | ✓ | | | ✓ | ✓ | ✓ | ✓ | |
| Webhook | ✓ | | | ✓ | | | ✓ | |
| Bank Accounts | ✓ | | | ✓ | | | ✓ | |
| Add Bank | | ✓ | ✓ | ✓ | | | ✓ | |
| Delete Bank | ✓ | | | ✓ | ✓ | ✓ | ✓ | |
| Admin Status | ✓ | | | ✓ | | | ✓ | |
| All Orders | ✓ | | | ✓ | ✓ | | ✓ | |
| Export Users | ✓ | | | ✓ | ✓ | | ✓ | |

---

**Last Updated:** January 2024  
**Version:** 1.0.0
