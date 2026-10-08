"""Legacy local PHI reservoir — migration MANIFEST generator (infra Priority 4).

Walks the local upload/storage roots and emits a **no-PHI** manifest: per top-level
directory it records the directory name (a client_id/agency_id UUID, not PHI), file COUNT,
total BYTES, file EXTENSIONS, and oldest/newest mtime. It NEVER opens a file, and it does
NOT record individual filenames (which could embed identifiers). Use the output to plan the
controlled migration to private S3/KMS; it contains no patient data.

Run:  python -m scripts.phi_local_manifest            # human summary
      python -m scripts.phi_local_manifest --json     # machine-readable manifest
"""
from __future__ import annotations

import json
import sys
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path

from app.config import get_settings


def _scan_root(root: Path) -> dict:
    out = {"root": str(root), "exists": root.exists(), "dirs": [], "totals": {"files": 0, "bytes": 0}}
    if not root.exists():
        return out
    for child in sorted(p for p in root.iterdir() if p.is_dir()):
        files = 0
        total = 0
        exts: Counter = Counter()
        oldest = newest = None
        for f in child.rglob("*"):
            if not f.is_file():
                continue
            try:
                st = f.stat()
            except OSError:
                continue
            files += 1
            total += st.st_size
            exts[f.suffix.lower() or "<none>"] += 1
            mt = st.st_mtime
            oldest = mt if oldest is None else min(oldest, mt)
            newest = mt if newest is None else max(newest, mt)
        out["dirs"].append({
            "dir": child.name,                     # client_id/agency_id UUID — not PHI
            "files": files, "bytes": total,
            "extensions": dict(exts),
            "oldest": datetime.fromtimestamp(oldest, timezone.utc).date().isoformat() if oldest else None,
            "newest": datetime.fromtimestamp(newest, timezone.utc).date().isoformat() if newest else None,
        })
        out["totals"]["files"] += files
        out["totals"]["bytes"] += total
    return out


def build_manifest() -> dict:
    s = get_settings()
    roots = [Path(s.data_uploads_root), Path(s.data_storage_root)]
    return {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "note": "No PHI content; directory names are client/agency UUIDs; filenames omitted.",
        "roots": [_scan_root(r) for r in roots],
    }


def main():
    m = build_manifest()
    if "--json" in sys.argv:
        print(json.dumps(m, indent=2))
        return
    for r in m["roots"]:
        mb = r["totals"]["bytes"] / 1e6
        print(f"\n{r['root']}  (exists={r['exists']})  — {r['totals']['files']} files, {mb:.1f} MB")
        for d in r["dirs"]:
            dmb = d["bytes"] / 1e6
            print(f"  {d['dir']}: {d['files']} files, {dmb:.1f} MB, {d['extensions']}, {d['oldest']}..{d['newest']}")


if __name__ == "__main__":
    main()
