# LearnShop - Real-Time Secure Payment System

A complete Node.js payment system with real-time updates, bank account management, and security features.

## 🚀 Features

- ✅ **Razorpay Integration** - Accept payments via UPI, Cards, Net Banking, Wallets
- ✅ **Real-Time Payment Status** - Live updates on payment completion
- ✅ **Bank Account Management** - Users can save multiple bank accounts with encrypted data
- ✅ **Secure Checkout** - PCI-compliant, HTTPS-ready payment form
- ✅ **Webhook Support** - Instant payment confirmations via Razorpay webhooks
- ✅ **User Authentication** - Scrypt-encrypted passwords
- ✅ **Data Encryption** - AES-256-GCM encryption for sensitive bank details
- ✅ **Receipt Generation** - Automatic PDF/text receipts for transactions
- ✅ **Admin Dashboard** - View all payments and export user data

## 📋 Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

Required packages are already in `package.json`:
- `express` - Web server
- `cors` - Cross-origin requests
- `crypto` - Built-in Node.js encryption
- `xlsx` - Excel export functionality

### 2. Configure Environment Variables

Create a `.env` file in the backend directory:

```env
# Razorpay API Keys (Get from https://dashboard.razorpay.com/app/settings/api-keys)
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxx

# Server Configuration
PORT=3000
APP_AUTH_SECRET=your_super_secret_key_minimum_32_chars_long

# Admin Email (for accessing admin features)
ADMIN_EMAIL=admin@example.com

# Bank Account Details (Optional - for displaying to customers)
BENEFICIARY_NAME=Your Business Name
BENEFICIARY_UPI_ID=businessupi@bank
BENEFICIARY_BANK_NAME=HDFC Bank
BENEFICIARY_ACCOUNT_NAME=Your Account Name
BENEFICIARY_ACCOUNT_NUMBER=1234567890123456
BENEFICIARY_IFSC=HDFC0001234
```

### 3. Get Razorpay API Keys

1. Go to [Razorpay Dashboard](https://dashboard.razorpay.com)
2. Click on "Settings" → "API Keys"
3. Generate Key ID and Key Secret
4. Copy both keys to `.env` file

**For Webhooks:**
1. Go to "Settings" → "Webhooks"
2. Add webhook URL: `https://yourdomain.com/api/payments/webhook`
3. Select events: `payment.captured`, `order.paid`
4. Copy the webhook secret to `.env`

### 4. Start the Server

```bash
# Development (with auto-reload)
npm run dev

# Production
npm start
```

Server will run on `http://localhost:3000`

## 📁 File Structure

```
backend/
├── server.js                 # Main Express server
├── checkout.html            # Payment checkout page
├── login.html               # Login/Registration page
├── .env                     # Environment variables (create this)
├── .env.example             # Example environment file
├── users.json               # User accounts (auto-created)
├── payments.json            # Payment records (auto-created)
├── bankaccounts.json        # Encrypted bank accounts (auto-created)
└── package.json             # Dependencies
```

## 🔐 Security Features

### 1. **Password Encryption**
- Uses Scrypt hashing with 64-byte keys
- Automatically upgrades legacy SHA256 passwords
- Timing-safe comparison prevents timing attacks

### 2. **Bank Account Encryption**
- AES-256-GCM encryption for account numbers
- Authentication tag prevents tampering
- Accounts masked before display (shows only last 4 digits)

### 3. **Payment Verification**
- Razorpay signature verification on every payment
- Server-side amount verification prevents tampering
- JWT-like auth tokens with expiration

### 4. **Security Headers**
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- Referrer-Policy: same-origin
- Cross-Origin-Opener-Policy: same-origin

### 5. **Data Protection**
- Raw request body capture for webhook verification
- Constant-time comparison for sensitive operations
- Email normalization prevents case-sensitivity attacks

## 📡 API Endpoints

### Authentication
```
POST /api/register          # Create new user
POST /api/login             # Login user
```

### Payment
```
GET  /api/payments/config   # Get payment config & products
POST /api/payments/order    # Create payment order
POST /api/create-order       # Create payment order (alias)
POST /api/payments/verify   # Verify payment signature
POST /api/verify-payment     # Verify payment signature (alias)
GET  /api/payments/history  # Get user's payment history
POST /api/payments/webhook  # Razorpay webhook (secret)
GET  /api/payments/:id/receipt  # Download receipt
```

### Bank Accounts
```
GET  /api/bank-accounts     # Get user's bank accounts
POST /api/bank-accounts     # Add new bank account
DELETE /api/bank-accounts/:id  # Delete bank account
```

### Admin
```
GET  /api/admin/status      # Check admin authorization
GET  /api/payments/orders   # Get all payments (admin)
GET  /api/export            # Export all users as Excel
```

## 🔄 Real-Time Payment Updates

The checkout page polls the server every 2 seconds for payment status:

```javascript
// Real-time status updates
- Creating order
- Payment pending
- Verifying payment
- Payment successful
- Payment failed
```

You can extend this with WebSockets for instant updates:

```javascript
// Example WebSocket implementation
const socket = io(API_BASE);
socket.on('payment:status', (data) => {
    updatePaymentStatus(data.status, data.message);
});
```

## 💳 Bank Account Data Storage

Bank accounts are stored encrypted in `bankaccounts.json`:

```json
{
    "id": "ba_1234567890",
    "email": "user@example.com",
    "bankName": "HDFC Bank",
    "accountHolderName": "John Doe",
    "accountNumberEncrypted": {
        "iv": "hex_encoded_iv",
        "encrypted": "hex_encoded_encrypted_data",
        "authTag": "hex_encoded_auth_tag"
    },
    "ifsc": "HDFC0001234",
    "upiId": "",
    "createdAt": "2024-01-15T10:30:00.000Z"
}
```

Never stored in plain text. Account numbers are shown only as masked values (e.g., `****7890`).

## 🧪 Testing

### Test Cards (Razorpay Test Mode)
- **4111111111111111** - Visa test card
- **5555555555554444** - Mastercard test card
- **6011111111111117** - Discover test card
- **3782822463100005** - American Express

All test cards use expiry: 12/25, CVV: 123

### Test UPI
- Any UPI ID in test mode: `test@okhdfcbank`

### Test Admin Access
```json
{
    "loginName": "admin",
    "email": "admin@example.com",  // Must match ADMIN_EMAIL in .env
    "password": "testpassword",
    "address": "Test Address",
    "pincode": "123456"
}
```

## 🚀 Production Deployment

### 1. Update Environment
```env
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxx  # Use LIVE keys
PORT=8080  # Use port 8080
APP_AUTH_SECRET=very_long_random_secret_key_minimum_32_characters
```

### 2. Update Checkout URL
In `checkout.html`, update:
```javascript
const API_BASE = 'https://yourdomain.com';
```

### 3. Configure Razorpay Webhook
```
Webhook URL: https://yourdomain.com/api/payments/webhook
Events: payment.captured, order.paid
```

### 4. Serve Static Files
```bash
# Using Express for static files
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'checkout.html'));
});
```

### 5. Enable HTTPS
All production servers must use HTTPS for payment data.

Use Let's Encrypt with Certbot:
```bash
sudo certbot certonly --standalone -d yourdomain.com
```

## 📊 Data Models

### User
```javascript
{
    "loginName": "john_doe",
    "email": "john@example.com",
    "password": "scrypt$salt$hash",
    "address": "123 Main St",
    "pincode": "123456",
    "registeredAt": "2024-01-15T10:30:00.000Z"
}
```

### Payment
```javascript
{
    "receiptNumber": "LS-00001",
    "orderId": "order_xxxxx",
    "paymentId": "pay_xxxxx",
    "paidAt": "2024-01-15T10:35:00.000Z",
    "amount": 99900,  // Amount in paise (99900 = ₹999.00)
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
```

## 🐛 Troubleshooting

### "Razorpay is not configured"
- Check `.env` file has `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`
- Restart the server after updating `.env`

### "Payment verification failed"
- Verify webhook secret is correct
- Check order amount matches product amount
- Ensure payment status is "captured"

### "Bank account encryption failed"
- Check `APP_AUTH_SECRET` is at least 32 characters
- Verify `.env` file is properly loaded
- Clear `bankaccounts.json` and retry

### "Cannot read property 'trim' of undefined"
- One of the `.env` variables is missing
- Add all required variables to `.env`

## 📞 Support

For Razorpay issues:
- Visit [Razorpay Support](https://razorpay.com/support/)
- Check [Razorpay Docs](https://razorpay.com/docs/)

For code issues:
- Review error logs in terminal
- Check browser console for frontend errors
- Verify all `.env` variables are set

## 📜 License

This payment system is provided as-is for educational and commercial use.

## 🎯 Next Steps

1. ✅ Set up `.env` with Razorpay keys
2. ✅ Start the server: `npm start`
3. ✅ Open browser: `http://localhost:3000/login.html`
4. ✅ Create test account and make test payment
5. ✅ Verify webhook integration in Razorpay dashboard
6. ✅ Deploy to production with HTTPS

---

**Happy selling! 🎉**
