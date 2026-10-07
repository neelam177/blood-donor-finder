# BloodConnect - Complete Deployment Guide

This guide covers deploying the BloodConnect application from scratch, including database setup, application deployment, and all necessary configurations.

---

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Database Setup](#database-setup)
3. [Application Setup](#application-setup)
4. [Deployment Options](#deployment-options)
5. [Environment Variables](#environment-variables)
6. [Post-Deployment](#post-deployment)
7. [Troubleshooting](#troubleshooting)

---

## Prerequisites

Before deploying, ensure you have:

- Node.js 20+ installed
- MySQL 8.0+ database server
- Git installed
- A hosting platform account (Vercel, Railway, or VPS)

---

## Database Setup

### Option 1: Local MySQL Server

If you're using your local MySQL server (like you have with TablePlus and DB Engine):

#### Step 1: Create Database

```sql
CREATE DATABASE blood_donor_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE blood_donor_db;
```

#### Step 2: Create Tables

Run the following SQL schema:

```sql
-- Users table
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  phone VARCHAR(10) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email),
  INDEX idx_role (role)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Donor profiles table
CREATE TABLE donor_profiles (
  id INT PRIMARY KEY AUTO_INCREMENT,
  user_id INT NOT NULL,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  gender ENUM('male', 'female', 'other') NOT NULL,
  age INT NOT NULL CHECK (age >= 18 AND age <= 65),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  last_donation_date DATE NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_blood_group (blood_group),
  INDEX idx_city (city),
  INDEX idx_available (is_available),
  INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Blood requests table
CREATE TABLE blood_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id INT NOT NULL,
  patient_name VARCHAR(100) NOT NULL,
  blood_group ENUM('A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-') NOT NULL,
  units_needed INT NOT NULL CHECK (units_needed > 0),
  hospital VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(10) NOT NULL,
  urgency ENUM('normal', 'urgent', 'critical') DEFAULT 'normal',
  note TEXT NULL,
  needed_by DATE NOT NULL,
  status ENUM('open', 'fulfilled', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_blood_group (blood_group),
  INDEX idx_city (city),
  INDEX idx_status (status),
  INDEX idx_urgency (urgency),
  INDEX idx_requester (requester_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Request responses table
CREATE TABLE request_responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  donor_id INT NOT NULL,
  message TEXT NULL,
  status ENUM('pending', 'accepted', 'rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_response (request_id, donor_id),
  INDEX idx_request (request_id),
  INDEX idx_donor (donor_id),
  INDEX idx_created (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
```

#### Step 3: Verify Tables Created

```sql
SHOW TABLES;
DESCRIBE users;
DESCRIBE donor_profiles;
DESCRIBE blood_requests;
DESCRIBE request_responses;
```

---

### Option 2: Cloud MySQL Database (Recommended for Production)

#### A. PlanetScale (Free tier available)

1. Sign up at [PlanetScale](https://planetscale.com/)
2. Create a new database
3. Get connection string from dashboard
4. Import schema using PlanetScale CLI or web console

```bash
# Using PlanetScale CLI
pscale shell <database-name> <branch-name> < schema.sql
```

#### B. Railway MySQL

1. Sign up at [Railway](https://railway.app/)
2. Create New Project → Add MySQL
3. Get connection details from Variables tab
4. Connect using TablePlus or MySQL Workbench
5. Run the schema SQL above

#### C. AWS RDS MySQL

1. Create RDS MySQL instance in AWS Console
2. Configure security groups (allow your IP)
3. Connect using TablePlus with credentials
4. Run schema SQL

#### D. DigitalOcean Managed MySQL

1. Create Managed Database in DigitalOcean
2. Download CA certificate if required
3. Connect using TablePlus
4. Run schema SQL

---

### Option 3: Exporting Your Existing Database

If you already have data in your local database:

#### Using TablePlus

1. Open your database in TablePlus
2. Right-click database → Export → SQL Dump
3. Choose options:
   - ✅ Structure (CREATE TABLE statements)
   - ✅ Data (INSERT statements)
   - ✅ Drop tables if exists
4. Save as `database_export.sql`

#### Using mysqldump (Command Line)

```bash
# Export schema and data
mysqldump -u root -p blood_donor_db > database_export.sql

# Export schema only
mysqldump -u root -p --no-data blood_donor_db > schema_only.sql

# Export data only
mysqldump -u root -p --no-create-info blood_donor_db > data_only.sql
```

#### Import to Production Database

```bash
# Using mysql client
mysql -h <host> -u <username> -p <database_name> < database_export.sql

# Or using TablePlus
# File → Import → SQL File → Select database_export.sql
```

---

## Application Setup

### Step 1: Clone Repository

```bash
git clone <your-repo-url>
cd blood-donor-finder
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Configure Environment Variables

Create `.env.local` file in the root directory:

```env
# Database Configuration
DB_HOST=your-database-host
DB_PORT=3306
DB_USER=your-database-username
DB_PASSWORD=your-database-password
DB_NAME=blood_donor_db

# JWT Secret (generate a random string)
JWT_SECRET=your-super-secret-jwt-key-min-32-characters-long

# Node Environment
NODE_ENV=production
```

**Generate a secure JWT_SECRET:**

```bash
# Using Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Using OpenSSL
openssl rand -hex 32
```

### Step 4: Test Locally

```bash
# Run development server
npm run dev

# Build for production
npm run build

# Test production build
npm start
```

---

## Deployment Options

### Option 1: Vercel (Recommended - Easiest)

#### Prerequisites
- Push your code to GitHub/GitLab/Bitbucket
- Have your database ready (use PlanetScale, Railway, or AWS RDS)

#### Steps

1. **Sign up/Login to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Sign up with GitHub

2. **Import Project**
   - Click "Add New" → "Project"
   - Select your repository
   - Click "Import"

3. **Configure Environment Variables**
   - In project settings, go to "Environment Variables"
   - Add all variables from `.env.local`:
     - `DB_HOST`
     - `DB_PORT`
     - `DB_USER`
     - `DB_PASSWORD`
     - `DB_NAME`
     - `JWT_SECRET`

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your app will be live at `<project-name>.vercel.app`

5. **Custom Domain (Optional)**
   - Go to Settings → Domains
   - Add your custom domain
   - Update DNS records as instructed

#### Vercel with PlanetScale (Best Combo)

```bash
# 1. Create PlanetScale database
pscale database create blood-donor-db --region us-east

# 2. Create production branch
pscale branch create blood-donor-db production

# 3. Get connection string
pscale connect blood-donor-db production --port 3309

# 4. In Vercel, add environment variables:
# DB_HOST=aws.connect.psdb.cloud
# DB_USER=<from-planetscale>
# DB_PASSWORD=<from-planetscale>
# DB_NAME=blood-donor-db
# Add ?ssl={"rejectUnauthorized":true} to connection if needed
```

---

### Option 2: Railway

Railway provides both hosting and database in one platform.

#### Steps

1. **Sign up at Railway**
   - Go to [railway.app](https://railway.app)

2. **Create New Project**
   - Click "New Project"
   - Choose "Deploy from GitHub repo"

3. **Add MySQL Database**
   - In project dashboard, click "New"
   - Select "Database" → "MySQL"
   - Note the connection details

4. **Configure Environment Variables**
   - Click on your service
   - Go to "Variables" tab
   - Add:
     ```
     DB_HOST=${{MySQL.MYSQL_HOST}}
     DB_PORT=${{MySQL.MYSQL_PORT}}
     DB_USER=${{MySQL.MYSQL_USER}}
     DB_PASSWORD=${{MySQL.MYSQL_PASSWORD}}
     DB_NAME=${{MySQL.MYSQL_DATABASE}}
     JWT_SECRET=<your-generated-secret>
     ```

5. **Import Database Schema**
   - Click on MySQL service
   - Click "Connect"
   - Use provided connection string to import schema

6. **Deploy**
   - Push changes to GitHub
   - Railway auto-deploys

---

### Option 3: DigitalOcean App Platform

#### Steps

1. **Create App**
   - Go to [DigitalOcean](https://www.digitalocean.com/)
   - Create new App → Choose GitHub repository

2. **Create Managed MySQL Database**
   - In DigitalOcean, create Managed Database
   - Choose MySQL 8
   - Note connection details

3. **Configure Build Settings**
   - Build Command: `npm run build`
   - Run Command: `npm start`

4. **Add Environment Variables**
   - In App settings → Environment Variables
   - Add all database and JWT variables

5. **Connect Database to App**
   - In App settings → Add Component → Database
   - Select your MySQL database

---

### Option 4: AWS (EC2 + RDS)

For full control and scalability.

#### Step 1: Create RDS MySQL Instance

```bash
# Using AWS CLI
aws rds create-db-instance \
    --db-instance-identifier blood-donor-db \
    --db-instance-class db.t3.micro \
    --engine mysql \
    --master-username admin \
    --master-user-password <strong-password> \
    --allocated-storage 20
```

#### Step 2: Create EC2 Instance

1. Launch Ubuntu 22.04 LTS instance
2. Configure security group (allow ports 22, 80, 443, 3000)
3. SSH into instance

#### Step 3: Setup Server

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Install PM2
sudo npm install -g pm2

# Clone repository
git clone <your-repo-url>
cd blood-donor-finder

# Install dependencies
npm install

# Create .env.local file
nano .env.local
# Add your environment variables

# Build application
npm run build

# Start with PM2
pm2 start npm --name "blood-connect" -- start
pm2 save
pm2 startup
```

#### Step 4: Setup Nginx Reverse Proxy

```bash
# Install Nginx
sudo apt install nginx -y

# Create Nginx configuration
sudo nano /etc/nginx/sites-available/blood-connect

# Add configuration:
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}

# Enable site
sudo ln -s /etc/nginx/sites-available/blood-connect /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

#### Step 5: Setup SSL with Let's Encrypt

```bash
# Install Certbot
sudo apt install certbot python3-certbot-nginx -y

# Get SSL certificate
sudo certbot --nginx -d your-domain.com
```

---

### Option 5: VPS (Shared Hosting with cPanel)

If you have traditional shared hosting:

#### Step 1: Export as Static (Not Recommended for This App)

This app needs Node.js runtime, so shared hosting won't work unless they support Node.js apps.

#### Step 2: Use Node.js Hosting Providers

- Hostinger (Node.js support)
- A2 Hosting (Node.js support)
- Namecheap (Node.js support)

Follow their specific Node.js deployment guides.

---

## Environment Variables

### Complete List

```env
# Database
DB_HOST=localhost                    # Your database host
DB_PORT=3306                        # MySQL port (usually 3306)
DB_USER=root                        # Database username
DB_PASSWORD=your_password           # Database password
DB_NAME=blood_donor_db              # Database name

# Security
JWT_SECRET=your-32-char-random-string  # JWT signing key (REQUIRED)

# Optional
NODE_ENV=production                 # Environment (development/production)
NEXT_PUBLIC_APP_URL=https://your-domain.com  # Your app URL
```

### Security Best Practices

1. **Never commit `.env.local` to Git**
   - Already in `.gitignore`
   
2. **Use different secrets for different environments**
   - Different JWT_SECRET for dev/staging/production

3. **Rotate secrets regularly**
   - Change JWT_SECRET every 3-6 months

4. **Use environment variable managers**
   - Vercel Environment Variables
   - AWS Secrets Manager
   - HashiCorp Vault

---

## Post-Deployment

### 1. Test All Features

- [ ] User registration
- [ ] User login
- [ ] Create donor profile
- [ ] Update donor profile
- [ ] Search donors
- [ ] Create blood request
- [ ] Respond to request
- [ ] View dashboard
- [ ] Logout

### 2. Monitor Application

#### Using Vercel
- Check Analytics dashboard
- Setup error tracking

#### Using PM2 (VPS)
```bash
# View logs
pm2 logs blood-connect

# Monitor resources
pm2 monit

# Restart if needed
pm2 restart blood-connect
```

### 3. Setup Database Backups

#### MySQL Backup Script

```bash
#!/bin/bash
# backup-db.sh

DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/backups/mysql"
DB_NAME="blood_donor_db"
DB_USER="your_username"
DB_PASS="your_password"
DB_HOST="your_host"

mkdir -p $BACKUP_DIR

mysqldump -h $DB_HOST -u $DB_USER -p$DB_PASS $DB_NAME > $BACKUP_DIR/backup_$DATE.sql

# Keep only last 7 days
find $BACKUP_DIR -name "backup_*.sql" -mtime +7 -delete

echo "Backup completed: backup_$DATE.sql"
```

#### Automate Backups (Cron Job)

```bash
# Edit crontab
crontab -e

# Add daily backup at 2 AM
0 2 * * * /path/to/backup-db.sh
```

### 4. Setup Monitoring & Alerts

#### Free Options
- UptimeRobot (website uptime monitoring)
- Sentry (error tracking)
- LogRocket (session replay)

---

## Troubleshooting

### Common Issues

#### 1. Database Connection Fails

**Error:** `ECONNREFUSED` or `Access denied`

**Solution:**
```bash
# Check database is running
mysql -u root -p -e "SELECT 1"

# Verify credentials
mysql -h <host> -u <user> -p<password> -e "SHOW DATABASES;"

# Check if database exists
mysql -u root -p -e "SHOW DATABASES LIKE 'blood_donor_db';"

# Verify tables exist
mysql -u root -p blood_donor_db -e "SHOW TABLES;"
```

#### 2. Build Fails

**Error:** `Module not found` or `Type errors`

**Solution:**
```bash
# Clear cache
rm -rf .next node_modules
npm install
npm run build
```

#### 3. Environment Variables Not Working

**Solution:**
```bash
# In Vercel/Railway, redeploy after adding variables

# In local, restart dev server
npm run dev

# Check variables are loaded
node -e "console.log(process.env.JWT_SECRET)"
```

#### 4. JWT Token Issues

**Error:** `Invalid token` or `jwt malformed`

**Solution:**
- Ensure JWT_SECRET is set and at least 32 characters
- Clear browser localStorage
- Generate new secret if compromised

#### 5. Database Schema Errors

**Error:** `Table doesn't exist` or `Unknown column`

**Solution:**
```sql
-- Drop and recreate tables
DROP DATABASE IF EXISTS blood_donor_db;
CREATE DATABASE blood_donor_db;
-- Then run schema SQL again
```

---

## Security Checklist

Before going live:

- [ ] Strong JWT_SECRET (32+ characters)
- [ ] Database user has limited permissions (not root)
- [ ] SSL certificate installed (HTTPS)
- [ ] CORS configured properly
- [ ] Rate limiting implemented (if needed)
- [ ] Input validation on all forms
- [ ] SQL injection prevention (using parameterized queries ✓)
- [ ] XSS prevention (React escapes by default ✓)
- [ ] Password hashing with bcrypt ✓
- [ ] Environment variables not exposed to client
- [ ] Database backups automated
- [ ] Error messages don't leak sensitive info

---

## Scaling Considerations

### When to Scale

- Database queries slow (>1s)
- High user traffic (1000+ concurrent users)
- Server CPU/Memory >80% consistently

### Scaling Options

1. **Database**
   - Add read replicas
   - Use connection pooling (already implemented ✓)
   - Add database indexes (already added ✓)

2. **Application**
   - Use Vercel Pro (auto-scales)
   - Add load balancer (AWS ELB, Nginx)
   - Use CDN (Cloudflare, AWS CloudFront)

3. **Caching**
   - Add Redis for session storage
   - Cache donor searches
   - Use Next.js Image Optimization

---

## Support & Maintenance

### Regular Tasks

**Weekly:**
- Check error logs
- Monitor database size
- Review user feedback

**Monthly:**
- Update dependencies: `npm update`
- Review security alerts: `npm audit`
- Backup database manually
- Check SSL certificate expiry

**Quarterly:**
- Rotate JWT_SECRET
- Database optimization
- Performance audit

---

## Additional Resources

- [Next.js Deployment Docs](https://nextjs.org/docs/deployment)
- [Vercel Docs](https://vercel.com/docs)
- [MySQL 8 Documentation](https://dev.mysql.com/doc/)
- [Railway Docs](https://docs.railway.app/)
- [DigitalOcean Tutorials](https://www.digitalocean.com/community/tutorials)

---

## Quick Reference

### Deployment Commands

```bash
# Build
npm run build

# Start production
npm start

# View logs (PM2)
pm2 logs

# Restart app (PM2)
pm2 restart blood-connect

# Database backup
mysqldump -u user -p database > backup.sql

# Database restore
mysql -u user -p database < backup.sql
```

### Emergency Rollback

```bash
# Vercel
vercel rollback

# Railway
railway rollback

# PM2
pm2 restart blood-connect
git checkout previous-commit
npm install
npm run build
pm2 restart blood-connect
```

---

**Deployment Date:** ___________  
**Deployed By:** ___________  
**Platform:** ___________  
**Database Host:** ___________  

---

**Need Help?** Create an issue in the GitHub repository or contact the development team.
