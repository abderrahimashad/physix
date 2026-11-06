#!/usr/bin/env python3
"""Heuristic repository secret scan; it does NOT replace dedicated secret scanning."""
from pathlib import Path
import re
import sys

ROOT = Path(__file__).resolve().parents[1]
SKIP = {".git", "node_modules", ".venv", "dist", "build", "__pycache__"}
EXT = {".js", ".html", ".json", ".yml", ".yaml", ".sql", ".env", ".ts", ".py"}
RULES = {
    "Google OAuth client secret": re.compile(r"GOCSPX-" + r"[A-Za-z0-9_-]{16,}"),
    "Google OAuth access token": re.compile(r"ya29\." + r"[A-Za-z0-9_-]{20,}"),
    "Supabase secret key": re.compile(r"sb_secret_[A-Za-z0-9_-]{16,}"),
    "JWT token": re.compile(r"eyJ[A-Za-z0-9_-]{24,}\.eyJ[A-Za-z0-9_-]{24,}\.[A-Za-z0-9_-]{20,}"),
    "Live private key": re.compile(r"-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----"),
}
violations = []
for path in ROOT.rglob("*"):
    if not path.is_file() or path.suffix not in EXT or set(path.parts) & SKIP:
        continue
    if path.name.startswith(".env") and path.name != ".env.example":
        violations.append(f"{path.relative_to(ROOT)}: environment secrets file should not be committed")
        continue
    if path.stat().st_size > 2_000_000:
        continue
    content = path.read_text(encoding="utf-8", errors="replace")
    for name, pattern in RULES.items():
        if pattern.search(content):
            violations.append(f"{path.relative_to(ROOT)}: possible {name}")
if violations:
    for violation in violations:
        print("ERROR:", violation, file=sys.stderr)
    sys.exit(1)
print("OK: no obvious committed secrets matched (not a comprehensive audit).")
