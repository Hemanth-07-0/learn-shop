# ✅ Installation Verification Checklist

Complete this checklist to ensure your payment system is properly installed.

## 1️⃣ Prerequisites Check

```bash
# Check Node.js is installed
node --version
# Expected: v16.0.0 or higher

# Check npm is installed
npm --version
# Expected: v7.0.0 or higher
```

- [ ] Node.js installed
- [ ] npm installed

## 2️⃣ Project Setup Check

```bash
# Check files exist
ls -la server.js checkout.html login.html package.json
```

- [ ] server.js exists
- [ ] checkout.html exists
- [ ] login.html exists
- [ ] package.json exists

## 3️⃣ Dependencies Check

```bash
# Install dependencies
npm install

# Check installation
npm list
```

- [ ] npm install runs without errors
- [ ] express installed
- [ ] cors installed
- [ ] crypto available
- [ ] xlsx installed

## 4️⃣ Environment Configuration Check

```bash
# Check .env file exists
ls .env

# Check .env content
cat .env
```

**Required variables in .env:**
- [ ] RAZORPAY_KEY_ID (starts with rzp_test_ or rzp_live_)
- [ ] RAZORPAY_KEY_SECRET (long string)
- [ ] PORT (default 3000)
- [ ] APP_AUTH_SECRET (32+ characters)

## 5️⃣ Server Startup Check

```bash
# Start server
npm start

# Expected output:
# Server running on http://localhost:3000
```

- [ ] Server starts without errors
- [ ] No "Cannot find module" errors
- [ ] No "EADDRINUSE" errors
- [ ] No environment variable errors

## 6️⃣ API Endpoints Check

Open another terminal:

```bash
# Test basic API endpoint
curl http://localhost:3000/api/payments/config

# Expected response:
# {"keyId":"rzp_test_...", "currency":"INR", ...}
```

- [ ] /api/payments/config responds
- [ ] keyId is not empty
- [ ] Currency is "INR"
- [ ] Products array has 3 items

## 7️⃣ File Creation Check

After running the server for 2 seconds, stop it and check:

```bash
# Check database files will be created
ls users.json payments.json 2>/dev/null || echo "Will be created on first use"
```

- [ ] JSON files will be created on first use
- [ ] Current directory is correct

## 8️⃣ Frontend Pages Check

Open browser and navigate to:

```
http://localhost:3000/login.html
```

- [ ] Login page loads
- [ ] Registration form visible
- [ ] Login form visible
- [ ] No JavaScript errors (F12 → Console)
- [ ] CSS styles applied correctly

## 9️⃣ Registration Test

```
1. Click "Create one" to switch to registration
2. Fill in form:
   - Username: testuser
   - Email: test@example.com
   - Password: testpass123
   - Address: 123 Test St
   - Pincode: 123456
3. Click "Create Account"
```

- [ ] Registration form submits
- [ ] Success message appears
- [ ] Can switch to login form
- [ ] Email is pre-filled in login

## 🔟 Login Test

```
1. Enter test@example.com
2. Enter testpass123
3. Click "Sign In"
```

- [ ] Login succeeds
- [ ] Success message appears
- [ ] Redirects to checkout page
- [ ] Auth token saved in localStorage

## 1️⃣1️⃣ Checkout Page Check

On checkout page:

```
Check visible elements:
1. Course selection (3 products)
2. Customer information form
3. Order summary
4. Payment button
5. Bank accounts section
```

- [ ] 3 courses visible
- [ ] Customer form present
- [ ] Order summary shows "₹0"
- [ ] Bank accounts tab works
- [ ] Add bank account tab works
- [ ] Payment button disabled (no course selected)

## 1️⃣2️⃣ Product Selection Test

```
1. Click on "Introduction to Eating" course
2. Fill in customer form:
   - Name: Test User
   - Email: test@example.com
   - Address: 123 Test St
   - Pincode: 123456
3. Check order summary updates
```

- [ ] Course selected (highlighted in blue)
- [ ] Order summary updates
- [ ] Amount shows: ₹999.00
- [ ] Payment button becomes enabled
- [ ] All form fields validate

## 1️⃣3️⃣ Bank Account Test

```
1. Go to "Add Account" tab
2. Fill in:
   - Bank Name: HDFC Bank
   - Account Holder: Test User
   - Account Number: 1234567890123456
   - IFSC: HDFC0001234
3. Click "Save Bank Account"
```

- [ ] Form submits
- [ ] Success message appears
- [ ] Account appears in "Saved Accounts" tab
- [ ] Account number is masked (****3456)
- [ ] Can delete account

## 1️⃣4️⃣ Data Files Check

Stop server and verify:

```bash
# Check if files were created
cat users.json | jq '.[] | {email, loginName}'
```

- [ ] users.json contains registered user
- [ ] Email is lowercase
- [ ] User has all fields
- [ ] Password is hashed (starts with "scrypt$")

```bash
# Check bank accounts if created
cat bankaccounts.json | jq '.[0]'
```

- [ ] bankaccounts.json has encrypted data
- [ ] accountNumberEncrypted has iv, encrypted, authTag
- [ ] Account details are JSON valid

## 1️⃣5️⃣ Documentation Check

Verify all documentation files exist:

```bash
ls -la README_PAYMENT_SYSTEM.md
ls -la API_DOCUMENTATION.md
ls -la SECURITY_CHECKLIST.md
ls -la TROUBLESHOOTING.md
ls -la QUICK_REFERENCE.md
```

- [ ] README_PAYMENT_SYSTEM.md exists
- [ ] API_DOCUMENTATION.md exists
- [ ] SECURITY_CHECKLIST.md exists
- [ ] TROUBLESHOOTING.md exists
- [ ] QUICK_REFERENCE.md exists
- [ ] IMPLEMENTATION_SUMMARY.md exists

## 🔒 Security Check

```javascript
// Verify in server.js:
1. encryptData function exists
2. decryptData function exists
3. verifyWebhookSignature function exists
4. Bank account endpoints exist:
   - POST /api/bank-accounts
   - GET /api/bank-accounts
   - DELETE /api/bank-accounts/:id
5. Security headers middleware exists
```

- [ ] Encryption functions present
- [ ] Bank endpoints implemented
- [ ] Webhook verification present
- [ ] Security headers configured

## 📊 Final System Check

| Component | Status | Notes |
|-----------|--------|-------|
| Node.js | ✓/✗ | Check with `node --version` |
| Dependencies | ✓/✗ | Check with `npm list` |
| Server startup | ✓/✗ | No errors on `npm start` |
| API endpoints | ✓/✗ | Test with `curl` |
| Login page | ✓/✗ | Loads at localhost:3000/login.html |
| Checkout page | ✓/✗ | Loads after login |
| User registration | ✓/✗ | Can create account |
| Login functionality | ✓/✗ | Can login |
| Database files | ✓/✗ | Files created with data |
| Bank encryption | ✓/✗ | Data encrypted in storage |
| Documentation | ✓/✗ | All files present |

## 🚨 Troubleshooting

If any checks fail, use this guide:

### ❌ "Cannot find module 'express'"
```bash
rm -rf node_modules
npm install
```

### ❌ "Port 3000 already in use"
```bash
# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Mac/Linux
lsof -ti:3000 | xargs kill -9
```

### ❌ "RAZORPAY_KEY_ID undefined"
```bash
# Check .env file
cat .env | grep RAZORPAY

# Ensure it's not empty
# Restart server after .env changes
```

### ❌ "Cannot read property 'trim' of undefined"
```bash
# Make sure all required variables in .env:
RAZORPAY_KEY_ID=your_key
RAZORPAY_KEY_SECRET=your_secret
APP_AUTH_SECRET=your_secret_32_chars_min
```

## ✅ System Ready Confirmation

When all checks pass, your system is ready:

```
✅ Dependencies installed
✅ Server running
✅ API responding
✅ Frontend pages loading
✅ User registration working
✅ Login functionality working
✅ Bank account encryption working
✅ Database files created
✅ Documentation complete
✅ Security features implemented
```

## 🚀 Next Steps

Once all checks pass:

1. **Read documentation:**
   - README_PAYMENT_SYSTEM.md
   - QUICK_REFERENCE.md

2. **Test payment flow:**
   - Register test account
   - Select course
   - Test payment with test card

3. **Get Razorpay webhook secret:**
   - Go to https://dashboard.razorpay.com/app/settings/webhooks
   - Add webhook URL
   - Copy webhook secret to .env

4. **Deploy to production:**
   - Get live API keys from Razorpay
   - Update .env with live keys
   - Enable HTTPS
   - Set ADMIN_EMAIL
   - Deploy with PM2

## 📞 Support

If issues persist:
1. Check TROUBLESHOOTING.md
2. Review API_DOCUMENTATION.md
3. Check browser console (F12)
4. Check server console output
5. Review .env configuration
6. Check Razorpay docs

## ✨ Ready to Go!

Your payment system is installed and ready for testing. 

**Next: Read QUICK_REFERENCE.md for common tasks**

---

**Verification Date:** _________
**System Status:** ✅ Ready / ❌ Needs Fix
**Notes:** ___________________

---

**Happy Selling! 🎉**
