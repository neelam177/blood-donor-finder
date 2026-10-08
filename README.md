# BloodConnect - Blood Donor Finder Platform

A modern web application connecting blood donors with people in need. Built with Next.js, TypeScript, MySQL, and Tailwind CSS.

---

## 📋 Table of Contents

- [Project Overview](#project-overview)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Key Features](#key-features)
- [Database Schema](#database-schema)
- [API Routes](#api-routes)
- [Frontend Pages](#frontend-pages)
- [Business Rules](#business-rules)
- [Development Guidelines](#development-guidelines)
- [Environment Setup](#environment-setup)
- [Deployment](#deployment)

---

## 🎯 Project Overview

**BloodConnect** is a platform that helps people find blood donors quickly and efficiently. Users can:
- **Register as donors** with their blood group and location
- **Post blood requests** when they need blood
- **Search for donors** by blood group and city
- **Respond to requests** and connect directly

### Design Philosophy
- **User-friendly**: Clear, simple UI with meaningful text (not technical jargon)
- **Safety-first**: 90-day donation gap enforced automatically
- **Privacy-focused**: Phone numbers hidden until login
- **Red theme**: Primary color `#D90F2B` (blood red)

---

## 🛠 Tech Stack

### Frontend
- **Next.js 15** (App Router)
- **TypeScript**
- **Tailwind CSS** (styling)
- **React Icons** (icons)

### Backend
- **Next.js API Routes** (serverless functions)
- **MySQL** (database via `mysql2`)
- **JWT** (authentication)
- **bcryptjs** (password hashing)

### Tools
- **TablePlus** (database management during development)
- **ESLint** (code linting)

---

## 📁 Project Structure

```
blood-donor-finder/
├── app/
│   ├── api/                    # Backend API routes
│   │   ├── auth/              # Authentication endpoints
│   │   │   ├── login/
│   │   │   ├── register/
│   │   │   └── me/
│   │   ├── donors/            # Donor management
│   │   │   ├── route.ts       # List/create donors
│   │   │   └── me/           # User's donor profile
│   │   └── requests/          # Blood request management
│   │       ├── route.ts       # List/create requests
│   │       ├── mine/         # User's requests
│   │       └── [id]/         # Single request operations
│   │           ├── respond/   # Respond to request
│   │           ├── responses/ # View responses
│   │           └── status/    # Update status
│   ├── dashboard/             # User dashboard pages
│   │   ├── page.tsx          # Main dashboard
│   │   └── profile/          # Donor profile form
│   ├── donors/                # Find donors page
│   ├── requests/              # Browse requests page
│   │   └── new/              # Create request form
│   ├── login/                 # Login page
│   ├── register/              # Registration page
│   ├── layout.tsx            # Root layout with navbar
│   └── page.tsx              # Home page
├── components/
│   ├── navbar.tsx            # Navigation bar
│   └── FirstVisitRedirect.tsx # First visit handler
├── lib/
│   ├── db.ts                 # MySQL connection
│   ├── session.ts            # Client-side auth helpers
│   ├── blood.ts              # Blood group compatibility
│   └── donor.ts              # Donor profile helpers
├── database/
│   ├── schema.sql            # Complete database schema
│   └── backup-restore.md     # Backup procedures
├── public/                    # Static assets (images, SVGs)
├── .env.local                # Environment variables
├── DEPLOYMENT.md             # Deployment guide
└── README.md                 # This file
```

---

## ✨ Key Features

### 1. **User Registration & Authentication**
- Users register with name, email, phone, password
- JWT tokens stored in localStorage (7-day expiry)
- Auto-login after registration
- Protected routes redirect to login

### 2. **Donor Profile Management**
- Separate donor profile (blood group, age, gender, city, state)
- Last donation date tracking
- Availability toggle (show/hide from search)
- 90-day eligibility calculation
- Delete donor profile option (visible on own cards)

### 3. **Blood Request System**
- Create requests with patient details, blood group, hospital, urgency
- Search/filter by blood group, city, urgency
- Respond to requests with optional message
- Track responses count
- Mark requests as fulfilled/closed

### 4. **Smart Donor Search**
- Filter by blood group and city
- Eligibility status displayed (can donate now / wait X days)
- Phone numbers visible only to logged-in users
- Pagination support

### 5. **Dashboard**
- View own blood requests
- View donor responses received
- See own donation responses
- Status tracking (open, fulfilled, closed)

### 6. **90-Day Donation Rule**
- Donors must wait 90 days between donations
- Eligibility shown on donor cards with countdown
- Respond button disabled for ineligible donors
- Visual indicators (green = ready, amber = waiting)

---

## 🗄 Database Schema

### Tables

#### 1. **users**
```sql
CREATE TABLE users (
  id INT PRIMARY KEY AUTO_INCREMENT,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  phone VARCHAR(20) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role ENUM('user', 'admin') DEFAULT 'user',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_email (email)
);
```

#### 2. **donor_profiles**
```sql
CREATE TABLE donor_profiles (
  user_id INT PRIMARY KEY,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  gender ENUM('male','female','other') NOT NULL,
  age TINYINT UNSIGNED NOT NULL,
  city VARCHAR(100) NOT NULL,
  state VARCHAR(100) NOT NULL,
  last_donation_date DATE DEFAULT NULL,
  is_available BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_search (blood_group, city, is_available),
  INDEX idx_city (city)
);
```

#### 3. **blood_requests**
```sql
CREATE TABLE blood_requests (
  id INT PRIMARY KEY AUTO_INCREMENT,
  requester_id INT NOT NULL,
  patient_name VARCHAR(100) NOT NULL,
  blood_group ENUM('A+','A-','B+','B-','AB+','AB-','O+','O-') NOT NULL,
  units_needed TINYINT UNSIGNED NOT NULL,
  hospital VARCHAR(200) NOT NULL,
  city VARCHAR(100) NOT NULL,
  contact_phone VARCHAR(20) NOT NULL,
  urgency ENUM('critical','urgent','normal') DEFAULT 'normal',
  note TEXT DEFAULT NULL,
  needed_by DATE NOT NULL,
  status ENUM('open','fulfilled','closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_search (blood_group, city, status, needed_by),
  INDEX idx_status (status),
  INDEX idx_requester (requester_id)
);
```

#### 4. **request_responses**
```sql
CREATE TABLE request_responses (
  id INT PRIMARY KEY AUTO_INCREMENT,
  request_id INT NOT NULL,
  donor_id INT NOT NULL,
  message VARCHAR(255) DEFAULT NULL,
  status ENUM('pending','accepted','rejected') DEFAULT 'pending',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (request_id) REFERENCES blood_requests(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE KEY unique_response (request_id, donor_id),
  INDEX idx_request (request_id),
  INDEX idx_donor (donor_id)
);
```

---

## 🔌 API Routes

### Authentication (`/api/auth/`)

#### POST `/api/auth/register`
Register new user
- **Body**: `{ name, email, phone, password }`
- **Returns**: `{ success, token, user }`
- **Auto-generates JWT token**

#### POST `/api/auth/login`
Login user
- **Body**: `{ email, password }`
- **Returns**: `{ success, token, user }`

#### GET `/api/auth/me`
Get current user details
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: `{ success, user }`

### Donors (`/api/donors/`)

#### GET `/api/donors`
List all available donors (with filters)
- **Query params**: `blood_group`, `city`, `page`, `limit`
- **Optional auth**: Shows phone numbers if logged in
- **Returns**: Paginated donor list with eligibility status

#### GET `/api/donors/me`
Get logged-in user's donor profile
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: `{ success, profile }`

#### POST `/api/donors/me`
Create donor profile
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ blood_group, gender, age, city, state, last_donation_date?, is_available }`
- **Returns**: `{ success, profile }`

#### PUT `/api/donors/me`
Update donor profile
- **Headers**: `Authorization: Bearer <token>`
- **Body**: Same as POST
- **Returns**: `{ success, profile }`

#### DELETE `/api/donors/me`
Delete donor profile
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: `{ success, message }`

### Blood Requests (`/api/requests/`)

#### GET `/api/requests`
List all open requests (with filters)
- **Query params**: `blood_group`, `city`, `urgency`, `page`, `limit`
- **Optional auth**: Shows if request is user's own
- **Returns**: Paginated request list with response counts

#### POST `/api/requests`
Create new blood request
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ patient_name, blood_group, units_needed, hospital, city, contact_phone, urgency, note?, needed_by }`
- **Returns**: `{ success, request }`

#### GET `/api/requests/mine`
Get logged-in user's requests
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: User's blood requests

#### GET `/api/requests/[id]`
Get single request details
- **Returns**: Request details

#### POST `/api/requests/[id]/respond`
Respond to a blood request
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ message? }`
- **Validations**:
  - Must have donor profile
  - Must be available
  - Must be eligible (90 days since last donation)
  - Blood group must be compatible
  - Cannot respond to own request
- **Returns**: `{ success, message, contact_phone }`

#### GET `/api/requests/[id]/responses`
View responses to a request (requester only)
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: List of responses with donor details

#### PUT `/api/requests/[id]/status`
Update request status (requester only)
- **Headers**: `Authorization: Bearer <token>`
- **Body**: `{ status: 'fulfilled' | 'closed' }`
- **Returns**: `{ success }`

### User Responses (`/api/responses/`)

#### GET `/api/responses/mine`
Get logged-in user's donation responses
- **Headers**: `Authorization: Bearer <token>`
- **Returns**: List of requests user responded to

---

## 🎨 Frontend Pages

### Public Pages

#### `/` - Home Page
- Hero section with call-to-action buttons
- "Find a donor" → `/donors`
- "Register as donor" → `/dashboard/profile`
- "Request blood" → `/requests/new`

#### `/login` - Login Page
- Email and password form
- Redirects logged-in users to home
- Supports "next" parameter for return-to URLs

#### `/register` - Registration Page
- Name, email, phone, password form
- Auto-login after successful registration
- Redirects to home page

### Protected Pages (Require Login)

#### `/dashboard` - User Dashboard
- Shows user's blood requests
- Shows donor responses received
- Shows own donation responses
- Status badges (pending, fulfilled, confirmed)

#### `/dashboard/profile` - Donor Profile
- Create/update donor profile form
- Blood group, gender, age, location
- Last donation date (optional)
- Availability toggle
- Live preview card
- Eligibility calculator
- Delete profile button
- Redirects to `/donors` after save (if changes made)

#### `/requests/new` - Create Blood Request
- Patient details form
- Hospital and location
- Urgency level (critical, urgent, normal)
- Needed by date
- Optional note

### Public with Enhanced Features When Logged In

#### `/donors` - Find Donors
- Search by blood group and city
- Donor cards with:
  - Blood group badge
  - Eligibility status (green = available, amber = not eligible yet)
  - "Can donate from [date]" if ineligible
  - Contact button (disabled if ineligible)
  - Delete button (only on own card)
- Pagination
- Login required to see phone numbers

#### `/requests` - Browse Blood Requests
- Filter by blood group, city, urgency
- Request cards with urgency color coding:
  - Red = Critical
  - Orange = Urgent
  - Green = Normal
- Action buttons:
  - Not logged in: "Login to respond"
  - No donor profile: "Create donor profile"
  - Not eligible: "Not eligible yet" + date
  - Eligible: "I can donate"
- Response modal with optional message
- Shows response count

---

## 📜 Business Rules

### 1. **90-Day Donation Rule**
- Donors must wait **90 days** between blood donations
- Eligibility is calculated from `last_donation_date`
- If eligible: Green badge "Available"
- If not eligible: Amber badge "Not eligible yet" + countdown

### 2. **Blood Group Compatibility**
See `lib/blood.ts` for compatibility matrix:
- O- can donate to anyone (universal donor)
- AB+ can receive from anyone (universal receiver)
- Exact matches always compatible
- Negative blood groups can donate to positive of same type

### 3. **Donor Profile Requirements**
To respond to blood requests, user must:
- Have a donor profile created
- Profile must be marked as "available"
- Must be eligible (90 days check)
- Blood group must be compatible with request

### 4. **Request Status Flow**
- **open**: Active, accepting responses
- **fulfilled**: Someone confirmed to donate
- **closed**: No longer needed

### 5. **Visibility Rules**
- Phone numbers hidden until login
- Own requests/responses clearly marked
- Cannot respond to own requests
- Cannot respond twice to same request

---

## 👨‍💻 Development Guidelines

### Code Style
- **TypeScript**: Strict mode enabled
- **Naming**: camelCase for variables, PascalCase for components
- **Components**: Functional components with hooks
- **Error handling**: Try-catch with user-friendly messages

### Key Conventions

#### Date Handling
- Store dates in MySQL as `DATE` type (YYYY-MM-DD)
- Use `DATE_FORMAT(field, '%Y-%m-%d')` in queries
- Frontend: `new Date(dateString + 'T00:00:00')` to avoid timezone issues

#### Authentication
- JWT stored in `localStorage` (key: `bc_token`)
- User object stored separately (key: `bc_user`)
- 7-day token expiry
- Functions in `lib/session.ts`:
  - `saveSession(token, user)`
  - `getToken()`
  - `getUser()`
  - `clearSession()`

#### API Response Format
```typescript
// Success
{ success: true, data: {...}, message?: string }

// Error
{ success: false, message: string }
```

#### Protected API Routes
```typescript
const authUser = getAuthUser(request);
if (!authUser) {
  return NextResponse.json({ success: false, message: "Login required" }, { status: 401 });
}
```

### Tailwind CSS Theme
- Primary red: `#D90F2B`, `#B80C24`, `#E5233C`
- Background: `bg-rose-50/60`
- Success: `bg-green-50`, `text-green-700`
- Warning: `bg-amber-50`, `text-amber-700`
- Rounded corners: `rounded-3xl`, `rounded-full`
- Shadows: `shadow-lg shadow-red-200`

### Icons
Using `react-icons/fa` (Font Awesome):
- Phone: `FaPhoneAlt`
- Location: `FaMapMarkerAlt`
- Calendar: `FaCalendarAlt`
- User: `FaUser`
- Lock: `FaLock`
- Check: `FaCheckCircle`
- Clock: `FaClock`

---

## ⚙️ Environment Setup

### 1. Prerequisites
- Node.js 18+
- MySQL 8.0+
- npm or yarn

### 2. Environment Variables
Create `.env.local`:
```env
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=blood_donor_finder
JWT_SECRET=your_secure_random_string_here
```

### 3. Database Setup
```bash
# Create database
mysql -u root -p
CREATE DATABASE blood_donor_finder;
USE blood_donor_finder;

# Run schema
source database/schema.sql;
```

### 4. Install Dependencies
```bash
npm install
```

### 5. Run Development Server
```bash
npm run dev
```

Visit `http://localhost:3000`

---

## 🚀 Deployment

See `DEPLOYMENT.md` for complete deployment guide covering:
- Vercel deployment
- Railway deployment
- Database migration options
- Environment variables setup
- Troubleshooting

### Quick Deploy to Vercel

1. **Push to GitHub**
```bash
git init
git add .
git commit -m "Initial commit"
git push origin main
```

2. **Connect to Vercel**
- Go to vercel.com
- Import repository
- Add environment variables
- Deploy

3. **Set up MySQL database** (use Railway, PlanetScale, or AWS RDS)

4. **Run migrations** on production database

---

## 🔄 Common Tasks for AI Assistants

### Adding a New Feature

When asked to add a feature, follow this pattern:

1. **Understand the requirement**
   - What page/section needs the feature?
   - Is it frontend only or needs backend?
   - Are there business rules to enforce?

2. **Database changes (if needed)**
   - Add columns or tables to `database/schema.sql`
   - Document the changes

3. **Backend API (if needed)**
   - Create route in `app/api/`
   - Add validation
   - Handle errors properly
   - Return consistent format

4. **Frontend implementation**
   - Update component/page
   - Add state management
   - Handle loading/error states
   - Match existing design system

5. **Test the flow**
   - Check diagnostics: `get_diagnostics`
   - Verify TypeScript compilation
   - Test edge cases

### Modifying Existing Features

1. **Read related files first**
   - Don't guess - read the actual implementation
   - Check both frontend and backend

2. **Maintain consistency**
   - Keep the same code style
   - Use existing utilities (lib/ folder)
   - Follow naming conventions

3. **Preserve existing behavior**
   - Don't break other features
   - Test related functionality

### Working with this codebase

**DO:**
- ✅ Use `lib/session.ts` for auth helpers
- ✅ Use `lib/blood.ts` for blood group logic
- ✅ Use `lib/donor.ts` for donor profile helpers
- ✅ Return user-friendly error messages
- ✅ Add loading states for async operations
- ✅ Use TypeScript types properly

**DON'T:**
- ❌ Hardcode dates (use Date functions)
- ❌ Expose sensitive data in API responses
- ❌ Create duplicate utility functions
- ❌ Skip error handling
- ❌ Return technical errors to users

---

## 📝 Important Notes

### Security
- Passwords are hashed with bcryptjs (10 rounds)
- JWT tokens expire in 7 days
- Phone numbers hidden until login
- SQL injection prevented by parameterized queries

### Performance
- Database indexes on search fields
- Pagination for large lists (default 8-10 items)
- Lazy loading for images

### User Experience
- Clear, non-technical language
- Visual feedback for all actions
- Loading states for async operations
- Error messages are helpful and actionable
- Active page highlighted in navbar
- Form validation with helpful errors

---

## 🐛 Troubleshooting

### "Access denied for user" error
- Check `.env.local` exists (not `env.local`)
- Verify database credentials
- Restart dev server after env changes

### "Cannot find module" errors
- Run `npm install`
- Check import paths (use `@/` alias)

### 401 Unauthorized errors
- Token may be expired
- Log out and log back in
- Check `getAuthUser()` is called in API route

### Dates showing wrong
- Use `DATE_FORMAT` in MySQL queries
- Always append `T00:00:00` when creating Date objects from YYYY-MM-DD strings

---

## 📞 Support

For questions or issues:
1. Check this README first
2. Review `DEPLOYMENT.md` for deployment issues
3. Check database schema in `database/schema.sql`
4. Review similar existing code for patterns

---

## 📄 License

Private project. All rights reserved.

---

**Built with ❤️ to save lives through blood donation**
