# Vercel Deployment Setup Guide

## Problem
Error: `JWT_SECRET is missing in .env.local` when logging in on Vercel.

## Cause
`.env.local` files are **not deployed** to Vercel. You must configure environment variables separately in the Vercel dashboard.

## Solution

### Step 1: Get Railway Public Connection Details

1. Go to [Railway Dashboard](https://railway.app/dashboard)
2. Select your MySQL database project
3. Click on your MySQL service
4. Look for **"Connect"** or **"Public Networking"** section
5. Copy these values:
   - **Public Host** (e.g., `roundhouse.proxy.rlwy.net`)
   - **Public Port** (e.g., `12345`)
   - **Username** (usually `root`)
   - **Password** (your database password)
   - **Database Name** (usually `railway`)

⚠️ **Important**: Do NOT use `127.0.0.1` or `localhost` - these only work locally!

### Step 2: Add Environment Variables to Vercel

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your **blood-donor-finder** project
3. Click **Settings** tab (top navigation)
4. Click **Environment Variables** (left sidebar)
5. Click **Add New** button

Add these variables one by one:

#### Database Variables
```
DB_HOST = <your-railway-public-host>
DB_PORT = <your-railway-public-port>
DB_USER = root
DB_PASSWORD = fveUpsDAOolDEsIMuGyvmnpsRfwHZrPS
DB_NAME = railway
```

#### JWT Variables
```
JWT_SECRET = 5d549ab02df3af55d28a257cc994ad36e6ad9007223919d70db724f56b80191a
JWT_EXPIRES_IN = 7d
```

### Step 3: Select Environment

For each variable, select which environments to apply to:
- ✅ Production
- ✅ Preview
- ✅ Development (optional)

### Step 4: Redeploy

1. Click **Save** after adding all variables
2. Go to **Deployments** tab
3. Find your latest deployment
4. Click the three dots (⋯) menu
5. Click **Redeploy**
6. Wait for deployment to complete

### Step 5: Verify

1. Visit your deployed site
2. Try logging in
3. The error should be gone! ✅

## Common Issues

### Still getting "Server configuration error"?
- Make sure ALL variables are added
- Check for typos in variable names (they're case-sensitive)
- Verify Railway public host is correct (not 127.0.0.1)
- Make sure you redeployed after adding variables

### Cannot connect to database?
- Verify Railway public networking is enabled
- Check if your Railway database is active
- Confirm host and port are the PUBLIC values, not local ones
- Ensure Railway firewall allows external connections

### Images not showing?
- Already fixed! The SVG files are now in `/public` folder
- They will be deployed automatically with your code

## Testing Locally vs Production

**Local** (`.env.local`):
```
DB_HOST=127.0.0.1  ← Works locally
DB_PORT=60100
```

**Vercel** (Environment Variables):
```
DB_HOST=xyz.railway.app  ← Use public host
DB_PORT=12345
```

## Security Notes

- Never commit `.env.local` to git (it's already in `.gitignore`)
- Keep your `JWT_SECRET` and database password secure
- Consider rotating credentials if they've been exposed
- Use different JWT secrets for development and production

## Need Help?

Check these resources:
- [Vercel Environment Variables Docs](https://vercel.com/docs/projects/environment-variables)
- [Railway Networking Docs](https://docs.railway.app/reference/public-networking)
- [Next.js Environment Variables](https://nextjs.org/docs/app/building-your-application/configuring/environment-variables)
