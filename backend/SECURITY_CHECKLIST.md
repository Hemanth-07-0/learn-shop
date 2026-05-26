# LearnShop Payment System - Security Checklist

Complete security guide for production deployment.

## 🔐 Pre-Deployment Checklist

### Environment Setup
- [ ] Create `.env` file (never commit to git)
- [ ] Add all required environment variables
- [ ] Use strong `APP_AUTH_SECRET` (32+ characters)
- [ ] Generate Razorpay API keys from test environment first
- [ ] Set up Razorpay webhook URL and secret
- [ ] Add admin email to `ADMIN_EMAIL` variable

### Server Security
- [ ] Enable HTTPS/TLS (required for payment data)
- [ ] Install SSL certificate (Let's Encrypt recommended)
- [ ] Enable CORS only for trusted domains
- [ ] Disable X-Powered-By header (done in code)
- [ ] Set security headers (done in code)
- [ ] Enable request body size limits
- [ ] Configure rate limiting for API endpoints

### Database Security
- [ ] Back up `users.json`, `payments.json` regularly
- [ ] Set file permissions (readable by app only)
- [ ] Never store plain text passwords
- [ ] Encrypt sensitive data in transit
- [ ] Use environment variables for secrets

### Payment Gateway Security
- [ ] Verify Razorpay signature on every payment
- [ ] Check payment amount matches product price
- [ ] Verify payment status is "captured"
- [ ] Implement webhook signature verification
- [ ] Monitor for failed payments
- [ ] Log all payment transactions
- [ ] Set up Razorpay alerts for anomalies

## 🛡️ Security Best Practices Implemented

### ✅ Implemented in LearnShop

1. **Password Hashing**
   - Algorithm: Scrypt (not MD5 or SHA1)
   - Key Length: 64 bytes
   - Salt: Random 16 bytes
   - Legacy password upgrade available

2. **Bank Account Encryption**
   - Algorithm: AES-256-GCM
   - IV: Random 16 bytes per encryption
   - Authentication tag: Prevents tampering
   - Never shown in plain text

3. **Authentication**
   - JWT-like tokens with expiration (7 days)
   - HMAC-SHA256 signatures
   - Timing-safe comparison
   - Automatic token validation

4. **Payment Verification**
   - HMAC-SHA256 signature verification
   - Amount verification
   - Status verification
   - Order ID validation
   - Currency validation

5. **Security Headers**
   - X-Content-Type-Options: nosniff
   - X-Frame-Options: DENY
   - Referrer-Policy: same-origin
   - Cross-Origin-Opener-Policy: same-origin

## 🚀 Production Deployment Steps

### 1. Server Preparation
```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js (if not installed)
curl -sL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2 for process management
sudo npm install -g pm2
```

### 2. SSL Certificate Setup
```bash
# Install Certbot
sudo apt install -y certbot python3-certbot-nginx

# Get certificate
sudo certbot certonly --standalone -d yourdomain.com

# Set up auto-renewal
sudo certbot renew --dry-run
```

### 3. Application Setup
```bash
# Clone/Copy application
git clone <repo> /home/learnshop/backend
cd /home/learnshop/backend

# Install dependencies
npm install --production

# Create .env file
cp .env.example .env
# Edit .env with production values
nano .env

# Start with PM2
pm2 start server.js --name "learnshop-payment"
pm2 startup
pm2 save
```

### 4. Nginx Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name yourdomain.com;

    ssl_certificate /etc/letsencrypt/live/yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/yourdomain.com/privkey.pem;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-Frame-Options "DENY" always;
    add_header Referrer-Policy "same-origin" always;

    # Rate limiting
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req zone=api burst=20 nodelay;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    location /api/payments/webhook {
        # Webhook doesn't need rate limiting
        proxy_pass http://localhost:3000;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

### 5. Environment Variables (Production)
```env
# Production mode
NODE_ENV=production

# Server
PORT=3000
APP_AUTH_SECRET=very_long_random_secret_with_32_characters_minimum_xyz

# Razorpay LIVE Keys
RAZORPAY_KEY_ID=rzp_live_xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_KEY_SECRET=xxxxxxxxxxxxxxxxxxxxx
RAZORPAY_WEBHOOK_SECRET=xxxxxxxxxxxxxxxxxxxxx

# Admin access
ADMIN_EMAIL=admin@yourdomain.com

# Bank details
BENEFICIARY_NAME=Your Business Name
BENEFICIARY_UPI_ID=business@bank
BENEFICIARY_BANK_NAME=HDFC Bank
BENEFICIARY_ACCOUNT_NAME=Account Name
BENEFICIARY_ACCOUNT_NUMBER=1234567890123456
BENEFICIARY_IFSC=HDFC0001234
```

### 6. Data Backup Strategy
```bash
# Create backup script
cat > /home/learnshop/backup.sh << 'EOF'
#!/bin/bash
BACKUP_DIR="/home/learnshop/backups"
mkdir -p $BACKUP_DIR

# Backup database files
cp /home/learnshop/backend/users.json $BACKUP_DIR/users.$(date +%Y%m%d_%H%M%S).json
cp /home/learnshop/backend/payments.json $BACKUP_DIR/payments.$(date +%Y%m%d_%H%M%S).json
cp /home/learnshop/backend/bankaccounts.json $BACKUP_DIR/bankaccounts.$(date +%Y%m%d_%H%M%S).json

# Keep only last 30 days
find $BACKUP_DIR -type f -mtime +30 -delete
EOF

chmod +x /home/learnshop/backup.sh

# Schedule daily backups
crontab -e
# Add: 0 2 * * * /home/learnshop/backup.sh
```

### 7. Monitoring & Logging
```bash
# Install PM2 monitoring
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 7

# View logs
pm2 logs learnshop-payment
```

## ⚠️ Security Issues & Fixes

### Issue 1: Weak Session Storage
**Problem:** Using localStorage for tokens
**Solution:** 
- Use httpOnly cookies for production
- Implement token refresh mechanism
- Add CSRF token protection

### Issue 2: Direct File Storage
**Problem:** Using JSON files instead of database
**Solution:**
- Migrate to MongoDB or PostgreSQL
- Add proper backup and restore procedures
- Implement transaction logs

### Issue 3: Missing Rate Limiting
**Problem:** No protection against brute force
**Solution:**
- Implement express-rate-limit middleware
- Set stricter limits for login endpoint
- Use Redis for distributed rate limiting

### Issue 4: Unencrypted Database
**Problem:** Files stored on disk in plain text
**Solution:**
- Use encrypted filesystems
- Implement full-disk encryption
- Use database-level encryption

## 🔍 Security Testing

### Test Cases to Verify

1. **Authentication**
   - [ ] Cannot access endpoints without token
   - [ ] Expired tokens are rejected
   - [ ] Invalid tokens are rejected
   - [ ] Tampered tokens are detected

2. **Payment Security**
   - [ ] Cannot modify payment amount
   - [ ] Cannot bypass signature verification
   - [ ] Cannot access others' receipts
   - [ ] Cannot replay old payments

3. **Bank Account Security**
   - [ ] Account numbers are encrypted
   - [ ] Cannot access others' accounts
   - [ ] Cannot modify account data
   - [ ] Deleted accounts are removed

4. **Admin Access**
   - [ ] Only admin can access admin endpoints
   - [ ] Cannot escalate privileges
   - [ ] Admin email cannot be changed
   - [ ] Audit logs show admin actions

## 📋 Compliance & Regulations

### PCI DSS (Payment Card Industry)
- [ ] No sensitive data in logs
- [ ] HTTPS/TLS 1.2 minimum
- [ ] Regular security updates
- [ ] Access control implemented
- [ ] Encryption for stored data

### GDPR (General Data Protection)
- [ ] User data collection consent
- [ ] Right to access data
- [ ] Right to delete data
- [ ] Data breach notification
- [ ] Privacy policy available

### ISI (Indian Standards)
- [ ] Compliant with RBI guidelines
- [ ] KYC implementation (recommended)
- [ ] AML compliance (recommended)
- [ ] Data localization (India)

## 🚨 Incident Response

### Payment Fraud Detected
1. Immediately notify affected users
2. Disable user account (optional)
3. Contact Razorpay support
4. Review payment logs
5. Update security measures
6. Document incident

### Data Breach
1. Assess extent of breach
2. Notify users immediately
3. Change all secrets/keys
4. Review access logs
5. Update security practices
6. File compliance report

### Webhook Signature Failure
1. Verify webhook URL in Razorpay
2. Check webhook secret in `.env`
3. Verify raw body handling
4. Check for proxy issues
5. Contact Razorpay support

## 📞 Security Contacts

- **Razorpay Support:** https://razorpay.com/support/
- **Security Advisory:** security@razorpay.com
- **Node.js Security:** https://nodejs.org/en/security/
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/

## ✅ Final Checklist

Before going live:
- [ ] All `.env` variables set correctly
- [ ] HTTPS/TLS configured
- [ ] Backup system in place
- [ ] Monitoring enabled
- [ ] Rate limiting configured
- [ ] Security headers set
- [ ] Razorpay webhook configured
- [ ] Admin email set
- [ ] Payment testing completed
- [ ] Error logging enabled
- [ ] Database backups scheduled
- [ ] Security audit completed
- [ ] Incident response plan documented
- [ ] User privacy policy published
- [ ] Terms of service published

---

**Remember:** Security is an ongoing process, not a one-time setup. Regularly review and update your security practices.

**Last Updated:** January 2024  
**Version:** 1.0.0
