# Local Development Guide

## Prerequisites
- Node.js 18+
- Python 3.12+
- PostgreSQL 14+ running locally
- Git

---

## 1. Clone and branch
```bash
git clone https://github.com/jfm56/mullen_analytics_website
cd mullen_analytics_website
git checkout feature/client-admin-portal-redesign
```

---

## 2. Backend setup

```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

pip install -r requirements.txt
```

### Create local .env
```bash
cp env.local.example .env
```
Edit `.env` and set your local PostgreSQL credentials if different from defaults.

### Create local PostgreSQL database
```bash
createdb mullen_analytics
# or in psql:
# CREATE DATABASE mullen_analytics;
```

### Start backend (port 8001)
```bash
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```
You should see: `WARNING: Running in LOCAL mode. Files are stored locally.`

API docs: http://localhost:8001/docs

---

## 3. Frontend setup

```bash
# From project root
npm install
```

The `.env.local` in the project root should contain:
```
FASTAPI_URL=http://localhost:8001
```

### Start frontend (port 3000)
```bash
npm run dev
```

Frontend: http://localhost:3000

---

## 4. Local storage paths

Files are stored under `backend/local_data/` (gitignored):
- `backend/local_data/uploads/`  — raw CSV uploads
- `backend/local_data/cleaned/`  — cleaned CSV outputs
- `backend/local_data/storage/`  — generated profiles/reports

These directories are created automatically on backend startup.

---

## 5. Seed test data

```bash
cd backend
python scripts/seed_local_portal.py
```

This creates:
- Admin user: `admin@mullenanalytics.com` / `admin123`
- Test client: `client@testems.com` / `client123`
- Test agency: Test EMS Agency

**Only works when `ENVIRONMENT=local`.**

---

## 6. Test the upload pipeline

1. Log in as admin at http://localhost:3000/admin
2. Go to **Data Uploads** in the sidebar
3. Select a client and upload an EMSCharts CSV
4. Click **Clean / Reprocess**
5. Once status = CLEANED, click **Dashboard** or **Explore**

Or as client:
1. Log in at http://localhost:3000/portal/login
2. Go to **Upload Data**
3. Upload EMSCharts CSV → auto-cleans → dashboard opens

---

## 7. Run tests

### Backend tests
```bash
cd backend
pytest -v
```

### Frontend lint + build
```bash
npm run lint
npm run build
```

---

## 8. Confirm nothing is pushed

```bash
git status
git log --oneline origin/main..HEAD
```
All commits should be local-only on `feature/client-admin-portal-redesign`.

---

## 9. Stopping services
- Backend: `Ctrl+C` in backend terminal
- Frontend: `Ctrl+C` in frontend terminal
- Local files persist in `backend/local_data/` between restarts

---

## DO NOT use production DATABASE_URL locally unless explicitly required.
