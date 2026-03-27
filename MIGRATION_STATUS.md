# Portal Migration Status
## Supabase → FastAPI + PostgreSQL

**Last Updated:** March 26, 2026

---

## ✅ COMPLETED

### Backend (FastAPI)
- [x] Project structure created (`backend/app/`)
- [x] Configuration with environment variables (`backend/app/config.py`)
- [x] Database connection setup (`backend/app/database.py`)
- [x] All PostgreSQL models:
  - [x] `User` - authentication
  - [x] `Profile` - user profiles
  - [x] `Session` - HTTP-only cookie sessions
  - [x] `PasswordResetToken` - password reset flow
  - [x] `Message` - client messages
  - [x] `Invoice` - billing
  - [x] `Upload` - client file uploads
  - [x] `Document` - admin documents
  - [x] `EnhancedTask` - task management
  - [x] `RevenuePipeline` - sales pipeline
- [x] Auth services (password hashing, session management)
- [x] All auth endpoints:
  - [x] `POST /api/auth/login` - login with HTTP-only cookie
  - [x] `POST /api/auth/logout` - logout and clear session
  - [x] `GET /api/auth/session` - get current session/user/profile
  - [x] `POST /api/auth/request-password-reset` - request reset email
  - [x] `POST /api/auth/reset-password` - reset password with token
- [x] API routers:
  - [x] Auth router
  - [x] Users router
  - [x] Profiles router
  - [x] Messages router
  - [x] Invoices router
  - [x] Uploads router
  - [x] Tasks router
- [x] Database migration SQL script (`backend/migrations/001_initial_schema.sql`)

### Frontend (Next.js)
- [x] API client library (`src/lib/api.js`)
- [x] Auth context provider (`src/lib/authContext.js`)
- [x] Auth hooks (`src/hooks/useAuth.js`)
- [x] Portal pages updated to use FastAPI:
  - [x] `/portal/login` - login page
  - [x] `/portal` - home page
  - [x] `/portal/uploads` - file uploads
  - [x] `/portal/messages` - messaging
  - [x] `/portal/invoices` - billing
  - [x] `/portal/reports` - dashboards
  - [x] `/portal/reset-password` - password reset

---

## 🔄 IN PROGRESS / PARTIALLY COMPLETE

### File Storage
- [ ] Storage abstraction layer for S3/GCS
- [ ] Presigned URL generation for uploads
- [ ] File download endpoints
- **Note:** Upload functionality shows "being migrated" message until storage endpoints are complete

### Admin Pages
- [ ] `/admin` - admin dashboard (still uses Supabase)
- [ ] `/admin/clients/[id]` - client detail page (still uses Supabase)
- [ ] Admin components need migration

---

## ❌ STILL DEPENDS ON SUPABASE

### Files Still Importing Supabase

```
src/app/admin/page.jsx
src/app/admin/clients/[id]/page.jsx
src/components/AdminInvoiceManager.jsx
src/components/AdminDocumentManager.jsx
src/components/AdminProjectStatus.jsx
src/components/EnhancedTaskManager.jsx
src/components/OnboardingAutomation.jsx
src/components/RevenuePipelineDashboard.jsx
src/components/RoleManager.jsx
src/components/AdminClientHeader.jsx
src/components/AdminDocumentUpload.jsx
src/components/AdminInvoiceUpload.jsx
src/components/ClientProjectStatus.jsx
src/components/ClientProjectStatusPreview.jsx
src/hooks/useLastLoginTracking.js (can be removed - handled by FastAPI)
src/hooks/useUnreadMessagesCount.js (can be removed - handled by FastAPI)
src/lib/supabaseClient.js (DELETE when migration complete)
src/lib/supabaseAdmin.js (DELETE when migration complete)
```

### API Routes Still Using Supabase
All files in `src/app/api/` still use Supabase and should be removed once FastAPI handles all requests.

---

## 🚀 FASTEST PATH TO FULL REMOVAL

### Phase 1: Get Portal Working (CURRENT)
1. ✅ Backend auth endpoints
2. ✅ Frontend portal pages
3. ⏳ Start FastAPI server
4. ⏳ Run database migration
5. ⏳ Create initial admin user
6. ⏳ Test login flow

### Phase 2: Storage Layer
1. Add S3 presigned URL generation to FastAPI
2. Update upload endpoints
3. Re-enable file uploads in portal

### Phase 3: Admin Pages
1. Update `/admin` page to use FastAPI
2. Update `/admin/clients/[id]` page
3. Update admin components one by one

### Phase 4: Cleanup
1. Delete `src/lib/supabaseClient.js`
2. Delete `src/lib/supabaseAdmin.js`
3. Delete all `src/app/api/` routes (replaced by FastAPI)
4. Remove `@supabase/supabase-js` from package.json
5. Remove Supabase env vars

---

## 🔧 SETUP INSTRUCTIONS

### 1. Install Backend Dependencies
```bash
cd backend
pip install -r requirements.txt
```

### 2. Set Up PostgreSQL Database
```bash
# Create database
createdb mullen_analytics

# Run migration
psql -U your_user -d mullen_analytics -f migrations/001_initial_schema.sql
```

### 3. Configure Environment
```bash
# Copy example env file
cp env.example .env

# Edit .env with your values
# IMPORTANT: Generate a secure SECRET_KEY:
# openssl rand -hex 32
```

### 4. Create Initial Admin User
```python
# Run in Python shell or create a script
from app.database import SessionLocal
from app.services.auth import create_user_with_profile

db = SessionLocal()
user = create_user_with_profile(
    db,
    email="admin@mullenanalytics.com",
    password="your-secure-password",
    full_name="Admin User",
    role="admin"
)
print(f"Created admin user: {user.id}")
db.close()
```

### 5. Start FastAPI Server
```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### 6. Update Frontend Environment
Add to `.env.local`:
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

### 7. Start Next.js
```bash
npm run dev
```

---

## 📊 ENVIRONMENT VARIABLES

### Required for FastAPI Backend
| Variable | Description |
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection string |
| `SECRET_KEY` | JWT/session secret (use `openssl rand -hex 32`) |
| `APP_URL` | Frontend URL (e.g., `https://mullenanalytics.com`) |
| `API_URL` | Backend URL (e.g., `https://api.mullenanalytics.com`) |

### Required for Next.js Frontend
| Variable | Description |
|----------|-------------|
| `NEXT_PUBLIC_API_URL` | FastAPI backend URL |

### Optional (for email)
| Variable | Description |
|----------|-------------|
| `SMTP_HOST` | SMTP server |
| `SMTP_PORT` | SMTP port |
| `SMTP_USER` | SMTP username |
| `SMTP_PASSWORD` | SMTP password |

---

## ⚠️ RISKS & MITIGATIONS

| Risk | Status | Mitigation |
|------|--------|------------|
| Auth session loss | ✅ Mitigated | New session system independent of Supabase |
| Data loss | ⚠️ Pending | Run migration script to copy data |
| Admin pages broken | ⚠️ Known | Admin pages still need migration |
| File uploads broken | ⚠️ Known | Storage endpoints pending |

---

## 📝 NOTES

- Portal login/logout now works without Supabase
- Session cookies are HTTP-only for security
- Password reset flow is complete
- Admin pages will need separate migration effort
- File storage abstraction ready for GCS migration later
