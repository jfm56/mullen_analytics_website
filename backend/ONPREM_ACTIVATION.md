# On-Prem Activation — Visitor Analytics + Lead Discovery + Outreach

Status of the on-prem stack on this box (`F:\Projects\mullen_analytics_website`),
activated **2026-08-04**. The code shipped to production in PR #17; this doc covers
turning the **on-prem** half on.

---

## ✅ Done & verified locally (this box)

| Piece | State |
|---|---|
| `ddgs` + `apscheduler` installed | ✅ (Python 3.14, `C:\Python314`) |
| `backend/.env` flags | ✅ `ANALYTICS_ENABLED / LEADS_ENABLED = true`, `LEAD_LLM_PROVIDER=anthropic`, `SCHEDULER_ENABLED=false` (OS task does the crawl) |
| On-prem API on `127.0.0.1:8001` | ✅ healthy; tables `web_sessions / web_events / leads / outreach_messages / lead_suppressions` created in local Postgres `mullen_analytics` |
| Visitor-analytics ingest | ✅ real beacons `{ok:true}`, bot UA dropped |
| Lead discovery | ✅ **7 real leads** found (gov/EMS/healthcare RFPs) with need summaries + scores |
| Outreach drafting | ✅ AI draft saved as `status=draft` (never auto-sends) |
| Nightly crawler | ✅ Windows Scheduled Task **`MullenAnalytics-LeadDiscovery`**, daily 02:00, `LastResult=0` on a live test |

**Run the always-on API** (needed for the tunnel + admin dashboard reads):
```
powershell -ExecutionPolicy Bypass -File F:\Projects\mullen_analytics_website\backend\scripts\start-onprem.ps1
```
> ⚠️ Always launch the backend from the `backend\` folder (the script does this).
> From the repo root, `app.main` resolves to a *different* project on `sys.path` and crashes.

---

## ⏳ Remaining — these need YOUR accounts / secrets

### 1. Cloudflare Tunnel  (client already installed: `cloudflared` v2026.7.3)
Exposes the on-prem API as `https://onprem.mullenanalytics.com`. Run in a fresh terminal:
```
cloudflared tunnel login                                              # browser: pick mullenanalytics.com
cloudflared tunnel create mullen-onprem                               # prints a tunnel UUID + writes <UUID>.json
cloudflared tunnel route dns mullen-onprem onprem.mullenanalytics.com # creates the DNS record
```
Then create `C:\Users\jmull\.cloudflared\config.yml`:
```yaml
tunnel: <TUNNEL-UUID>
credentials-file: C:\Users\jmull\.cloudflared\<TUNNEL-UUID>.json
ingress:
  - hostname: onprem.mullenanalytics.com
    service: http://127.0.0.1:8001
  - service: http_status:404
```
Run it (foreground), or install as a persistent service (elevated shell):
```
cloudflared tunnel run mullen-onprem
# --- or, for 24/7 auto-start ---
cloudflared service install
```
Smoke test once up: `https://onprem.mullenanalytics.com/health` → `{"status":"healthy"}`.

### 2. Vercel env var — DO THIS LAST (after the tunnel + API are reliably 24/7)
Points the production site's on-prem proxy at your box. Until it's set, `proxy2`
safely falls back to Railway, so **don't set it until the tunnel is always-on** —
otherwise prod analytics/admin reads hit a dead tunnel.
- Dashboard: Project → Settings → Environment Variables → add
  `ONPREM_FASTAPI_URL = https://onprem.mullenanalytics.com` (Production) → redeploy.
- Or CLI:
```
npm i -g vercel && vercel login && vercel link
vercel env add ONPREM_FASTAPI_URL production      # value: https://onprem.mullenanalytics.com
vercel --prod
```
After this, live-site visitor analytics flows to **your** Postgres and the admin
Analytics/Leads tabs read from the on-prem box.

### 3. SendGrid — enables outreach *sending* (drafting already works)
In `backend\.env` on this box, set:
```
SENDGRID_API_KEY=SG.xxxxxxxx           # your key — do NOT paste it in chat
SMTP_FROM_EMAIL=noreply@mullenanalytics.com   # (currently noreply@localhost)
```
Verify `noreply@mullenanalytics.com` as a sender/domain in SendGrid, then restart the API.
Sending stays human-gated: admin reviews a draft → clicks send → suppression-checked,
CAN-SPAM footer + one-click unsubscribe attached, `From noreply@`, `Reply-To jmullen@`.

### 4. Railway cleanup — one stray prod test row from the PR #17 deploy check
Run against the Railway Postgres (Railway dashboard → Postgres → Query, or psql):
```sql
DELETE FROM web_events   WHERE visitor_id='x';
DELETE FROM web_sessions WHERE visitor_id='x';
```

---

## Managing the nightly crawler
- **Run now:** `Start-ScheduledTask -TaskName MullenAnalytics-LeadDiscovery`
- **Log:** `backend\local_data\logs\lead_discovery.log`
- **Remove:** `Unregister-ScheduledTask -TaskName MullenAnalytics-LeadDiscovery -Confirm:$false`
- **To run while logged off:** run `scripts\enable-logged-off.ps1` **once from an elevated
  PowerShell** (right-click → Run as administrator). It switches the task to S4U logon —
  runs whether or not you're signed in, **no password stored**. The PC must be powered on
  (the task can wake it from sleep, but not from a full shutdown).
  - Alternative (stores your Windows password, gives a full token): Task Scheduler → the
    task → General → "Run whether user is logged on or not" → OK → enter your password.
- Uses your Anthropic key for the need-extraction step (one call per nightly run).
  To keep lead analysis fully on-prem + free instead, install Ollama, `ollama pull llama3.1:8b`,
  and set `LEAD_LLM_PROVIDER=ollama` in `.env`.
