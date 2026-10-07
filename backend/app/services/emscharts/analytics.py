"""Analytics v2 — the deterministic EMS dashboard metrics, reimplemented over the
normalized agency-owned EMSCharts pipeline (NOT the legacy routes). Agency-scoped
(RLS). No UHU (NEMSIS has no scheduled unit-hours; not inferred). Geographic here
is a coarse lat/lng grid only; municipality/zones are Geographic v2 (geocoding)."""
from collections import defaultdict

import numpy as np
from sqlalchemy.orm import Session as DBSession

from ...models import EMSIncident
from ...security_rls import set_agency_context


def _mins(a, b):
    if a and b:
        return (a - b).total_seconds() / 60.0
    return None


def _pctiles(xs):
    if not xs:
        return {"p50": None, "p90": None, "mean": None, "n": 0}
    arr = np.array(xs, dtype=float)
    return {"p50": round(float(np.percentile(arr, 50)), 2),
            "p90": round(float(np.percentile(arr, 90)), 2),
            "mean": round(float(arr.mean()), 2),
            "n": len(xs)}


def compute_metrics_v2(db: DBSession, agency_id):
    set_agency_context(db, agency_id)
    rows = db.query(EMSIncident).filter(EMSIncident.agency_id == agency_id).all()

    turnout, travel, response = [], [], []
    emergency = ift = other = 0
    by_hour = defaultdict(int)
    by_dow = defaultdict(int)
    by_month = defaultdict(int)
    by_unit = defaultdict(lambda: {"calls": 0, "resp": []})
    incidents = defaultdict(list)  # incident_number -> [(arrived_scene_at, response_min, unit_id)]
    geo_grid = defaultdict(int)

    for r in rows:
        t = _mins(r.enroute_at, r.unit_notified_at)
        v = _mins(r.arrived_scene_at, r.enroute_at)
        rsp = _mins(r.arrived_scene_at, r.unit_notified_at)
        if t is not None and t >= 0:
            turnout.append(t)
        if v is not None and v >= 0:
            travel.append(v)
        if rsp is not None and rsp >= 0:
            response.append(rsp)
        emergency += r.call_type == "emergency"
        ift += r.call_type == "ift"
        other += r.call_type not in ("emergency", "ift")

        ct = r.psap_call_at or r.unit_notified_at  # call time for volume buckets
        if ct:
            by_hour[ct.hour] += 1
            by_dow[ct.weekday()] += 1          # 0=Mon .. 6=Sun
            by_month[ct.strftime("%Y-%m")] += 1

        if r.unit_id:
            by_unit[r.unit_id]["calls"] += 1
            if rsp is not None and rsp >= 0:
                by_unit[r.unit_id]["resp"].append(rsp)

        inc_key = r.incident_number or ("single:" + r.source_record_id)
        if r.arrived_scene_at:
            incidents[inc_key].append((r.arrived_scene_at, rsp, r.unit_id))

        if r.scene_lat is not None and r.scene_lng is not None:
            geo_grid[f"{round(r.scene_lat, 2)},{round(r.scene_lng, 2)}"] += 1

    # First-arriving unit: per incident, earliest on-scene -> that unit's response time.
    first_resp = []
    multi = 0
    for units in incidents.values():
        first = sorted(units, key=lambda x: x[0])[0]
        if first[1] is not None and first[1] >= 0:
            first_resp.append(first[1])
        if len(units) > 1:
            multi += 1
    fa = _pctiles(first_resp)

    turn, trav, resp = _pctiles(turnout), _pctiles(travel), _pctiles(response)
    return {
        "agency_id": str(agency_id),
        "schema_version": "analytics-v2",
        "call_volume": len(rows),
        "classification": {"emergency": emergency, "ift": ift, "other": other},
        "response_times_min": {"turnout": turn, "travel": trav, "response": resp},
        "by_hour": {str(h): by_hour[h] for h in sorted(by_hour)},
        "by_day_of_week": {str(d): by_dow[d] for d in sorted(by_dow)},
        "by_month": {m: by_month[m] for m in sorted(by_month)},
        "first_arriving": {
            "incidents": len(incidents),
            "multi_unit_incidents": multi,
            "first_response_p50": fa["p50"], "first_response_p90": fa["p90"],
            "first_response_mean": fa["mean"], "n": fa["n"],
        },
        "by_unit": {u: {"calls": d["calls"], **_pctiles(d["resp"])} for u, d in by_unit.items()},
        "geographic": {
            "grid_cells": len(geo_grid),
            "top_cells": dict(sorted(geo_grid.items(), key=lambda x: -x[1])[:20]),
            "note": "coarse ~1km lat/lng grid; municipality/response-zones = Geographic v2 (geocoding)",
        },
        # Flat v1-compatible fields (keep the existing snapshot validator working).
        "emergency": emergency, "ift": ift, "other": other,
        "turnout_min_avg": turn["mean"], "travel_min_avg": trav["mean"],
        "response_min_avg": resp["mean"], "n_with_response": len(response),
    }
