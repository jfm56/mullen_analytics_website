# Mullen Analytics — Client Portal

Secure client portal built on **Next.js 16 + FastAPI + PostgreSQL**.  
Handles client management, document delivery, invoice management, and Stripe payments.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 16 (App Router), TailwindCSS |
| Backend | FastAPI (Python 3.12), SQLAlchemy 2 |
| Database | PostgreSQL (local) |
| Auth | HTTP-only session cookies, bcrypt passwords |
| Payments | Stripe Checkout (hosted) — no card data stored locally |
| File storage | Local encrypted folder (`D:\MullenAnalytics\ClientData`) |

---

## Prerequisites

- Python 3.12
- Node.js 20+
- PostgreSQL running locally
- (Optional) Stripe account for live payments

---

## 1. Database Setup

```sql
-- Run in psql or pgAdmin
CREATE DATABASE mullen_analytics;
CREATE DATABASE mullen_analytics_test;  -- for tests only
```

---

## 2. Backend Setup

```powershell
cd backend

# Create virtual environment (Python 3.12 required)
py -3.12 -m venv venv
venv\Scripts\pip install -r requirements.txt
```

### Configure `backend/.env`

```env
DATABASE_URL=postgresql://postgres:YOUR_PASSWORD@localhost:5432/mullen_analytics
SECRET_KEY=CHANGE_THIS_TO_A_LONG_RANDOM_SECRET
SESSION_COOKIE_SECURE=false
DEBUG=true

# Stripe (leave blank to disable payments, fill in for live/test mode)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
STRIPE_PUBLISHABLE_KEY=pk_test_...
```

> **Security:** Never commit `.env` to git. It is already in `.gitignore`.

### Create the seed admin account

```powershell
venv\Scripts\python create_admin.py
# Creates: admin@mullenanalytics.com / ChangeMe123!
# Change this password immediately after first login.
```

### Start the backend

```powershell
venv\Scripts\uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

API docs available at: http://localhost:8000/docs

---

## 3. Frontend Setup

```powershell
# From project root
npm install
npm run dev
```

Frontend at: http://localhost:3000

### Configure `src/.env.local` (Next.js)

```env
FASTAPI_URL=http://localhost:8000
```

---

## 4. Roles & Access

| Role | Can Do |
|------|--------|
| **ADMIN** | Create/edit/delete clients, upload documents, create invoices, view all data |
| **CLIENT** | View own profile, download own documents, view own invoices, click pay buttons |

- Clients **cannot** access another client's data — enforced in every backend route.
- Role checks run **server-side** (backend). Frontend hiding is UI-only.

---

## 5. Key API Routes

### Auth
```
POST /api/auth/login          — Login (sets HTTP-only session cookie)
POST /api/auth/logout         — Logout
GET  /api/auth/session        — Get current session info
POST /api/auth/request-password-reset
POST /api/auth/reset-password
```

### Admin — Clients
```
GET    /api/users/            — List clients (admin)
POST   /api/users/create      — Create client (admin)
PATCH  /api/profiles/{id}     — Update client profile (admin)
```

### Documents
```
POST /api/documents/upload                    — Upload file for a client (admin, multipart)
GET  /api/documents/client/{client_id}        — List client's documents (admin)
GET  /api/documents/{id}/download             — Download file (admin: all, client: own only)
PATCH /api/documents/{id}                     — Update document metadata (admin)
DELETE /api/documents/{id}                    — Soft-delete document (admin)
GET  /api/documents/my/documents              — Client portal: own documents
```

### Invoices
```
POST   /api/invoices/                         — Create invoice (admin)
GET    /api/invoices/admin/client/{id}        — List client invoices (admin)
PATCH  /api/invoices/{id}                     — Update invoice (admin)
DELETE /api/invoices/{id}                     — Delete invoice (admin)
GET    /api/invoices/                         — Client portal: own invoices
GET    /api/invoices/{id}                     — Get single invoice (own or admin)
```

### Payments
```
POST /api/invoices/{id}/create-payment-link   — Create Stripe Checkout session (admin)
POST /api/invoices/{id}/set-payment-url       — Store manual payment URL (admin)
POST /api/payments/webhook/stripe             — Stripe webhook receiver
```

---

## 6. Payment Flow

1. Admin creates invoice (amount in cents, e.g. `500000` = $5,000.00)
2. Admin clicks **Generate Payment Link** → calls `POST /api/invoices/{id}/create-payment-link`
3. Backend creates a Stripe Checkout Session and stores **only** the hosted URL
4. Client sees **Pay Invoice** button in their portal → opens Stripe's hosted checkout page
5. Stripe sends `checkout.session.completed` webhook → backend marks invoice as `paid`

**What is stored locally:** `hosted_invoice_url`, `stripe_invoice_id`, invoice `status`  
**What is NEVER stored:** card numbers, CVV, bank routing/account numbers, raw payment credentials

---

## 7. File Upload Rules

- **Allowed types:** `.pdf`, `.doc`, `.docx`, `.xls`, `.xlsx`, `.csv`, `.txt`, `.png`, `.jpg`, `.jpeg`, `.zip`
- **Max size:** 50 MB per file
- **Storage:** `D:\MullenAnalytics\ClientData\clients\{client_id}\documents\`
- Files are stored **outside** the Next.js public folder and served only via authenticated download endpoint

---

## 8. Audit Logging

Every sensitive action is written to the `audit_logs` table:

| Action | Triggered by |
|--------|-------------|
| `document_upload` | Admin uploads a file |
| `document_download` | Any user downloads a file |
| `payment_link_created` | Admin generates Stripe link |
| `invoice_paid` | Stripe webhook confirms payment |

---

## 9. Running Tests

```powershell
cd backend

# Ensure test DB exists: CREATE DATABASE mullen_analytics_test;
venv\Scripts\pytest tests/test_portal.py -v
```

Tests cover:
1. Admin can create a client user
2. Client cannot access another client's documents (403/404)
3. Client cannot access another client's invoices (403/404)
4. Admin can upload documents (multipart)
5. Client can download only their own documents
6. Invoice creation works
7. Payment URL is stored but no banking/card data is in the model

---

## 10. Changing the Seed Admin Password

```powershell
# Option A: use the password reset flow
# 1. Go to /portal/login → "Forgot password"
# 2. Check backend console for the reset URL (SMTP not required in dev)

# Option B: directly in psql
UPDATE users SET password_hash = '<bcrypt_hash>' WHERE email = 'admin@mullenanalytics.com';
# Generate hash: python -c "from app.services.auth import hash_password; print(hash_password('NewPass123!'))"
```

---

## 11. Stripe Webhook Setup (Local Testing)

```powershell
# Install Stripe CLI: https://stripe.com/docs/stripe-cli
stripe login
stripe listen --forward-to localhost:8000/api/payments/webhook/stripe
# Copy the webhook secret printed and set it as STRIPE_WEBHOOK_SECRET in .env
```

---

## Security Notes

- Passwords hashed with **bcrypt** (passlib)
- Sessions use **cryptographically random tokens** stored as SHA-256 hashes
- All cookies are **HTTP-only** and **SameSite=Lax**
- RBAC enforced on **every** backend route — never rely on frontend-only hiding
- CORS restricted to `localhost:3000` in dev and `mullenanalytics.com` in production
- File downloads require authentication — files are never publicly accessible
