# BloodConnect - AI Assistant Context File

**For: Claude, GPT, or any AI assistant working on this project**

---

## 🎯 Quick Project Summary

**What is this?** A blood donor finder web app connecting donors with people who need blood.

**Tech Stack:** Next.js 15 (App Router) + TypeScript + MySQL + Tailwind CSS

**Design:** Red theme (#D90F2B), user-friendly language, mobile-responsive

---

## 🚨 Critical Rules - READ FIRST

### NEVER CHANGE:
1. ❌ **Database structure** - Don't modify `database/schema.sql` without explicit request
2. ❌ **Authentication system** - JWT in `lib/session.ts` works perfectly
3. ❌ **API route structure** - Routes are organized logically
4. ❌ **Blood compatibility logic** - `lib/blood.ts` is medically accurate

### ALWAYS DO:
1. ✅ **Read files before modifying** - Use `read_file` or `read_code` first
2. ✅ **Check diagnostics after changes** - Use `get_diagnostics`
3. ✅ **Match existing style** - Keep code consistent
4. ✅ **Use existing utilities** - Check `lib/` folder first
5. ✅ **Test the 90-day rule** - Blood donation eligibility is critical

---

## 📐 Architecture Overview

```
USER REQUEST
    ↓
NEXT.JS PAGE (app/*/page.tsx)
    ↓
FETCH API CALL
    ↓
API ROUTE (app/api/*/route.ts)
    ↓
DATABASE (MySQL via lib/db.ts)
    ↓
RESPONSE
```

### File Organization Logic

**Frontend Pages** (`app/`)
- `page.tsx` = Home
- `login/page.tsx` = Login
- `register/page.tsx` = Register
- `dashboard/page.tsx` = User dashboard
- `dashboard/profile/page.tsx` = Donor profile form
- `donors/page.tsx` = Find donors (public search)
- `requests/page.tsx` = Browse blood requests
- `requests/new/page.tsx` = Create request form

**Backend APIs** (`app/api/`)
- `auth/*` = Login, register, get user
- `donors/*` = List donors, manage profile
- `requests/*` = CRUD blood requests
- `requests/[id]/respond` = Donate response
- `requests/[id]/responses` = View responses
- `responses/mine` = User's donation history

**Utilities** (`lib/`)
- `db.ts` = MySQL connection pool
- `session.ts` = Auth helpers (client-side)
- `blood.ts` = Blood group compatibility
- `donor.ts` = Donor profile helpers

**Components** (`components/`)
- `navbar.tsx` = Navigation bar (shows on all pages)
- `FirstVisitRedirect.tsx` = First visit handler

---

## 🔑 Key Concepts

### 1. The 90-Day Rule (MOST IMPORTANT!)

**Medical fact:** People must wait 90 days between blood donations.

**Implementation:**
- Stored in `donor_profiles.last_donation_date` (MySQL DATE)
- Calculated everywhere a donor is shown
- Function: `checkEligibility(lastDonationDate)`

**Returns:**
```typescript
{
  eligible: boolean,          // Can donate now?
  nextDate: string | null,    // "15 Mar 2025"
  daysLeft: number            // 67
}
```

**Where it's used:**
- `/donors` page - Shows on donor cards
- `/requests` page - Disables respond button
- `/api/requests/[id]/respond` - Backend validation

**Visual indicators:**
- 🟢 Green badge = "Available" (eligible)
- 🟡 Amber badge = "Not eligible yet" (shows countdown)

### 2. Authentication Flow

**Registration:**
1. User fills form → `/api/auth/register`
2. Password hashed with bcryptjs
3. JWT token generated (7 days)
4. Auto-login (saves token + user to localStorage)
5. Redirect to home

**Login:**
1. User enters email/password → `/api/auth/login`
2. Password verified
3. JWT token returned
4. Token + user saved to localStorage
5. Redirect to "next" param or home

**Protected Routes:**
```typescript
// Frontend (page.tsx)
useEffect(() => {
  const token = getToken();
  if (!token) router.replace("/login?next=/current-page");
}, []);

// Backend (API route)
const authUser = getAuthUser(request);
if (!authUser) {
  return NextResponse.json(
    { success: false, message: "Login required" }, 
    { status: 401 }
  );
}
```

### 3. Donor Profile vs User Account

**IMPORTANT DISTINCTION:**

**User Account** (`users` table)
- Created at registration
- Has: name, email, phone, password
- Required to login

**Donor Profile** (`donor_profiles` table)
- Created separately (optional)
- Has: blood group, age, city, availability
- Required to:
  - Appear in donor search
  - Respond to blood requests

**Flow:**
1. User registers → Has account ✅, No donor profile ❌
2. User creates donor profile → Has both ✅✅
3. User can delete donor profile → Has account ✅, No donor profile ❌

### 4. Blood Group Compatibility

See `lib/blood.ts` - function `canDonateTo(donor, patient)`:

**Universal donor:** O- (can give to anyone)
**Universal receiver:** AB+ (can receive from anyone)

**Rules:**
- Negative → Negative or Positive of same type
- Positive → Only Positive of same type
- O can donate to everyone
- AB can receive from everyone

**Example:**
- A+ can donate to: A+, AB+
- A- can donate to: A+, A-, AB+, AB-
- O- can donate to: Everyone

### 5. Request Status Flow

```
open → fulfilled/closed
```

- **open**: Active, accepting donor responses
- **fulfilled**: Someone confirmed to donate (requester marked it)
- **closed**: No longer needed

**Status change:** Only requester can change via `/api/requests/[id]/status`

---

## 🎨 UI/UX Standards

### Design System

**Colors:**
- Primary: `#D90F2B` (blood red)
- Dark: `#B80C24`
- Light: `#E5233C`, `#EE3A50`
- Background: `bg-rose-50/60`
- Success: Green (`bg-green-50`, `text-green-700`)
- Warning: Amber (`bg-amber-50`, `text-amber-700`)
- Error: Red (`bg-red-50`, `text-red-800`)

**Typography:**
- Headings: `text-3xl font-extrabold`
- Body: `text-sm` or `text-base`
- Labels: `text-xs font-semibold text-slate-500`

**Spacing:**
- Containers: `max-w-6xl mx-auto px-4`
- Cards: `rounded-3xl`, `p-5` or `p-6`
- Buttons: `rounded-full`, `px-5 py-2.5`

**Components:**
- Buttons: Rounded full with gradients
- Cards: Rounded 3xl with shadows
- Badges: Small, rounded full
- Forms: Rounded xl inputs

### User-Friendly Text

**Bad ❌:**
- "Post a request"
- "Become a donor"
- "HTTP 405 Error"
- "Authentication failed"

**Good ✅:**
- "Request blood"
- "Register as donor"
- "Could not load donors"
- "Login required"

**Why?** Users aren't technical. Use clear, meaningful language.

### Loading States

Always show loading feedback:
```typescript
const [loading, setLoading] = useState(true);

{loading ? (
  <div>Loading...</div>
) : (
  <div>Content</div>
)}
```

### Error Messages

Show user-friendly errors:
```typescript
{error && (
  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
    {error}
  </div>
)}
```

---

## 🔧 Common Tasks & How-To

### Task 1: Add a new field to donor profile

**Steps:**
1. Update database:
   ```sql
   ALTER TABLE donor_profiles ADD COLUMN new_field VARCHAR(100);
   ```

2. Update TypeScript interfaces:
   - `app/dashboard/profile/page.tsx` - ProfileForm, ProfileData
   - `lib/donor.ts` - DonorProfile type

3. Update API:
   - `app/api/donors/me/route.ts` - POST/PUT handlers

4. Update form:
   - `app/dashboard/profile/page.tsx` - Add input field

5. Test the flow

### Task 2: Add a new filter to donor search

**Steps:**
1. Update API query:
   - `app/api/donors/route.ts` - Add WHERE clause

2. Update frontend:
   - `app/donors/page.tsx` - Add filter UI
   - Add to `buildQuery()` function
   - Add state variable

### Task 3: Change a text/label

**Steps:**
1. Search for the text:
   ```
   grep_search: "old text here"
   ```

2. Replace in relevant files

3. Check if text is reused (navbar, buttons, etc.)

### Task 4: Fix a TypeScript error

**Steps:**
1. Read the error carefully
2. Check the type definition
3. Fix the type or cast if needed
4. Run diagnostics to verify

### Task 5: Add a new page

**Steps:**
1. Create file: `app/new-page/page.tsx`
2. Add to navbar: `components/navbar.tsx`
3. Add route protection if needed
4. Style consistently with existing pages

---

## 🐛 Common Issues & Solutions

### Issue: "Access denied for user"
**Cause:** `.env.local` file not found or incorrect
**Fix:** 
1. Rename `env.local` → `.env.local` (needs dot!)
2. Restart dev server

### Issue: Dates showing wrong/NaN
**Cause:** Date timezone issues
**Fix:** 
```typescript
// ❌ Wrong
new Date(dateString)

// ✅ Correct
new Date(`${dateString}T00:00:00`)
```

### Issue: 401 Unauthorized from API
**Cause:** Token expired or missing
**Fix:** 
1. Check token exists: `getToken()`
2. If expired, user must login again
3. Clear session: `clearSession()`

### Issue: Button not working
**Cause:** Usually state not updating
**Fix:** Check:
1. Is there a loading state blocking it?
2. Is there a disabled condition?
3. Are there console errors?

### Issue: Can't see phone numbers
**Cause:** Not logged in OR backend not sending them
**Fix:**
1. Login first
2. Check API returns phone when authenticated

---

## 📝 Code Patterns to Follow

### API Route Pattern
```typescript
export async function POST(request: Request) {
  try {
    // 1. Auth check
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 }
      );
    }

    // 2. Parse body
    const body = await request.json();

    // 3. Validate input
    if (!body.field) {
      return NextResponse.json(
        { success: false, message: "Field is required" },
        { status: 400 }
      );
    }

    // 4. Database operation
    const [result] = await db.query(
      "INSERT INTO table (field) VALUES (?)",
      [body.field]
    );

    // 5. Return success
    return NextResponse.json(
      { success: true, data: result },
      { status: 201 }
    );

  } catch (error) {
    console.error("Error:", error);
    return NextResponse.json(
      { success: false, message: "Something went wrong" },
      { status: 500 }
    );
  }
}
```

### Frontend Fetch Pattern
```typescript
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

async function handleSubmit() {
  setLoading(true);
  setError("");
  
  try {
    const token = getToken();
    const res = await fetch("/api/endpoint", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token && { Authorization: `Bearer ${token}` }),
      },
      body: JSON.stringify(data),
    });

    const json = await res.json();

    if (!res.ok || !json.success) {
      setError(json.message || "Something went wrong");
      return;
    }

    // Success handling
    router.push("/success-page");

  } catch (err) {
    setError("Cannot reach the server");
  } finally {
    setLoading(false);
  }
}
```

### Date Handling Pattern
```typescript
// MySQL query - use DATE_FORMAT
const [rows] = await db.query(
  `SELECT DATE_FORMAT(date_field, '%Y-%m-%d') AS date_field FROM table`
);

// Frontend - append T00:00:00
const date = new Date(`${dateString}T00:00:00`);

// Format for display
const formatted = date.toLocaleDateString("en-IN", {
  day: "numeric",
  month: "short",
  year: "numeric",
}); // "15 Mar 2025"
```

---

## 🎯 Testing Checklist

After any change, verify:

1. **TypeScript compiles**: Run diagnostics
2. **No console errors**: Check browser console
3. **Loading states work**: Test async operations
4. **Error messages show**: Test failure cases
5. **Responsive design**: Test on mobile width
6. **Auth flows work**: Test logged-out vs logged-in
7. **90-day rule works**: Test with different donation dates

---

## 💡 Tips for AI Assistants

### When user says "fix this error"
1. Ask for the full error message
2. Read the relevant file
3. Check types/imports
4. Make minimal changes

### When user says "add this feature"
1. Clarify requirements (which page? what behavior?)
2. Check if similar feature exists
3. Read related files first
4. Follow existing patterns

### When user says "change the design"
1. Find the specific component
2. Read current styling
3. Make consistent changes (don't introduce new colors)
4. Test responsive behavior

### When unsure
- ✅ Read the code first
- ✅ Ask clarifying questions
- ✅ Explain what you'll do
- ❌ Don't guess
- ❌ Don't rewrite working code

---

## 📚 File Reference Guide

### Most Important Files

**Must understand:**
- `lib/session.ts` - Auth helpers
- `lib/db.ts` - Database connection
- `app/api/auth/auth.ts` - Auth utilities
- `components/navbar.tsx` - Navigation

**Frequently modified:**
- `app/donors/page.tsx` - Donor search
- `app/requests/page.tsx` - Request browse
- `app/dashboard/profile/page.tsx` - Profile form
- `app/api/donors/route.ts` - Donor list API
- `app/api/requests/route.ts` - Request list API

**Reference only:**
- `database/schema.sql` - Database structure
- `lib/blood.ts` - Blood logic (don't change)
- `.env.local` - Environment vars

---

## 🚀 Quick Commands

```bash
# Start dev server
npm run dev

# Build production
npm run build

# Check types
npx tsc --noEmit

# Lint code
npm run lint
```

---

## ⚠️ Final Reminders

1. **90-day rule is critical** - Test eligibility calculation
2. **Read before modifying** - Don't assume structure
3. **Match existing patterns** - Keep consistency
4. **User-friendly text** - No technical jargon
5. **Test auth flows** - Logged in vs logged out
6. **Check diagnostics** - After every change
7. **Mobile responsive** - Test on small screens

---

**This project saves lives. Make every change count. 💉❤️**
