#!/usr/bin/env python3
"""Conservative FastAPI production-module reachability audit.

The production root is app.main, matching the Uvicorn/Docker configuration.
Static imports are followed within backend/app. Reported modules are candidates
for manual review; dynamic imports and offline tooling can make a module useful
even when it is not reachable from the running API.
"""

from __future__ import annotations

import ast
from pathlib import Path


REPO_ROOT = Path(__file__).resolve().parents[2]
BACKEND_ROOT = REPO_ROOT / "backend"
APP_ROOT = BACKEND_ROOT / "app"

# These are intentionally outside the production import graph.
INTENTIONAL_OFFLINE_MODULES = {
    "app.services.emscharts.forecaster": (
        "Forecaster v2 is validation-gated and intentionally not wired to a route."
    ),
    "app.services.emscs_qa.synthetic_cases": (
        "Synthetic fixtures are used by offline validation and demo-seeding scripts."
    ),
}


def module_name(file_path: Path) -> str:
    relative = file_path.relative_to(BACKEND_ROOT).with_suffix("")
    parts = list(relative.parts)
    if parts[-1] == "__init__":
        parts.pop()
    return ".".join(parts)


MODULE_FILES = {module_name(path): path for path in APP_ROOT.rglob("*.py")}


def existing_module(candidate: str) -> str | None:
    """Return the longest import prefix implemented inside backend/app."""
    parts = candidate.split(".")
    while parts:
        name = ".".join(parts)
        if name in MODULE_FILES:
            return name
        parts.pop()
    return None


def imported_modules(current: str, current_file: Path, node: ast.AST) -> set[str]:
    candidates: list[str] = []
    if isinstance(node, ast.Import):
        candidates.extend(alias.name for alias in node.names)
    elif isinstance(node, ast.ImportFrom):
        base = node.module or ""
        if node.level:
            package = current if current_file.name == "__init__.py" else current.rpartition(".")[0]
            package_parts = package.split(".") if package else []
            keep = max(0, len(package_parts) - (node.level - 1))
            base_parts = package_parts[:keep]
            if base:
                base_parts.extend(base.split("."))
            base = ".".join(base_parts)

        if base:
            candidates.append(base)
        for alias in node.names:
            candidates.append(f"{base}.{alias.name}" if base else alias.name)

    resolved = {existing_module(candidate) for candidate in candidates}
    return {module for module in resolved if module is not None}


graph: dict[str, set[str]] = {module: set() for module in MODULE_FILES}
for module, file_path in MODULE_FILES.items():
    try:
        tree = ast.parse(file_path.read_text(encoding="utf8"), filename=str(file_path))
    except SyntaxError as exc:
        print(f"Unable to parse {file_path.relative_to(REPO_ROOT)}: {exc}")
        continue
    for node in ast.walk(tree):
        if isinstance(node, (ast.Import, ast.ImportFrom)):
            graph[module].update(imported_modules(module, file_path, node))

reachable: set[str] = set()
pending = ["app.main"]
while pending:
    module = pending.pop()
    if module in reachable:
        continue
    reachable.add(module)
    pending.extend(graph.get(module, ()))

unreachable = sorted(
    module
    for module, file_path in MODULE_FILES.items()
    if module not in reachable and file_path.name != "__init__.py"
)
review_candidates = [module for module in unreachable if module not in INTENTIONAL_OFFLINE_MODULES]
intentional = [module for module in unreachable if module in INTENTIONAL_OFFLINE_MODULES]

print("Backend modules not reachable from app.main:")
if not review_candidates:
    print("  (none)")
for module in review_candidates:
    print(f"  {MODULE_FILES[module].relative_to(REPO_ROOT).as_posix()}")

print("\nIntentional offline/unwired modules:")
if not intentional:
    print("  (none)")
for module in intentional:
    file_path = MODULE_FILES[module].relative_to(REPO_ROOT).as_posix()
    print(f"  {file_path} -- {INTENTIONAL_OFFLINE_MODULES[module]}")

print(
    f"\nSummary: {len(review_candidates)} production-unreachable review candidates; "
    f"{len(intentional)} intentional offline/unwired modules."
)
