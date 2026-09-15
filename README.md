# Lendwise LMS

Lendwise is a full-stack Loan Management System for borrower applications and internal loan operations. It implements the complete lifecycle required by the assignment:

`APPLIED -> SANCTIONED -> DISBURSED -> CLOSED`

`REJECTED` is the alternate sanction outcome.

## Project Structure

```text
LMS/
├── frontend/                 # Next.js App Router borrower and operations UI
│   └── src/app/              # Page, styles, workflow components
├── backend/                  # Express REST API
│   └── src/
│       ├── controllers/      # HTTP request/response orchestration
│       ├── middleware/       # JWT, RBAC, and upload middleware
│       ├── models/           # User, loan, payment, and salary-slip schemas
│       ├── routes/           # Thin endpoint and middleware definitions
│       ├── services/         # Authentication, loan, and lifecycle business logic
│       ├── validators/       # BRE and loan-term validation rules
│       ├── config/            # Database and external provider configuration
│       ├── seed.ts           # Idempotent evaluator account seeding
│       └── server.ts         # Express and MongoDB bootstrap
|
│   
└── README.md
```

## Technology

- Frontend: Next.js App Router, React, TypeScript, Tailwind CSS
- Backend: Node.js, Express, TypeScript
- Database: MongoDB with Mongoose
- Authentication: JWT and bcrypt
- Uploads: Multer memory validation with Cloudinary raw document storage

## Prerequisites

- Node.js 20.19 or newer
- npm
- MongoDB local instance or MongoDB Atlas connection string

## Environment Setup

Copy the example file and fill in the real values locally:

```powershell
Copy-Item backend/.env.example backend/.env
```

`backend/.env`:

```env
PORT=4000
MONGODB_URI=mongodb://127.0.0.1:27017/lms
JWT_SECRET=use-a-long-random-secret
CLIENT_URL=http://localhost:3000
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret
```

Never commit `backend/.env`. Commit only `backend/.env.example`.

Optional frontend environment file, `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:4000/api
```

Cloudinary values come from the Cloudinary dashboard. Salary slips use Cloudinary `raw` uploads because the accepted documents include PDFs. MongoDB stores the Cloudinary secure URL, public ID, filename, MIME type, and byte size. If Cloudinary is temporarily unavailable or rejects an upload, the already-validated file is stored in MongoDB as a controlled fallback so the borrower application is not lost; the loan records which storage provider was used.

## Install and Run

From the repository root:

```powershell
npm install
npm install --prefix frontend
npm install --prefix backend
```

Seed one known account for every role:

```powershell
npm run seed
```

Start both applications together:

```powershell
npm run dev
```

Or start them separately:

```powershell
npm run dev --prefix backend
npm run dev --prefix frontend
```

Open the frontend at `http://localhost:3000`. The API health check is available at `http://localhost:4000/api/health`.

## Demo Credentials

Every seeded account uses password `Password@123`.

| Role         | Email                   | Module              |
| ------------ | ----------------------- | ------------------- |
| Admin        | `admin@lms.demo`        | All modules         |
| Sales        | `sales@lms.demo`        | Lead tracking       |
| Sanction     | `sanction@lms.demo`     | Applied loan review |
| Disbursement | `disbursement@lms.demo` | Fund release        |
| Collection   | `collection@lms.demo`   | Repayments          |
| Borrower     | `borrower@lms.demo`     | Borrower portal     |

## Borrower Flow

1. Login as `borrower@lms.demo` or create a new borrower account.
2. Enter full name, PAN, date of birth, monthly salary, and employment mode.
3. Run the server-side Business Rule Engine.
4. Upload a PDF, JPG, or PNG salary slip under 5 MB.
5. Select loan amount from INR 50,000 to INR 500,000.
6. Select tenure from 30 to 365 days.
7. Review the live calculation and submit the application.
8. The created loan starts at `APPLIED`.

### BRE Rules

All rules are enforced on the backend. The frontend may show immediate feedback, but cannot authorize an application by itself.

- Age must be between 23 and 50 inclusive.
- Monthly salary must be at least INR 25,000.
- PAN must match `/^[A-Z]{5}[0-9]{4}[A-Z]$/`.
- Employment mode cannot be `Unemployed`.

### Loan Math

The fixed interest rate is 12% per annum. Tenure is represented in days:

```text
Simple Interest = (Principal × Rate × TenureDays) / (365 × 100)
Total Repayment = Principal + Simple Interest
```

The server recalculates these values during application creation so a client cannot manipulate the repayment amount.

## Operations Flow and RBAC

Logout between roles when recording the demo video:

1. Sanction executive sees `APPLIED` loans and approves or rejects with a reason.
2. Disbursement executive sees `SANCTIONED` loans and marks funds as released.
3. Collection executive sees `DISBURSED` loans and records UTR, amount, and date.
4. When total payments equal total repayment, the server automatically changes the loan to `CLOSED`.

Sales sees registered borrowers who have not submitted a loan. Admin can view all modules and all lifecycle queues. Borrowers cannot access operations APIs. Frontend visibility is supported by backend middleware, but backend authorization is the security boundary.

## API Overview

| Method | Route                     | Access             | Purpose                                        |
| ------ | ------------------------- | ------------------ | ---------------------------------------------- |
| POST   | `/api/auth/signup`        | Public             | Create a Borrower account                      |
| POST   | `/api/auth/login`         | Public             | Return JWT and user claims                     |
| GET    | `/api/auth/me`            | Authenticated      | Read current JWT identity                      |
| POST   | `/api/loans/eligibility`  | Borrower           | Run BRE                                        |
| POST   | `/api/loans`              | Borrower           | Upload slip and create `APPLIED` loan          |
| GET    | `/api/loans/mine`         | Borrower           | List own applications                          |
| GET    | `/api/loans/leads`        | Sales/Admin        | List registered borrowers without applications |
| GET    | `/api/loans/dashboard`    | Executive/Admin    | Return role-filtered queues                    |
| PATCH  | `/api/loans/:id/sanction` | Sanction/Admin     | Approve or reject                              |
| PATCH  | `/api/loans/:id/disburse` | Disbursement/Admin | Mark `DISBURSED`                               |
| POST   | `/api/loans/:id/payments` | Collection/Admin   | Add payment and auto-close                     |

Unauthorized requests return `401`. Authenticated users without the required role return `403`. Invalid business data returns `400` or `422` depending on the validation stage.

## Validation and Security Decisions

- Passwords are hashed with bcrypt before persistence.
- JWT carries user id, email, name, and role for stateless authorization.
- Signup always creates a Borrower; privileged roles come from the controlled seed script.
- Every protected route runs JWT authentication and role authorization.
- File uploads are restricted to PDF/JPG/PNG and 5 MB.
- UTR numbers are checked across all loan payment arrays before insertion.
- Payment amounts must be positive and cannot exceed the outstanding balance.
- Currency comparisons are rounded to two decimal places to avoid floating-point closure errors.
- Salary slips are uploaded to Cloudinary and linked to the loan through secure metadata. A MongoDB binary fallback is used only when Cloudinary upload fails, and binary content is never returned in normal list responses.

## Verification Commands

```powershell
npm run build
npm run build --prefix backend
Set-Location frontend; npx tsc --noEmit
```

Manual smoke test:

1. Confirm frontend returns `200` at `http://localhost:3000`.
2. Confirm API returns `{ "ok": true }` at `/api/health`.
3. Run BRE fail and BRE pass cases.
4. Complete `APPLIED -> SANCTIONED -> DISBURSED -> CLOSED` using separate credentials.
5. Verify a Borrower request to operations is rejected with `403`.

## Video Submission Checklist

For the requested 3-5 minute recording, show:

- Borrower login.
- One BRE failure with the displayed reason.
- A valid BRE pass.
- Salary slip upload, loan sliders, calculation, and Apply.
- Sanction login and approval.
- Disbursement login and fund release.
- Collection login with UTR, amount, date, and final closure.
- One brief RBAC demonstration or the role-specific module visibility.

## Design Notes for Reviewers

The frontend is intentionally a single workflow surface for this assignment, while the backend owns all important rules and transitions. This keeps the demo simple without weakening the security boundary: hiding a button is only a usability decision, whereas every lifecycle route independently checks JWT identity, role, current status, and input constraints.
