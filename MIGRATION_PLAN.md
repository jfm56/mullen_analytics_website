# Client Portal Migration Plan
## From Supabase to FastAPI + PostgreSQL + GCS-Ready Storage

---

## PART 1: SUPABASE USAGE AUDIT

### Summary
- **Total files with Supabase usage:** 65 files
- **Total Supabase references:** 451 matches
- **Key dependencies:** Authentication, Database queries, File storage (partial - already using S3)

---

### 1.1 Authentication Usage (supabase.auth.*)

| File | Usage | Replacement |
|------|-------|-------------|
| `src/lib/supabaseClient.js` | Creates Supabase client | Replace with custom auth context/hooks |
| `src/lib/supabaseAdmin.js` | Admin client with service role | Replace with FastAPI admin endpoints |
| `src/app/portal/login/page.jsx` | `signUp()`, `signInWithPassword()` | FastAPI `/api/auth/login`, `/api/auth/register` |
| `src/app/portal/page.jsx` | `getSession()`, `signOut()`, `getUser()`, `resetPasswordForEmail()` | FastAPI session endpoints |
| `src/app/portal/uploads/page.jsx` | `getSession()` for auth check | FastAPI session validation |
| `src/app/portal/messages/page.jsx` | `getSession()` for auth check | FastAPI session validation |
| `src/app/portal/invoices/page.jsx` | `getSession()` for auth check | FastAPI session validation |
| `src/app/portal/reports/page.jsx` | `getSession()` for auth check | FastAPI session validation |
| `src/app/portal/reset-password/page.jsx` | `updateUser()` for password reset | FastAPI `/api/auth/reset-password` |
| `src/app/admin/page.jsx` | `getSession()`, `signOut()` | FastAPI session endpoints |
| `src/app/admin/clients/[id]/page.jsx` | `getSession()` | FastAPI session validation |
| `src/hooks/useLastLoginTracking.js` | `getSession()` | FastAPI session hook |
| `src/hooks/useUnreadMessagesCount.js` | `getSession()` | FastAPI session hook |
| Multiple components | `getSession()` for API calls | FastAPI session validation |

### 1.2 Database Queries (supabase.from('table'))

| Table | Files Using | Operations | Replacement |
|-------|-------------|------------|-------------|
| `profiles` | 25+ files | SELECT, UPDATE, INSERT | FastAPI `/api/users/*`, `/api/profiles/*` |
| `messages` | 5 files | SELECT, UPDATE, DELETE, INSERT | FastAPI `/api/messages/*` |
| `invoices` | 8 files | SELECT, UPDATE, INSERT, DELETE | FastAPI `/api/invoices/*` |
| `uploads` | 6 files | SELECT, INSERT, UPDATE | FastAPI `/api/uploads/*` |
| `documents` | 5 files | SELECT, INSERT, DELETE | FastAPI `/api/documents/*` |
| `enhanced_tasks` | 4 files | SELECT, INSERT, UPDATE, DELETE | FastAPI `/api/tasks/*` |
| `revenue_pipeline` | 3 files | SELECT, INSERT, UPDATE, DELETE | FastAPI `/api/pipeline/*` |
| `onboarding_templates` | 2 files | SELECT | FastAPI `/api/onboarding/*` |
| `project_status` | 3 files | SELECT, UPDATE | FastAPI `/api/projects/*` |

### 1.3 Storage Usage

| Current | Location | Replacement |
|---------|----------|-------------|
| S3 presigned URLs | `src/app/api/clients/[clientId]/uploads/presign/route.ts` | Storage abstraction layer |
| S3 downloads | `src/app/api/clients/[clientId]/uploads/[uploadId]/download/route.ts` | Storage abstraction layer |
| Logo uploads | `src/app/api/admin/clients/logo/route.js` | Storage abstraction layer |
| Document uploads | `src/app/api/admin/clients/upload-document/route.js` | Storage abstraction layer |
| Invoice uploads | `src/app/api/admin/clients/upload-invoice/route.js` | Storage abstraction layer |

**Note:** Storage is already partially abstracted using S3. The migration to GCS will be straightforward.

---

## PART 2: REPLACEMENT MAPPING

### 2.1 Authentication Replacements

| Supabase Method | FastAPI Replacement |
|-----------------|---------------------|
| `supabase.auth.signUp()` | `POST /api/auth/register` (invite-only) |
| `supabase.auth.signInWithPassword()` | `POST /api/auth/login` |
| `supabase.auth.signOut()` | `POST /api/auth/logout` |
| `supabase.auth.getSession()` | `GET /api/auth/session` (HTTP-only cookie) |
| `supabase.auth.getUser()` | `GET /api/auth/me` |
| `supabase.auth.resetPasswordForEmail()` | `POST /api/auth/forgot-password` |
| `supabase.auth.updateUser()` | `POST /api/auth/reset-password` |

### 2.2 Database Query Replacements

| Supabase Pattern | FastAPI Replacement |
|------------------|---------------------|
| `supabase.from('profiles').select()` | `GET /api/users` or `GET /api/users/{id}` |
| `supabase.from('profiles').update()` | `PATCH /api/users/{id}` |
| `supabase.from('messages').select()` | `GET /api/messages` |
| `supabase.from('messages').insert()` | `POST /api/messages` |
| `supabase.from('messages').update()` | `PATCH /api/messages/{id}` |
| `supabase.from('messages').delete()` | `DELETE /api/messages/{id}` |
| `supabase.from('invoices').select()` | `GET /api/invoices` |
| `supabase.from('uploads').select()` | `GET /api/uploads` |

### 2.3 Frontend Auth Context Replacement

Create new files:
- `src/lib/authContext.js` - React context for auth state
- `src/hooks/useAuth.js` - Hook for auth operations
- `src/lib/apiClient.js` - Fetch wrapper with cookie handling

---

## PART 3: IMPLEMENTATION ORDER (Safest Approach)

### Phase 1: Backend Foundation (No Breaking Changes)
1. Set up FastAPI project structure
2. Set up PostgreSQL with same schema as Supabase
3. Implement storage abstraction layer (S3 first, GCS-ready)
4. Create all FastAPI endpoints (parallel to existing)
5. Add custom auth with password hashing (bcrypt)
6. Add session management with HTTP-only cookies

### Phase 2: Data Migration
1. Export all data from Supabase PostgreSQL
2. Import into new PostgreSQL instance
3. Verify data integrity
4. Set up database connection pooling

### Phase 3: Frontend Migration (Incremental)
1. Create new auth context and hooks
2. Update `/portal/login` to use FastAPI
3. Update `/portal` home page
4. Update remaining portal pages one by one
5. Update admin pages
6. Remove Supabase dependencies

### Phase 4: Storage Migration
1. Implement GCS provider in storage abstraction
2. Migrate existing S3 files to GCS (optional)
3. Switch storage provider via env var

### Phase 5: Cleanup
1. Remove Supabase packages
2. Remove old env vars
3. Update documentation
4. Deploy to production

---

## PART 4: RISKS & MITIGATIONS

### High Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Auth session loss during migration | Users logged out | Run parallel auth systems, migrate sessions |
| Data loss during migration | Critical | Full backup, staged rollout, rollback plan |
| Breaking live portal | Business impact | Feature flags, gradual rollout, staging env |

### Medium Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Password migration | Users need reset | Hash passwords same way, or force reset |
| API response format changes | Frontend breaks | Match existing response shapes exactly |
| Missing RLS policies | Security holes | Implement equivalent checks in FastAPI |

### Low Risk
| Risk | Impact | Mitigation |
|------|--------|------------|
| Performance differences | Slower responses | Optimize queries, add caching |
| Storage URL format changes | Broken file links | Use same URL patterns |

---

## PART 5: REQUIRED ENVIRONMENT VARIABLES

### Current (Supabase)
```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
```

### New (FastAPI + PostgreSQL)
```env
# Database
DATABASE_URL=postgresql://user:pass@host:5432/dbname
DATABASE_POOL_SIZE=10

# Auth
JWT_SECRET_KEY=your-secret-key
SESSION_COOKIE_NAME=session
SESSION_EXPIRE_HOURS=24
PASSWORD_RESET_EXPIRE_HOURS=1

# Storage (abstracted)
STORAGE_PROVIDER=s3  # or 'gcs'
AWS_ACCESS_KEY_ID=
AWS_SECRET_ACCESS_KEY=
AWS_S3_BUCKET=
AWS_REGION=

# GCS (when ready)
GCS_BUCKET=
GCS_PROJECT_ID=
GOOGLE_APPLICATION_CREDENTIALS=

# API
FASTAPI_URL=http://localhost:8000
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## PART 6: FILE-BY-FILE CHANGES

### Files to Create (FastAPI Backend)

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPI app entry
│   ├── config.py               # Settings/env vars
│   ├── database.py             # PostgreSQL connection
│   ├── models/
│   │   ├── __init__.py
│   │   ├── user.py             # User/Profile model
│   │   ├── message.py
│   │   ├── invoice.py
│   │   ├── upload.py
│   │   ├── document.py
│   │   ├── task.py
│   │   └── session.py
│   ├── schemas/
│   │   ├── __init__.py
│   │   ├── user.py             # Pydantic schemas
│   │   ├── auth.py
│   │   └── ...
│   ├── routers/
│   │   ├── __init__.py
│   │   ├── auth.py             # Login, logout, register
│   │   ├── users.py
│   │   ├── messages.py
│   │   ├── invoices.py
│   │   ├── uploads.py
│   │   ├── documents.py
│   │   └── tasks.py
│   ├── services/
│   │   ├── __init__.py
│   │   ├── auth.py             # Password hashing, sessions
│   │   ├── email.py
│   │   └── storage/
│   │       ├── __init__.py
│   │       ├── base.py         # Abstract storage interface
│   │       ├── s3.py           # S3 implementation
│   │       └── gcs.py          # GCS implementation
│   └── middleware/
│       ├── __init__.py
│       └── auth.py             # Session validation middleware
├── requirements.txt
├── Dockerfile
└── docker-compose.yml
```

### Files to Modify (Next.js Frontend)

| File | Changes |
|------|---------|
| `src/lib/supabaseClient.js` | DELETE (replace with apiClient.js) |
| `src/lib/supabaseAdmin.js` | DELETE |
| `src/lib/apiClient.js` | CREATE - fetch wrapper |
| `src/lib/authContext.js` | CREATE - auth state management |
| `src/hooks/useAuth.js` | CREATE - auth hook |
| `src/app/portal/login/page.jsx` | Replace Supabase auth with FastAPI |
| `src/app/portal/page.jsx` | Replace session checks |
| `src/app/portal/*/page.jsx` | Replace all Supabase calls |
| `src/app/admin/*/page.jsx` | Replace all Supabase calls |
| `src/components/*.jsx` | Replace Supabase imports |
| `src/hooks/useLastLoginTracking.js` | Use new auth hook |
| `src/hooks/useUnreadMessagesCount.js` | Use new API client |

### Files to Delete

| File | Reason |
|------|--------|
| `src/lib/supabaseClient.js` | No longer needed |
| `src/lib/supabaseAdmin.js` | No longer needed |

---

## PART 7: INVITE-ONLY REGISTRATION

### Flow
1. Admin creates invite via admin panel
2. System generates unique invite token
3. Email sent to client with invite link
4. Client clicks link → `/portal/register?token=xxx`
5. Client sets password (email pre-filled from invite)
6. Account created, invite marked as used

### Database Table
```sql
CREATE TABLE invites (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email VARCHAR(255) NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  role VARCHAR(50) DEFAULT 'client',
  invited_by UUID REFERENCES users(id),
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);
```

---

## PART 8: ROLE-BASED ACCESS CONTROL

### Roles
- `admin` - Full access to all clients and features
- `client` - Access only to own data

### Implementation
```python
# FastAPI dependency
def require_role(allowed_roles: list[str]):
    def dependency(current_user: User = Depends(get_current_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Forbidden")
        return current_user
    return dependency

# Usage
@router.get("/admin/users")
def list_users(user: User = Depends(require_role(["admin"]))):
    ...
```

---

## NEXT STEPS

1. **Approve this plan** - Review and confirm approach
2. **Set up FastAPI backend** - Create project structure
3. **Implement auth endpoints** - Login, logout, session
4. **Create storage abstraction** - S3 first, GCS-ready
5. **Migrate incrementally** - One page at a time

---

*Generated: March 26, 2026*
