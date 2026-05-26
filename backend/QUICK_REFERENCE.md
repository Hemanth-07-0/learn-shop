# 🎯 LearnShop Payment System - Quick Reference Card

## ⚡ Quick Start (5 Minutes)

```bash
# 1. Install dependencies
npm install

# 2. Create environment file
cp .env.example .env
# Edit .env with your Razorpay credentials

# 3. Start server
npm start

# 4. Open browser
http://localhost:3000/login.html
```

## 🔑 Essential Configuration (.env)

```env
# REQUIRED - Get from https://dashboard.razorpay.com/app/settings/api-keys
RAZORPAY_KEY_ID=rzp_test_xxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx

# OPTIONAL but recommended
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx
ADMIN_EMAIL=admin@example.com
APP_AUTH_SECRET=your_secret_key_minimum_32_chars

# OPTIONAL - For displaying to customers
BENEFICIARY_NAME=Your Business Name
BENEFICIARY_UPI_ID=business@bank
```

## 📍 File Locations

| File | Purpose |
|------|---------|
| `server.js` | Main backend server |
| `checkout.html` | Payment form |
| `login.html` | Auth page |
| `users.json` | User database |
| `payments.json` | Payment records |
| `bankaccounts.json` | Encrypted accounts |

## 🌐 URLs (Development)

```
Login:     http://localhost:3000/login.html
Checkout:  http://localhost:3000/checkout.html
API:       http://localhost:3000/api/*
```

## 🔐 Test Credentials

**Test Card:** `4111111111111111`
**Expiry:** `12/25`
**CVV:** `123`

## 📡 Key API Endpoints

```javascript
// Authentication
POST   /api/register              Create account
POST   /api/login                 Login

// Payments
GET    /api/payments/config       Get config & products
POST   /api/payments/order        Create order
POST   /api/create-order           Create order (alias)
POST   /api/payments/verify       Verify payment
POST   /api/verify-payment         Verify payment (alias)
GET    /api/payments/history      Get user payments
GET    /api/payments/:id/receipt  Download receipt

// Bank Accounts
GET    /api/bank-accounts         Get accounts
POST   /api/bank-accounts         Add account
DELETE /api/bank-accounts/:id     Delete account

// Admin
GET    /api/admin/status          Check admin access
GET    /api/payments/orders       Get all payments
GET    /api/export                Export users
```

## 🔒 Security Features

| Feature | Implementation |
|---------|-----------------|
| Passwords | Scrypt (64-byte keys) |
| Bank Data | AES-256-GCM encryption |
| Payments | HMAC-SHA256 signature |
| Sessions | JWT-like tokens (7 days) |
| Transport | HTTPS ready |
| Headers | CSP, X-Frame-Options |

## 🐛 Common Problems & Fixes

| Problem | Solution |
|---------|----------|
| "Razorpay not configured" | Set RAZORPAY_KEY_ID in .env |
| Port already in use | Change PORT in .env or kill process |
| Cannot find module | Run `npm install` |
| Payment fails | Check amount matches product |
| Bank account error | Ensure APP_AUTH_SECRET is 32+ chars |
| Webhook not working | Register URL in Razorpay dashboard |

## 📊 Data Structure

### User Object
```json
{
  "loginName": "john_doe",
  "email": "john@example.com",
  "password": "scrypt$salt$hash",
  "address": "123 Main St",
  "pincode": "123456"
}
```

### Payment Object
```json
{
  "receiptNumber": "LS-00001",
  "orderId": "order_xxxxx",
  "paymentId": "pay_xxxxx",
  "amount": 99900,
  "currency": "INR",
  "customerEmail": "user@example.com",
  "verified": true,
  "product": { "id": "intro-eating" }
}
```

### Bank Account Object
```json
{
  "id": "ba_xxxxx",
  "bankName": "HDFC Bank",
  "accountHolderName": "John Doe",
  "accountNumberEncrypted": { "iv": "...", "encrypted": "...", "authTag": "..." },
  "ifsc": "HDFC0001234",
  "upiId": "optional@bank"
}
```

## 🛠️ Useful Commands

```bash
# Start server
npm start

# Development mode (auto-reload)
npm run dev

# Install dependencies
npm install

# Check Node version
node --version

# View JSON file
cat users.json | jq '.'

# Reset database
echo "[]" > users.json
echo "[]" > payments.json
echo "[]" > bankaccounts.json
```

## 🚀 Production Deployment

```bash
# 1. Get live keys from Razorpay
# 2. Update .env with LIVE keys
# 3. Enable HTTPS/TLS
# 4. Register webhook URL
# 5. Set ADMIN_EMAIL
# 6. Use PM2 for process management:

npm install -g pm2
pm2 start server.js --name "learnshop-payment"
pm2 startup
pm2 save
```

## 🔗 Quick Links

- **Razorpay Dashboard:** https://dashboard.razorpay.com
- **Razorpay Keys:** https://dashboard.razorpay.com/app/settings/api-keys
- **Razorpay Docs:** https://razorpay.com/docs/
- **Node.js Docs:** https://nodejs.org/docs/
- **Express Guide:** https://expressjs.com/

## 📝 Authentication Flow

```
User → Register (POST /api/register)
       ↓
   Create Account
       ↓
   Login (POST /api/login)
       ↓
   Get Token (Bearer token)
       ↓
   Use Token in Header: Authorization: Bearer <token>
```

## 💳 Payment Flow

```
User selects course
   ↓
Create Order (POST /api/payments/order)
   ↓
Open Razorpay Checkout
   ↓
Complete Payment
   ↓
Verify Payment (POST /api/payments/verify)
   ↓
Get Receipt (GET /api/payments/:id/receipt)
```

## 🔄 Real-Time Updates

- Frontend polls every 2 seconds
- Webhooks provide instant updates
- Status badges show live status
- Payment confirmed automatically

## ⚠️ Security Reminders

- ✅ Never commit `.env` to git
- ✅ Use HTTPS in production
- ✅ Change `APP_AUTH_SECRET` frequently
- ✅ Backup `users.json` & `payments.json`
- ✅ Monitor for failed payments
- ✅ Keep Node.js updated

## 📊 Products (Default)

| ID | Name | Price |
|----|------|-------|
| intro-eating | Introduction to Eating | ₹999 |
| benefits-eating | Benefits of Eating | ₹499 |
| what-is-food | What is Food? | ₹299 |

Edit in `server.js` PRODUCTS array to customize.

## 🆘 Emergency Commands

```bash
# Kill process on port 3000
# Windows: netstat -ano | findstr :3000 → taskkill /PID <PID> /F
# Mac: lsof -ti:3000 | xargs kill -9
# Linux: kill $(lsof -t -i:3000)

# Clear corrupted JSON
echo "[]" > payments.json

# Reset all data
rm users.json payments.json bankaccounts.json

# View server logs
npm start  # See console output
```

## 📞 When Stuck

1. **Read Error Message** - It usually tells you what's wrong
2. **Check Logs** - Look at console output
3. **Check Browser Console** - F12 → Console tab
4. **Verify .env** - All variables set correctly
5. **Restart Server** - Sometimes helps
6. **Read Documentation** - See README_PAYMENT_SYSTEM.md
7. **Check TROUBLESHOOTING.md** - Most issues covered

## ✅ Final Checklist

Before going live:
- [ ] npm install (dependencies installed)
- [ ] .env file created
- [ ] RAZORPAY_KEY_ID set
- [ ] RAZORPAY_KEY_SECRET set
- [ ] Server starts without errors
- [ ] Can create account
- [ ] Can login
- [ ] Can complete test payment
- [ ] Webhook secret configured
- [ ] Admin email set

## 🎉 You're Ready!

Your payment system is complete. Start selling today!

---

**For detailed info:** Read `README_PAYMENT_SYSTEM.md`  
**For API details:** Read `API_DOCUMENTATION.md`  
**For security:** Read `SECURITY_CHECKLIST.md`  
**For debugging:** Read `TROUBLESHOOTING.md`  

---

**Happy Selling! 🚀**
