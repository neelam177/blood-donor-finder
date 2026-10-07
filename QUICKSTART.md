# BloodConnect - Quick Start Guide

Get your BloodConnect application running in 5 minutes!

---

## Prerequisites Checklist

- [ ] Node.js 20+ installed ([Download](https://nodejs.org/))
- [ ] MySQL 8+ installed and running
- [ ] Git installed
- [ ] Code editor (VS Code recommended)

---

## Step 1: Clone & Install (2 minutes)

```bash
# Clone repository
git clone <your-repo-url>
cd blood-donor-finder

# Install dependencies
npm install
```

---

## Step 2: Setup Database (2 minutes)

### Using TablePlus (Your Current Setup)

1. Open TablePlus
2. Connect to your MySQL server
3. Create new database:
   ```sql
   CREATE DATABASE blood_donor_db;
   ```
4. Select `blood_donor_db` database
5. Open `database/schema.sql` file in TablePlus
6. Execute the SQL (Cmd/Ctrl + Enter)

### Using MySQL Command Line

```bash
# Login to MySQL
mysql -u root -p

# Run schema
source database/schema.sql

# Verify
USE blood_donor_db;
SHOW TABLES;
```

You should see 4 tables:
- `users`
- `donor_profiles`
- `blood_requests`
- `request_responses`

---

## Step 3: Configure Environment (1 minute)

Create `.env.local` file in the project root:

```env
DB_HOST=127.0.0.1
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=blood_donor_db
JWT_SECRET=change-this-to-a-random-32-character-string-minimum
```

**Generate a secure JWT_SECRET:**

```bash
# On Mac/Linux
openssl rand -hex 32

# On Windows (PowerShell)
[Convert]::ToBase64String((1..32 | ForEach-Object { Get-Random -Maximum 256 }))

# Or use any random 32+ character string
```

---

## Step 4: Run the Application

```bash
# Development mode (with hot reload)
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser!

---

## Step 5: Test It Works

### Create Your First User

1. Go to http://localhost:3000
2. Click "Register" button
3. Fill in the form:
   - Name: Your Name
   - Email: test@example.com
   - Phone: 1234567890
   - Password: Test@1234
   - Confirm Password: Test@1234
4. Click "Create account"

You should be automatically logged in and redirected to the home page!

### Create Donor Profile

1. Click "Register as donor" button
2. Fill in your donor details:
   - Blood group: Select your blood group
   - Gender: Select gender
   - Age: 25
   - City: Your city
   - State: Your state
   - Last donation: (optional)
   - Available: Keep it ON
3. Click "Create profile"

You'll be redirected to the donors list!

---

## Common Issues & Solutions

### Issue: "Cannot connect to database"

**Solution 1: Check MySQL is running**
```bash
# Mac
brew services list | grep mysql

# Windows
# Open Services → Look for MySQL80

# Linux
sudo systemctl status mysql
```

**Solution 2: Verify credentials**
```bash
mysql -u root -p
# Enter your password
# If it works, your credentials are correct
```

**Solution 3: Check .env.local file**
- Make sure there are no spaces around `=`
- Make sure file is named exactly `.env.local` (with the dot)
- Make sure it's in the project root (same folder as package.json)

### Issue: "JWT_SECRET is required"

**Solution:**
- Make sure you added JWT_SECRET to `.env.local`
- Make sure it's at least 32 characters long
- Restart the dev server after adding it

### Issue: "Table doesn't exist"

**Solution:**
```bash
# Re-run database schema
mysql -u root -p blood_donor_db < database/schema.sql
```

### Issue: Port 3000 already in use

**Solution:**
```bash
# Kill the process using port 3000
# Mac/Linux
lsof -ti:3000 | xargs kill -9

# Windows
netstat -ano | findstr :3000
taskkill /PID <PID> /F

# Or use a different port
PORT=3001 npm run dev
```

---

## Next Steps

Now that you have it running locally:

1. **Explore Features**
   - Create blood requests
   - Search for donors
   - Respond to requests
   - View dashboard

2. **Add Test Data**
   - Register multiple users
   - Create donor profiles
   - Post blood requests
   - Test the search

3. **Deploy to Production**
   - See `DEPLOYMENT.md` for detailed guide
   - Recommended: Vercel + PlanetScale (easiest)

4. **Customize**
   - Change colors in `tailwind.config.js`
   - Update images in `/public` folder
   - Modify text content

---

## Project Structure

```
blood-donor-finder/
├── app/                    # Next.js app directory
│   ├── api/               # API routes
│   │   ├── auth/         # Authentication endpoints
│   │   ├── donors/       # Donor profile endpoints
│   │   ├── requests/     # Blood request endpoints
│   │   └── responses/    # Response endpoints
│   ├── dashboard/        # Dashboard pages
│   ├── donors/           # Donor search page
│   ├── login/            # Login page
│   ├── register/         # Registration page
│   └── requests/         # Requests page
├── components/            # Reusable components
├── lib/                   # Utility functions
│   ├── db.ts             # Database connection
│   ├── session.ts        # Session management
│   └── donor.ts          # Donor utilities
├── public/               # Static files
├── database/             # Database schema
│   └── schema.sql        # Database setup
├── .env.local            # Environment variables (create this)
├── package.json          # Dependencies
└── README.md            # This file
```

---

## Useful Commands

```bash
# Development
npm run dev              # Start dev server
npm run build            # Build for production
npm start                # Start production server
npm run lint             # Run linting

# Database
mysql -u root -p blood_donor_db < database/schema.sql  # Import schema
mysqldump -u root -p blood_donor_db > backup.sql       # Backup database

# Git
git status               # Check changes
git add .                # Stage all changes
git commit -m "message"  # Commit changes
git push                 # Push to remote
```

---

## Development Tips

### Hot Reload Not Working?

```bash
# Clear Next.js cache
rm -rf .next
npm run dev
```

### Database Changes?

After modifying schema:
```bash
# Backup current data
mysqldump -u root -p blood_donor_db > backup.sql

# Apply new schema
mysql -u root -p blood_donor_db < database/schema.sql

# Restore data (if needed)
mysql -u root -p blood_donor_db < backup.sql
```

### TypeScript Errors?

```bash
# Check types
npx tsc --noEmit

# Restart VS Code TypeScript server
# Cmd/Ctrl + Shift + P → "TypeScript: Restart TS Server"
```

---

## Getting Help

- Check `DEPLOYMENT.md` for deployment issues
- Check `database/schema.sql` for database structure
- Create an issue on GitHub
- Check Next.js docs: https://nextjs.org/docs

---

## Success Checklist

- [ ] Database created and tables exist
- [ ] `.env.local` configured with correct values
- [ ] App runs at http://localhost:3000
- [ ] Can register new user
- [ ] Can create donor profile
- [ ] Can search donors
- [ ] Can create blood request

**All checked?** Congratulations! 🎉 You're ready to deploy!

See `DEPLOYMENT.md` for production deployment guide.
