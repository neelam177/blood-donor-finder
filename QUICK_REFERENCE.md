# BloodConnect - Quick Reference Cheat Sheet

## 🚀 Getting Started (30 seconds)

```bash
# 1. Clone & install
git clone <repo>
cd blood-donor-finder
npm install

# 2. Setup environment
cp .env.example .env.local
# Edit .env.local with your DB credentials

# 3. Setup database
mysql -u root -p
CREATE DATABASE blood_donor_finder;
USE blood_donor_finder;
source database/schema.sql;

# 4. Run
npm run dev
# Visit http://localhost:3000
```

---

## 📂 File Structure (1 minute)

```
app/
├── api/              Backend APIs
│   ├── auth/        Login, register, me
│   ├── donors/      Donor CRUD + search
│   └── requests/    Request CRUD + respond
├── dashboard/       User dashboard + profile
├── donors/          Find donors (public)
├── requests/        Browse requests + create
├── login/           Login page
├── register/        Register page
└── page.tsx         Home

lib/
├── db.ts           MySQL connection
├── session.ts      Auth helpers
├── blood.ts        Blood compatibility
└── donor.ts        Donor helpers

components/
└── navbar.tsx      Navigation bar
```

---

## 🔑 Key Functions

### Auth (`lib/session.ts`)
```typescript
saveSession(token, user)  // Save after login
getToken()                // Get JWT token
getUser()                 // Get user object
clearSession()            // Logout
```

### API Auth (`app/api/auth/auth.ts`)
```typescript
getAuthUser(request)      // Get user from JWT
signToken(user)           // Create JWT token
```

### Blood (`lib/blood.ts`)
```typescript
canDonateTo(donorBloodGroup, patientBloodGroup)  // true/false
```

### Donor (`lib/donor.ts`)
```typescript
getDonorProfile(userId)   // Get profile or null
```

---

## 🗄 Database Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | id, email, name, phone, password_hash |
| `donor_profiles` | Donor info | user_id, blood_group, city, last_donation_date, is_available |
| `blood_requests` | Blood requests | id, requester_id, blood_group, city, status, needed_by |
| `request_responses` | Donor responses | request_id, donor_id, message, status |

---

## 🔌 API Routes Quick Ref

### Auth
| Method | Endpoint | Purpose |
|--------|----------|---------|
| POST | `/api/auth/register` | Register user |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Get current user |

### Donors
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/donors` | List donors (paginated) |
| GET | `/api/donors/me` | Get own profile |
| POST | `/api/donors/me` | Create profile |
| PUT | `/api/donors/me` | Update profile |
| DELETE | `/api/donors/me` | Delete profile |

### Requests
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/requests` | List requests |
| POST | `/api/requests` | Create request |
| GET | `/api/requests/mine` | Own requests |
| GET | `/api/requests/[id]` | Single request |
| POST | `/api/requests/[id]/respond` | Respond to request |
| GET | `/api/requests/[id]/responses` | View responses |
| PUT | `/api/requests/[id]/status` | Update status |

### Responses
| Method | Endpoint | Purpose |
|--------|----------|---------|
| GET | `/api/responses/mine` | Own responses |

---

## 🎨 Design Tokens

### Colors
```typescript
// Primary
#D90F2B  // Main red
#B80C24  // Dark red
#E5233C  // Light red

// Status
green-50, green-700  // Success/Available
amber-50, amber-700  // Warning/Wait
red-50, red-800      // Error
```

### Common Classes
```css
/* Containers */
.max-w-6xl.mx-auto.px-4

/* Cards */
.rounded-3xl.bg-white.shadow-lg.p-6

/* Buttons - Primary */
.rounded-full.bg-[#D90F2B].px-6.py-3.text-white

/* Buttons - Secondary */
.rounded-full.border-2.border-[#D90F2B].px-6.py-3.text-[#D90F2B]

/* Badges */
.rounded-full.bg-green-50.px-3.py-1.text-xs.text-green-700

/* Inputs */
.rounded-xl.border.border-slate-200.px-4.py-3
```

---

## 📋 Common Code Snippets

### Protected Page
```typescript
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { getToken, getUser } from "@/lib/session";

export default function ProtectedPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    const token = getToken();
    if (!token) {
      router.replace("/login?next=/current-page");
      return;
    }
    setUser(getUser());
  }, [router]);

  if (!user) return <div>Loading...</div>;

  return <div>Protected content</div>;
}
```

### API POST Handler
```typescript
export async function POST(request: Request) {
  try {
    const authUser = getAuthUser(request);
    if (!authUser) {
      return NextResponse.json(
        { success: false, message: "Login required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    
    // Validation
    if (!body.field) {
      return NextResponse.json(
        { success: false, message: "Field required" },
        { status: 400 }
      );
    }

    // DB operation
    await db.query("INSERT INTO ...", [body.field]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { success: false, message: "Error occurred" },
      { status: 500 }
    );
  }
}
```

### Fetch with Auth
```typescript
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
if (!res.ok) throw new Error(json.message);
```

### 90-Day Eligibility Check
```typescript
function checkEligibility(lastDonationDate: string | null) {
  if (!lastDonationDate) {
    return { eligible: true, nextDate: null, daysLeft: 0 };
  }

  const lastDate = new Date(`${lastDonationDate}T00:00:00`);
  const nextDate = new Date(lastDate);
  nextDate.setDate(nextDate.getDate() + 90);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const daysLeft = Math.ceil(
    (nextDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return {
    eligible: daysLeft <= 0,
    nextDate: daysLeft > 0 ? nextDate.toLocaleDateString("en-IN") : null,
    daysLeft: Math.max(0, daysLeft),
  };
}
```

---

## 🐛 Quick Fixes

### Problem: Dates showing NaN
```typescript
// ❌ Wrong
new Date("2024-01-15")

// ✅ Correct  
new Date("2024-01-15T00:00:00")
```

### Problem: Can't see phone numbers
1. Are you logged in?
2. Check API sends phone when authenticated:
   ```typescript
   const token = getToken();
   fetch(url, { 
     headers: token ? { Authorization: `Bearer ${token}` } : {} 
   })
   ```

### Problem: 401 errors
```typescript
// Check token exists
const token = getToken();
if (!token) {
  router.push("/login");
  return;
}

// On 401 response
if (res.status === 401) {
  clearSession();
  router.push("/login");
  return;
}
```

### Problem: TypeScript errors
```bash
# Check what's wrong
npx tsc --noEmit

# Read error message carefully
# Fix type definitions or add type assertions
```

---

## 📊 Status & Enums

### Blood Groups
```typescript
type BloodGroup = "A+" | "A-" | "B+" | "B-" | "AB+" | "AB-" | "O+" | "O-";
```

### Request Urgency
```typescript
type Urgency = "critical" | "urgent" | "normal";
```

### Request Status
```typescript
type RequestStatus = "open" | "fulfilled" | "closed";
```

### Response Status
```typescript
type ResponseStatus = "pending" | "accepted" | "rejected";
```

### Gender
```typescript
type Gender = "male" | "female" | "other";
```

---

## 🎯 Testing Checklist

After any change:
- [ ] TypeScript compiles (`npx tsc --noEmit`)
- [ ] No console errors
- [ ] Loading states work
- [ ] Error messages show
- [ ] Works on mobile width
- [ ] Auth works (logged in/out)
- [ ] 90-day rule works correctly

---

## 📞 Quick Troubleshooting

| Symptom | Check |
|---------|-------|
| Can't connect to DB | `.env.local` exists? DB running? |
| 401 errors | Token expired? User logged in? |
| Dates wrong | Using `T00:00:00` suffix? |
| Button not working | Check disabled state? Loading state? |
| Import errors | Check path uses `@/` alias? |
| Module not found | Run `npm install`? |

---

## 💡 Pro Tips

1. **Always read files before modifying** - Don't guess
2. **Use existing patterns** - Check similar code
3. **Test with real dates** - Use dates <90 days ago for testing
4. **Check both logged in/out** - Different UX for each
5. **Mobile first** - Test responsive design
6. **User-friendly text** - No technical jargon
7. **Clear error messages** - Tell users what to do

---

## 🔗 Important Links

- README: Full documentation
- DEPLOYMENT.md: Deploy guide
- database/schema.sql: Database structure
- .kiro/PROJECT_CONTEXT.md: AI assistant guide

---

**Need help? Check README.md for detailed docs!**
