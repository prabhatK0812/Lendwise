# Lendwise — Loan Management System

A full-stack **Loan Management System** where borrowers apply for personal loans and internal executives manage those loans through their complete lifecycle.

```
APPLIED  ──→  SANCTIONED  ──→  DISBURSED  ──→  CLOSED
                   │
                   └──→  REJECTED
```

Two main surfaces:

- **Borrower Portal** — Multi-step application form with eligibility check, salary slip upload with file preview, loan configuration with live calculations, single active loan restriction, and real-time status tracking via visual timeline.
- **Operations Dashboard** — Internal panel with four role-based modules (Sales, Sanction, Disbursement, Collection) guarded by RBAC, featuring an Underwriter Review Modal with live embedded PDF viewing.

---

## Tech Stack

| Layer          | Technology                                         |
| -------------- | -------------------------------------------------- |
| Frontend       | Next.js 16 (App Router), React 19, TypeScript      |
| Styling        | Tailwind CSS v4, Vanilla CSS modules               |
| Backend        | Node.js, Express 5, TypeScript                     |
| Database       | MongoDB with Mongoose ODM                          |
| Authentication | JWT (jsonwebtoken) + bcryptjs password hashing     |
| File Uploads   | Multer (memory storage) + Cloudinary (raw uploads) |
| Dev Tooling    | tsx (watch mode), concurrently, ESLint              |

---

## Project Structure

```
LMS/
├── frontend/                          # Next.js App Router UI
│   └── src/
│       ├── app/                       # Page entry, global and module CSS
│       │   ├── page.tsx               # Root route — auth gate + portal routing
│       │   ├── layout.tsx             # Root layout with metadata
│       │   ├── globals.css            # Design system and base styles
│       │   ├── operations.css         # Operations dashboard styles
│       │   ├── timeline.css           # Status timeline and My Loans styles
│       │   ├── modal.css              # Underwriting review modal styles
│       │   ├── review.css             # Review step styles
│       │   ├── document.css           # Document upload & preview card styles
│       │   ├── payment.css            # Collection payment form styles
│       │   └── toast.css              # Toast notification styles
│       ├── components/
│       │   ├── AppShell.tsx           # Shared authenticated header
│       │   ├── AuthScreen.tsx         # Login / signup screen
│       │   ├── Toast.tsx              # Animated toast notification components
│       │   ├── borrower/
│       │   │   ├── BorrowerPortal.tsx # Multi-step form + My Loans view
│       │   │   └── StatusTimeline.tsx # Visual loan lifecycle timeline
│       │   └── operations/
│       │       ├── OperationsDashboard.tsx # 4-module executive dashboard
│       │       └── LoanDetailModal.tsx     # Underwriter review modal with PDF viewer
│       ├── context/
│       │   └── ToastContext.tsx       # Global toast notification context
│       ├── lib/
│       │   └── api.ts                 # Fetch wrapper, session management
│       └── types.ts                   # Shared client-side type contracts
│
├── backend/                           # Express REST API
│   └── src/
│       ├── server.ts                  # Express + MongoDB bootstrap
│       ├── seed.ts                    # Idempotent demo account seeder
│       ├── config/
│       │   └── cloudinary.ts          # Cloudinary SDK configuration
│       ├── controllers/
│       │   ├── authController.ts      # Signup, login, identity endpoints
│       │   └── loanController.ts      # Loan lifecycle & document streaming
│       ├── middleware/
│       │   ├── index.ts               # JWT authentication + role authorization
│       │   └── upload.ts              # Multer file validation (type + size)
│       ├── models/
│       │   ├── User.ts                # User schema with role enum
│       │   ├── Loan.ts                # Loan schema with embedded payments
│       │   └── index.ts               # Barrel exports
│       ├── routes/
│       │   ├── authRoutes.ts          # /api/auth/* route definitions
│       │   └── loanRoutes.ts          # /api/loans/* route definitions + RBAC
│       ├── services/
│       │   ├── authService.ts         # Registration, login, JWT generation
│       │   └── loanService.ts         # Loan creation, transitions, payments
│       └── validators/
│           └── loanValidator.ts       # BRE rules + loan term validation
│
├── package.json                       # Root workspace scripts (dev, build, seed)
└── README.md
```

---

## Data Model Design

### `users` Collection

Stores all platform users — borrowers and internal executives.

| Field      | Type     | Constraints                                                        |
| ---------- | -------- | ------------------------------------------------------------------ |
| `name`     | String   | Required                                                           |
| `email`    | String   | Required, unique, lowercase                                        |
| `password` | String   | Required — stored as bcrypt hash (12 salt rounds)                  |
| `role`     | String   | Enum: `Admin`, `Sales`, `Sanction`, `Disbursement`, `Collection`, `Borrower` |
| `phone`    | String   | Optional                                                           |

- Signup always creates a **Borrower**. Privileged roles are created exclusively by the controlled seed script.
- Passwords are **never stored in plain text**; bcryptjs hashes them before persistence.

### `loans` Collection

Stores loan applications, repayment math, lifecycle state, salary slip metadata, and payment history.

| Field             | Type       | Description                                                   |
| ----------------- | ---------- | ------------------------------------------------------------- |
| `borrower`        | ObjectId   | Reference to `users._id` (populated in dashboard queries)     |
| `fullName`        | String     | Applicant name captured at application time                   |
| `pan`             | String     | PAN identity (validated by BRE regex)                         |
| `dateOfBirth`     | Date       | Used for age calculation in BRE                               |
| `monthlySalary`   | Number     | Validated ≥ ₹25,000 by BRE                                    |
| `employmentMode`  | String     | `Salaried` / `Self-Employed` / `Unemployed`                   |
| `salarySlip`      | Subdoc     | `{ storage, secureUrl, publicId, filename, mimeType, bytes, data? }` |
| `amount`          | Number     | Loan principal (₹50,000 – ₹5,00,000)                         |
| `tenureDays`      | Number     | Repayment tenure (30 – 365 days)                              |
| `interestRate`    | Number     | Fixed at 12% p.a.                                             |
| `simpleInterest`  | Number     | Server-calculated using SI formula                            |
| `totalRepayment`  | Number     | Principal + Simple Interest                                   |
| `status`          | String     | Enum: `APPLIED`, `SANCTIONED`, `REJECTED`, `DISBURSED`, `CLOSED` |
| `rejectionReason` | String     | Populated when status = REJECTED                              |
| `payments`        | `[Payment]`| Embedded array: `{ utr, amount, date }`                       |
| `disbursedAt`     | Date       | Timestamp when funds were released                            |

**Relationship**: `loans.borrower` → `users._id` (many-to-one). Payments are embedded within the loan document because they are always accessed together and do not need independent querying.

**Salary Slip Storage**: Cloudinary is the primary store (raw upload for PDF support). If Cloudinary is unavailable, the validated file is stored as a binary fallback in MongoDB. Binary content is excluded from list API responses via `.select("-salarySlip.data")`.

---

## REST API Design

All endpoints are prefixed with `/api`. JSON is the default content type except for loan creation which uses `multipart/form-data`.

### Authentication

| Method | Route          | Access        | Request Body                | Success Response        | Error Codes  |
| ------ | -------------- | ------------- | --------------------------- | ----------------------- | ------------ |
| POST   | `/auth/signup` | Public        | `{ name, email, password }` | `201` `{ token, user }` | `400`, `409` |
| POST   | `/auth/login`  | Public        | `{ email, password }`       | `200` `{ token, user }` | `401`        |
| GET    | `/auth/me`     | Authenticated | —                           | `200` `{ user }`        | `401`        |

### Borrower Endpoints

| Method | Route                | Access   | Request                                               | Success Response                  | Error Codes               |
| ------ | -------------------- | -------- | ----------------------------------------------------- | --------------------------------- | ------------------------- |
| POST   | `/loans/eligibility` | Borrower | `{ dateOfBirth, monthlySalary, pan, employmentMode }` | `200` `{ eligible, errors[] }`    | `401`, `403`              |
| POST   | `/loans`             | Borrower | `FormData` with fields + `salarySlip`                 | `201` `{ loan }`                  | `400`, `409`, `422`, `403`|
| GET    | `/loans/mine`        | Borrower | —                                                     | `200` `{ loans[] }`               | `401`, `403`              |

### Operations & Document Endpoints

| Method | Route                 | Access                       | Request Body                          | Success Response          | Error Codes                       |
| ------ | --------------------- | ---------------------------- | ------------------------------------- | ------------------------- | --------------------------------- |
| GET    | `/loans/leads`        | Sales, Admin                 | —                                     | `200` `{ leads[] }`       | `401`, `403`                      |
| GET    | `/loans/dashboard`    | All Executives               | —                                     | `200` `{ role, loans[] }` | `401`, `403`                      |
| PATCH  | `/loans/:id/sanction` | Sanction, Admin              | `{ approved: bool, reason?: string }` | `200` `{ loan }`          | `401`, `403`, `409`               |
| PATCH  | `/loans/:id/disburse` | Disbursement, Admin          | `{}`                                  | `200` `{ loan }`          | `401`, `403`, `409`               |
| POST   | `/loans/:id/payments` | Collection, Admin            | `{ utr, amount, date? }`              | `201` `{ loan }`          | `400`, `401`, `403`, `404`, `409` |
| GET    | `/loans/:id/document` | All Executives, Borrower     | Query param `?token=` or Auth header  | Streams PDF / image file  | `401`, `403`, `404`               |

**Error Code Convention**: `401` = unauthenticated, `403` = wrong role, `400` = bad input, `409` = conflict (active loan exists, duplicate UTR, invalid state transition), `422` = BRE validation failure.

---

## Authentication & RBAC Middleware

### Authentication (`authenticate`)

Every protected route passes through the `authenticate` middleware:

1. Extracts token from `Authorization: Bearer <token>` header or `?token=` query parameter (enables direct browser PDF streaming).
2. Verifies the JWT signature using `JWT_SECRET`.
3. Attaches decoded payload (`{ id, role, name, email }`) to `req.user`.
4. Returns `401` if token is missing, invalid, or expired.

### Authorization (`authorize`)

Enforces backend role protection per-route:

```typescript
authorize("Sanction", "Admin")
```

### Role → Module Mapping

| Role         | Accessible Module | Loans Visible      | Actions                                             |
| ------------ | ----------------- | ------------------ | --------------------------------------------------- |
| Borrower     | Borrower Portal   | Own loans only     | Apply, view status timeline, view own document      |
| Sales        | Sales             | Leads (no loans)   | View registered borrowers without active loans      |
| Sanction     | Sanction          | `APPLIED` loans    | Review in modal (view PDF, checklist), Approve, Reject with reason |
| Disbursement | Disbursement      | `SANCTIONED` loans | Review details in modal, mark as disbursed          |
| Collection   | Collection        | `DISBURSED` loans  | Compact payment form (UTR + amount), auto-close     |
| Admin        | All modules       | All loans          | All actions and full cross-module switching         |

---

## Loan Status Transitions

```
                    ┌──────────────────────────────────────────────────┐
                    │                                                  │
  Borrower applies  │   Sanction approves    Disbursement releases     │  Auto-close
 ─────────────────► │  ─────────────────►   ─────────────────────►    │ ──────────────►
     APPLIED        │     SANCTIONED             DISBURSED            │     CLOSED
                    │         │                                        │
                    │         │ Sanction rejects                       │
                    │         ▼                                        │
                    │      REJECTED                                    │
                    │                                                  │
                    └──────────────────────────────────────────────────┘
```

| From         | To           | Who Triggers         | Guard Condition                                    |
| ------------ | ------------ | -------------------- | -------------------------------------------------- |
| —            | `APPLIED`    | Borrower             | BRE passes, terms valid, slip uploaded, no other active loan |
| `APPLIED`    | `SANCTIONED` | Sanction / Admin     | `findOneAndUpdate({ status: "APPLIED" })`          |
| `APPLIED`    | `REJECTED`   | Sanction / Admin     | Requires rejection reason string                   |
| `SANCTIONED` | `DISBURSED`  | Disbursement / Admin | `findOneAndUpdate({ status: "SANCTIONED" })`       |
| `DISBURSED`  | `CLOSED`     | System (auto)        | When `sum(payments) ≥ totalRepayment` (2dp rounded)|

**Guard mechanism**: Transitions use `findOneAndUpdate` with expected current status in filter. If state changed concurrently, returns `null` and responds with `409 Conflict`.

---

## Business Rule Engine (BRE)

Enforced strictly on the server (`validators/loanValidator.ts`):

| Rule                 | Condition                            | Error Message                                     |
| -------------------- | ------------------------------------ | ------------------------------------------------- |
| Age                  | Must be 23–50 years                  | "Applicant age must be between 23 and 50 years"   |
| Salary               | ≥ ₹25,000 / month                   | "Monthly salary must be at least INR 25,000"      |
| PAN                  | Match `/^[A-Z]{5}[0-9]{4}[A-Z]$/`    | "PAN must follow the valid format"                |
| Employment           | Not `Unemployed`                     | "Unemployed applicants are not eligible"          |
| Single Active Loan   | No other loan in progress            | "You already have an active loan in progress"     |
| Loan Amount          | ₹50,000 to ₹5,00,000                 | "Loan amount must be between ₹50,000 and ₹5,00,000" |
| Tenure               | 30 to 365 days                       | "Tenure must be between 30 and 365 days"          |

BRE runs twice: once during preview (`POST /loans/eligibility`) and once during submission (`POST /loans`).

---

## Loan Math

Interest rate is fixed at **12% per annum**. Tenure is specified in days.

```
Simple Interest  = (Principal × 12 × TenureDays) / (365 × 100)
Total Repayment  = Principal + Simple Interest
```

- Live calculation updates dynamically in the borrower slider step.
- Server recalculates values on creation to prevent client-side tampering.
- Payment balances use `.toFixed(2)` rounding to prevent floating-point discrepancies.

---

## Borrower Flow

1. **Login** or **Sign Up** as a Borrower.
2. **Active Loan Check** — If the borrower already has a loan in `APPLIED`, `SANCTIONED`, or `DISBURSED`, a banner prevents duplicate submission until the existing loan is closed or rejected.
3. **Profile** — Enter name, PAN, date of birth, monthly salary, and employment mode.
4. **Eligibility** — Instant server BRE check with clear error badges if rules fail.
5. **Document Upload & Preview** — Upload salary slip (PDF, JPG, PNG ≤ 5 MB). View uploaded file preview card with filename, size, and remove/replace option.
6. **Loan Configuration** — Choose amount (₹50K–₹5L) and tenure (30–365 days) with live interest/repayment breakdown.
7. **Review & Submit** — Final summary verification before submission.
8. **My Loans & Status Timeline** — View loan cards with a 4-stage visual timeline (`APPLIED` → `SANCTIONED` → `DISBURSED` → `CLOSED`), rejection branches with underwriter reasons, and repayment progress bars.

---

## Operations Flow

Internal executives log in to access their assigned module:

1. **Sales Desk** — Monitors registered borrowers without submitted loans (lead tracking).
2. **Sanction Desk** — Reviews `APPLIED` loans with a dedicated **Review Details Modal (`LoanDetailModal`)**:
   - Live embedded PDF salary slip viewer (via `GET /api/loans/:id/document`).
   - Underwriter verification checklist (PAN format, Income threshold, CIBIL/Credit evaluation).
   - Automated BRE diagnostic summary report.
   - Quick Approve button or Reject with mandatory reason.
3. **Disbursement Desk** — Reviews `SANCTIONED` loans with modal view, and releases funds with one click.
4. **Collection Desk** — Tracks `DISBURSED` loans with a clean, single-row repayment bar (UTR, Amount, Date). Automatic closure (`CLOSED`) when paid in full.
5. **Admin Desk** — Full portfolio oversight with cross-module switching and status metrics.

---

## Prerequisites

- Node.js 20+ and npm
- MongoDB (local instance or Atlas connection string)
- Cloudinary account (for salary slip storage)

## Environment Setup

```bash
# Copy example environment file
cp backend/.env.example backend/.env
```

Configure `backend/.env`:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/lms
JWT_SECRET=replace-with-a-long-random-secret
CLIENT_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

---

## Install & Run

```bash
# Install all dependencies
npm install
npm install --prefix frontend
npm install --prefix backend

# Seed demo accounts (idempotent — safe to rerun)
npm run seed

# Start both frontend and backend together
npm run dev
```

Or start individually:

```bash
npm run dev --prefix backend     # API at http://localhost:4000
npm run dev --prefix frontend    # UI at http://localhost:3000
```

---

## Demo Credentials

All seeded accounts use password **`Password@123`**.

| Role         | Email                   | Access              |
| ------------ | ----------------------- | ------------------- |
| Admin        | `admin@lms.demo`        | All modules         |
| Sales        | `sales@lms.demo`        | Lead tracking       |
| Sanction     | `sanction@lms.demo`     | Applied loan review & underwriting modal |
| Disbursement | `disbursement@lms.demo` | Fund release        |
| Collection   | `collection@lms.demo`   | Repayments          |
| Borrower     | `borrower@lms.demo`     | Borrower portal     |

---

## Validation & Security Summary

| Concern                    | Implementation                                                                  |
| -------------------------- | ------------------------------------------------------------------------------- |
| Password storage           | bcrypt hash with 12 salt rounds                                                 |
| Token format               | JWT carrying `{ id, role, name, email }`, expires in 1 day                      |
| Account creation           | Signup always creates Borrower; privileged roles from seed only                 |
| Route protection           | Every protected route runs `authenticate` → `authorize(roles)`                  |
| Single Active Loan         | Prevents multiple concurrent loans per borrower (`APPLICATION_IN_PROGRESS`)     |
| Document Streaming         | Direct browser viewing via authenticated `/api/loans/:id/document`              |
| File upload limits         | PDF/JPG/PNG only, max 5 MB, enforced by Multer                                  |
| UTR uniqueness             | Checked across all loan payment arrays before insertion                         |
| Payment bounds             | Amount must be positive and ≤ outstanding balance                               |
| Floating-point handling    | `.toFixed(2)` rounding on both sides of comparison                              |
| Notifications              | Animated, non-blocking toast notifications replacing disruptive alerts          |

---

## Verification

### Build Commands

```bash
npm run build                          # Build both
npm run build --prefix backend         # Backend only
cd frontend && npx tsc --noEmit        # TypeScript check (frontend)
```

### Manual Smoke Test

1. Confirm frontend returns `200` at `http://localhost:3000`.
2. Confirm API health at `http://localhost:4000/api/health`.
3. Test a BRE failure case (e.g. age under 23) and verify clear error messages.
4. Test a BRE pass case, upload salary slip, configure terms, and submit.
5. Complete full lifecycle: `APPLIED → SANCTIONED → DISBURSED → CLOSED` across roles.
6. Verify underwriter review modal in Sanction desk displays embedded PDF and checklist.
7. Verify borrower's My Loans view displays the visual status timeline.

---

---

## Design Decisions

1. **Single-page workflow**: Single Next.js page with conditional views based on auth state and role. Keeps demo navigation quick while backend enforces all permissions.
2. **Underwriting Review Modal**: Sanction desk features an in-depth modal with live document streaming (`/api/loans/:id/document`), automated BRE reports, and a verification checklist.
3. **Single Active Loan Policy**: Enforces one active loan at a time per borrower to prevent over-leveraging and race conditions.
4. **Embedded payments**: Payment records are stored inside the parent Loan document for atomic updates and fast querying.
5. **Dual storage for salary slips**: Cloudinary raw uploads as primary storage with MongoDB binary fallback for maximum reliability.
6. **Toast notification system**: Global non-blocking toasts provide instant feedback without disruptive modal alerts.
7. **Visual status timeline**: Intuitive 4-node status timeline giving borrowers complete visibility of their loan progression.
