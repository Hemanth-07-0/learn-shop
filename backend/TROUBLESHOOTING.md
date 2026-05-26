# LearnShop Payment System - Troubleshooting Guide

Quick solutions to common problems.

## ❌ Server Won't Start

### Error: "Cannot find module 'express'"
**Solution:**
```bash
npm install
npm start
```

### Error: "listen EADDRINUSE: address already in use :::3000"
**Solution:**
```bash
# Kill process on port 3000
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Or change port in .env
PORT=3001
```

### Error: "ENOENT: no such file or directory '.env'"
**Solution:**
```bash
# Create .env file
cp .env.example .env

# Add your Razorpay credentials
nano .env
```

---

## 💳 Payment Issues

### "Razorpay is not configured"
**Check:**
- [ ] `.env` file exists
- [ ] `RAZORPAY_KEY_ID` is set
- [ ] `RAZORPAY_KEY_SECRET` is set
- [ ] Keys are not empty strings
- [ ] Server restarted after .env change

**Fix:**
```bash
# Verify .env file
cat .env | grep RAZORPAY

# If empty, update .env
nano .env

# Restart server
npm start
```

### "Payment verification failed"
**Check:**
- [ ] Correct Razorpay keys (test/live)
- [ ] Payment amount matches product
- [ ] Payment status is "captured"
- [ ] Webhook secret is correct

**Debug:**
```javascript
// In server.js, add logging
console.log('Payment verification details:', {
  orderId,
  paymentId,
  signature,
  product: product.amount,
  razorpayAmount: razorpayPayment.amount,
  status: razorpayPayment.status,
});
```

### "Order not found"
**Cause:** Product ID doesn't match

**Fix:**
```javascript
// Verify product ID
const products = [
  { id: 'intro-eating', ... },
  { id: 'benefits-eating', ... },
];
```

### Payment shows but doesn't verify
**Cause:** Webhook not configured

**Fix:**
1. Go to Razorpay Dashboard
2. Settings → Webhooks
3. Add: `https://yourdomain.com/api/payments/webhook`
4. Events: `payment.captured`, `order.paid`
5. Copy webhook secret to `.env`

---

## 🔐 Authentication Issues

### "Cannot find property 'trim' of undefined"
**Cause:** Missing .env variable

**Fix:**
```env
# Add all required variables
PORT=3000
RAZORPAY_KEY_ID=rzp_test_xxxxx
RAZORPAY_KEY_SECRET=xxxxx
APP_AUTH_SECRET=your_secret_here_minimum_32_chars
ADMIN_EMAIL=admin@example.com
```

### "Invalid email or password"
**Check:**
- [ ] Email is correct
- [ ] Password is correct
- [ ] User is registered
- [ ] Email is case-insensitive

**Debug:**
```bash
# Check users.json
cat users.json | jq '.[] | {email, loginName}'
```

### "Sign in again to continue"
**Cause:** Token expired or invalid

**Fix:**
```javascript
// Tokens expire after 7 days
const APP_AUTH_TTL_MS = 1000 * 60 * 60 * 24 * 7;

// Clear localStorage and login again
localStorage.clear();
window.location.href = '/login.html';
```

### "User already exists"
**Solution:**
1. Use different email
2. Or reset users.json: `echo "[]" > users.json`

---

## 🏦 Bank Account Issues

### "Bank account encryption failed"
**Cause:** `APP_AUTH_SECRET` too short or missing

**Fix:**
```env
# Must be at least 32 characters
APP_AUTH_SECRET=your_very_long_secret_key_minimum_32_characters_xyz

# Or regenerate encryption key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Cannot decrypt bank account
**Cause:** Different `APP_AUTH_SECRET` used

**Solution:**
- Don't change `APP_AUTH_SECRET` after saving accounts
- If changed, accounts become unrecoverable
- Clear bankaccounts.json and let users re-add

### Account number not masked
**Cause:** Decryption failed

**Fix:**
```javascript
// Ensure encryption/decryption functions work
const crypto = require('crypto');
const encrypted = encryptData('1234567890123456');
const decrypted = decryptData(encrypted);
console.log(decrypted); // Should show original number
```

---

## 🌐 Webhook Issues

### "Invalid webhook signature"
**Check:**
- [ ] Webhook secret matches Razorpay dashboard
- [ ] Using `x-razorpay-signature` header
- [ ] Raw body not parsed

**Debug:**
```javascript
// In webhook handler
console.log('Webhook headers:', req.headers);
console.log('Raw body length:', req.rawBody.length);
console.log('Signature:', normalizeText(req.headers['x-razorpay-signature']));
```

### Webhook not being called
**Check:**
- [ ] Webhook URL is accessible
- [ ] HTTPS is enabled
- [ ] Firewall allows incoming requests
- [ ] Razorpay webhook is enabled

**Test:**
```bash
# Test webhook endpoint
curl -X POST https://yourdomain.com/api/payments/webhook \
  -H "Content-Type: application/json" \
  -H "x-razorpay-signature: test" \
  -d '{"event":"payment.captured","payload":{}}'
```

---

## 📁 File Issues

### "Cannot read property of undefined" in payments.json
**Cause:** Corrupt JSON file

**Fix:**
```bash
# Backup corrupt file
cp payments.json payments.json.bak

# Reset with valid JSON
echo "[]" > payments.json
```

### Permission denied on JSON files
**Fix:**
```bash
# Fix permissions
chmod 644 users.json payments.json bankaccounts.json

# Or run with sudo
sudo npm start
```

### Files grow too large
**Solution:**
```bash
# Archive old data
cp payments.json payments.backup.$(date +%Y%m%d).json

# Keep only recent data
echo "[]" > payments.json
```

---

## 🌍 Frontend Issues

### "Checkout page blank"
**Check:**
- [ ] Open browser console (F12)
- [ ] Check for JavaScript errors
- [ ] Verify auth token in localStorage

**Fix:**
```javascript
// In browser console
console.log(localStorage.getItem('authToken'));
// If empty, login again
window.location.href = '/login.html';
```

### "Cannot read config"
**Cause:** API not responding

**Check:**
```bash
# Test API endpoint
curl http://localhost:3000/api/payments/config

# If fails, server not running
npm start
```

### "Payment button disabled"
**Fix:**
- [ ] Select a course
- [ ] Fill all customer fields
- [ ] Select payment method

### Razorpay checkout not opening
**Check:**
- [ ] Internet connection working
- [ ] Razorpay key ID is correct
- [ ] Test mode enabled in Razorpay

**Debug:**
```javascript
// Open browser console
// Check for Razorpay script loading
console.log(window.Razorpay);
// Should not be undefined
```

---

## 📊 Data Issues

### Cannot see payments in history
**Check:**
1. Payments saved with correct user email
2. User is logged in with same email
3. Payment verified = true

**Debug:**
```bash
# Check payments.json
cat payments.json | jq '.[] | {customerEmail, verified}'
```

### Export file empty or corrupted
**Fix:**
```javascript
// Ensure users.json is valid JSON
node -e "console.log(JSON.parse(require('fs').readFileSync('users.json', 'utf8')).length)"
```

---

## 🚀 Production Issues

### "Connection refused" after deployment
**Check:**
- [ ] Server running: `pm2 status`
- [ ] Port correct: `ss -tlnp | grep 3000`
- [ ] Firewall allowing port
- [ ] Nginx configured correctly

**Restart:**
```bash
pm2 restart learnshop-payment
pm2 logs learnshop-payment
```

### SSL certificate expired
**Fix:**
```bash
# Renew certificate
sudo certbot renew --force-renewal

# Or auto-renew
sudo certbot renew --quiet --no-eff-email
```

### High memory usage
**Solution:**
```bash
# Check memory
pm2 monit

# Restart process
pm2 restart learnshop-payment

# Or limit memory
pm2 start server.js --max-memory-restart 512M
```

---

## 🔧 Debug Mode

### Enable detailed logging
```javascript
// In server.js
const DEBUG = process.env.DEBUG === 'true';

if (DEBUG) {
  console.log('Payment order:', order);
  console.log('Razorpay response:', payload);
  console.log('Signature verification:', isValid);
}
```

**Run with debugging:**
```bash
DEBUG=true npm start
```

### View all environment variables
```bash
# Show all loaded .env variables
node -e "require('dotenv').config(); console.log(process.env)" | grep RAZORPAY
```

### Test payment flow manually
```bash
# Create order
curl -X POST http://localhost:3000/api/payments/order \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "productId": "intro-eating",
    "paymentMode": "standard",
    "customerContact": "user@example.com"
  }'

# Alias route also available:
# curl -X POST http://localhost:3000/api/create-order ...

# Response will include orderId
# Use orderId to create payment in Razorpay
```

---

## 📞 Need More Help?

### Check Logs
```bash
# Server logs
npm start  # See console output

# PM2 logs (production)
pm2 logs learnshop-payment

# Browser console
F12 → Console tab
```

### Verify Configuration
```bash
# Check .env file
cat .env

# Check server started
curl http://localhost:3000/api/payments/config

# Check user exists
cat users.json | jq '.[] | {email, loginName}'
```

### Common Commands
```bash
# Install dependencies
npm install

# Start server
npm start

# Development mode (auto-reload)
npm run dev

# Check Node version
node --version

# Check npm version
npm --version

# Clear node_modules
rm -rf node_modules
npm install
```

---

## 🆘 Still Not Working?

1. **Read the error message carefully** - it usually tells you what's wrong
2. **Check logs** - look at both server console and browser console
3. **Search** - Google the error message with your environment
4. **Check documentation** - Read README_PAYMENT_SYSTEM.md and API_DOCUMENTATION.md
5. **Test components** - Isolate which part is failing
6. **Restart** - Sometimes a fresh start fixes issues
7. **Reset** - Clear .json files and try from scratch

**Last Resort:**
```bash
# Reset everything
rm -rf node_modules users.json payments.json bankaccounts.json
npm install
npm start
# Create new test account
```

---

**Last Updated:** January 2024  
**Version:** 1.0.0
