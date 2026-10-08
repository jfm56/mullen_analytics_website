"""Load the non-PHI EMSCS methodology seed (indicator library #1-84, domains,
scoring config). Used by the engine and by the DB seeder (when the flag is on)."""
import functools
import json
from pathlib import Path

_SEED_PATH = Path(__file__).parent / "library_seed.json"


@functools.lru_cache(maxsize=1)
def load_seed() -> dict:
    with open(_SEED_PATH, encoding="utf-8") as f:
        return json.load(f)


def indicators() -> list[dict]:
    return load_seed()["indicators"]


def domains() -> list[dict]:
    return load_seed()["domains"]


def scoring_config() -> dict:
    return load_seed()["scoring_config"]


def category_indicator_numbers() -> dict:
    """category -> [indicator numbers], in order."""
    out: dict = {}
    for ind in indicators():
        out.setdefault(ind["category"], []).append(ind["number"])
    return out


def general_numbers() -> list:
    return category_indicator_numbers().get("General", [])


def indicator_by_number() -> dict:
    return {ind["number"]: ind for ind in indicators()}


@functools.lru_cache(maxsize=1)
def load_protocol_rules() -> dict:
    with open(_SEED_PATH.parent / "protocol_rules.json", encoding="utf-8") as f:
        return json.load(f)


def protocol(number) -> dict:
    return load_protocol_rules().get("protocols", {}).get(str(number), {})


def ruleset_version() -> str:
    return load_protocol_rules().get("ruleset_version", "unset")
