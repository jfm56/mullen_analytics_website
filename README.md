# Mullen Analytics — Client Portal

Secure client portal built on **Next.js 16 + FastAPI + PostgreSQL**.  
Includes the public marketing site, a secure client portal, the EMS analytics product, an admin console, and first-party (consent-gated, self-hosted) website visitor analytics.

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
# Prompts for a unique local administrator password.
# Never use a documented/default credential in any environment.
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

## 12. Website Visitor Analytics & On-Prem Data (first-party)

First-party, **consent-gated** website analytics — a self-hosted alternative to Google Analytics whose data lives in **your own** Postgres, not a third party's. Tracks page views, tab/link clicks, and time-on-page; the admin dashboard shows trends, top pages, most-clicked tabs, referrers, devices, and regions.

**How it works**
- `src/components/VisitorTracker.jsx` (mounted in `layout.jsx`) sends anonymous beacons **only after the visitor accepts cookies** (`mullen-analytics-cookie-consent`). No personal data; the visitor IP is used only to rate-limit ingest and is **never stored**.
- Tracked clicks: add `data-track="label"` to any element (nav tabs + CTAs already have it).
- Public ingest: `POST /api/analytics/collect` (`backend/app/routers/analytics_ingest.py`) → `web_sessions` + `web_events` (`models/web_analytics.py`).
- Admin dashboard: **Admin → Analytics** (`src/app/admin/analytics/page.jsx`) → `GET /api/admin/analytics/overview` (`routers/analytics_admin.py`, admin-gated) + `services/analytics_service.py`.

**Keeping the data on your own hardware (on-prem)**
The platform runs on Vercel (frontend) + Railway (backend). To keep analytics/leads data on your own box:
1. Run a **second FastAPI instance of this same repo** on your on-prem machine with `ENVIRONMENT=local`, `DATABASE_URL` → your local Postgres, and `SCHEDULER_ENABLED=true` (single replica only).
2. Expose it with a **Cloudflare Tunnel** (`cloudflared`) → a stable hostname (e.g. `onprem.mullenanalytics.com`).
3. Set `ONPREM_FASTAPI_URL=https://onprem.mullenanalytics.com` in the frontend (Vercel) env. The tracker (`/api/proxy2/...`) and admin Analytics/Leads calls route there; everything else keeps using `/api/proxy` → Railway. If `ONPREM_FASTAPI_URL` is unset, `proxy2` falls back to `FASTAPI_URL`, so local dev and pre-on-prem prod behave identically.

**New backend env vars / feature flags** (`backend/app/config.py`)
```env
ANALYTICS_ENABLED=true          # visitor-analytics ingest + dashboard
LEADS_ENABLED=false             # nightly lead-discovery (Phase 3, in progress)
SCHEDULER_ENABLED=false         # APScheduler nightly jobs — ON-PREM single replica ONLY
LEAD_DISCOVERY_HOUR=2           # local hour (0-23) to run the nightly crawl
LEAD_SEARCH_PROVIDER=duckduckgo # duckduckgo (no key) | tavily | brave
LEAD_SEARCH_API_KEY=            # for tavily/brave
SAMGOV_API_KEY=                 # SAM.gov federal RFP feed (optional)
LEAD_LLM_PROVIDER=ollama        # ollama (local) | anthropic
OLLAMA_BASE_URL=http://localhost:11434
OLLAMA_MODEL=llama3.1:8b
```
Frontend env: `ONPREM_FASTAPI_URL=` (blank = same origin as `FASTAPI_URL`).

**Local dev ports:** backend `:8001`, frontend `:3010` (`.env.local` → `FASTAPI_URL=http://localhost:8001`).

**Privacy:** disclosed in `src/app/privacy/page.jsx` (§1–§3, §7) — first-party, self-hosted, consent-gated, IP not stored, ~12-month event retention.

> **Lead discovery (in progress):** a nightly crawler that finds companies looking for analytics/ML/data-engineering help and surfaces them under **Admin → Analytics → Leads**, with draft-for-review outreach (never auto-send; opt-out + CAN-SPAM). See the project plan.

---

## Security Notes

- Passwords hashed with **bcrypt** (passlib)
- Sessions use **cryptographically random tokens** stored as SHA-256 hashes
- All cookies are **HTTP-only** and **SameSite=Lax**
- RBAC enforced on **every** backend route — never rely on frontend-only hiding
- CORS restricted to `localhost:3000` in dev and `mullenanalytics.com` in production
- File downloads require authentication — files are never publicly accessible
