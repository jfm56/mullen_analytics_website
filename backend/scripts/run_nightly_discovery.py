"""
Nightly lead-discovery entrypoint for the on-prem box.

Run directly (or via Windows Task Scheduler / cron) to perform ONE discovery
pass and log the outcome. Self-contained: it pins cwd + sys.path to the backend
so `.env` loads and `import app` resolves to THIS project (never the editable-
installed `app` of another repo on sys.path).

    python backend/scripts/run_nightly_discovery.py

Scheduled nightly at 02:00 by the "MullenAnalytics-LeadDiscovery" task. Idempotent:
run_discovery() de-dupes by company name, so extra runs never create duplicates.
"""
import os
import sys
import logging
from pathlib import Path
from datetime import datetime

BE = Path(__file__).resolve().parents[1]  # …/backend
os.chdir(BE)
sys.path.insert(0, str(BE))

LOG_DIR = BE / "local_data" / "logs"
LOG_DIR.mkdir(parents=True, exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(message)s",
    handlers=[
        logging.FileHandler(LOG_DIR / "lead_discovery.log", encoding="utf-8"),
        logging.StreamHandler(),
    ],
)
log = logging.getLogger("nightly_discovery")


def main() -> int:
    from app.config import get_settings
    from app.database import SessionLocal
    from app.services.leadgen import discover, websearch, llm

    s = get_settings()
    if not s.leads_enabled:
        log.warning("leads_enabled is False — skipping discovery.")
        return 0
    if not websearch.available():
        log.error("Web search unavailable (install `ddgs` or set a search key). Skipping.")
        return 1
    if not llm.available():
        log.error("LLM unavailable (start Ollama or set ANTHROPIC_API_KEY). Skipping.")
        return 1

    started = datetime.utcnow()
    log.info("Lead discovery starting (provider=%s, llm=%s)…",
             s.lead_search_provider, s.lead_llm_provider)
    db = SessionLocal()
    try:
        result = discover.run_discovery(db)
        log.info("Lead discovery finished in %.1fs — %s",
                 (datetime.utcnow() - started).total_seconds(), result)
        return 0 if result.get("ok") else 1
    except Exception:  # noqa: BLE001
        log.exception("Lead discovery crashed")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
