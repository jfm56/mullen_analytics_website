#!/usr/bin/env python3
"""Conservative exact-block duplication inventory.

Whitespace and blank/comment-only lines are ignored. Reported blocks are review
candidates; shared framework structure and repeated security checks can be
intentional. This script never edits application files.
"""

from __future__ import annotations

from collections import defaultdict
from pathlib import Path
import re


ROOT = Path(__file__).resolve().parents[2]
SOURCE_ROOTS = (ROOT / "src", ROOT / "backend" / "app")
EXTENSIONS = {".js", ".jsx", ".ts", ".tsx", ".py"}
WINDOW = 12
LIMIT = 50


def normalized_lines(path: Path) -> list[tuple[int, str]]:
    result = []
    for number, raw in enumerate(path.read_text(encoding="utf8", errors="ignore").splitlines(), 1):
        line = re.sub(r"\s+", " ", raw.strip())
        if not line or line.startswith(("#", "//")):
            continue
        result.append((number, line))
    return result


files = sorted(
    path
    for source_root in SOURCE_ROOTS
    for path in source_root.rglob("*")
    if path.suffix in EXTENSIONS and "__pycache__" not in path.parts
)
content = [(path, normalized_lines(path)) for path in files]

windows: dict[tuple[str, ...], list[tuple[int, int]]] = defaultdict(list)
for file_index, (_, lines) in enumerate(content):
    for offset in range(max(0, len(lines) - WINDOW + 1)):
        windows[tuple(line for _, line in lines[offset:offset + WINDOW])].append((file_index, offset))

pairs: set[tuple[tuple[int, int], tuple[int, int]]] = set()
for occurrences in windows.values():
    for left in occurrences:
        for right in occurrences:
            if left[0] < right[0]:
                pairs.add((left, right))

results = set()
for (left_file, left_start), (right_file, right_start) in pairs:
    left_lines = content[left_file][1]
    right_lines = content[right_file][1]
    while (
        left_start > 0
        and right_start > 0
        and left_lines[left_start - 1][1] == right_lines[right_start - 1][1]
    ):
        left_start -= 1
        right_start -= 1
    length = 0
    while (
        left_start + length < len(left_lines)
        and right_start + length < len(right_lines)
        and left_lines[left_start + length][1] == right_lines[right_start + length][1]
    ):
        length += 1
    if length < WINDOW:
        continue
    results.add((length, left_file, left_start, right_file, right_start))

ranked = sorted(results, reverse=True)[:LIMIT]
print(f"Exact normalized duplicate blocks (minimum {WINDOW} meaningful lines):")
if not ranked:
    print("  (none)")
for length, left_file, left_start, right_file, right_start in ranked:
    left_path, left_lines = content[left_file]
    right_path, right_lines = content[right_file]
    print(
        f"  {length:>3} lines  "
        f"{left_path.relative_to(ROOT)}:{left_lines[left_start][0]}-{left_lines[left_start + length - 1][0]}  <->  "
        f"{right_path.relative_to(ROOT)}:{right_lines[right_start][0]}-{right_lines[right_start + length - 1][0]}"
    )
print(f"\nSummary: {len(results)} maximal exact duplicate blocks; showing {len(ranked)}.")
