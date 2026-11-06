#!/usr/bin/env python3
"""Private owner-only portrait roster and semester dashboard invariants."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
app=(root/"assets/admin-overview.js").read_text(encoding="utf-8")
owner=(root/"assets/admin-content.js").read_text(encoding="utf-8")
html=(root/"admin.html").read_text(encoding="utf-8")
ci=(root/".github/workflows/physix-quality.yml").read_text(encoding="utf-8")
for required in [
    "window.physixOwnerOverview=",
    'pages("pupils"',
    'pages("activity_events"',
    'pages("class_work"',
    'pages("student_profiles"',
    "session.token",
    "physix-avatars",
    "storage/v1/object/authenticated/",
    "URL.createObjectURL",
    "URL.revokeObjectURL",
    "MutationObserver",
    "Tableau de bord",
    "Trombinoscope",
    "Semestre 1",
    "Semestre 2",
    "Activités individuelles",
    "Devoirs faits (observations)",
    "En attente de photo",
    "p.active",
    "offset=",
    "pageSize=500",
]:
    assert required in app, f"Missing owner overview invariant: {required}"
for forbidden in ["localStorage","sessionStorage","sb_secret_","service_role","/storage/v1/object/public/",
                  'rest("activity_grades"']:
    assert forbidden not in app, forbidden
assert "window.physixOwnerOverview(root," in owner
assert 'tab==="dashboard"||tab==="portraits"' in owner
assert 'id="open-portraits"' in owner
assert 'id="open-dashboard"' in owner
assert 'src="/assets/admin-overview.js"' in html
assert "node --check assets/admin-overview.js" in ci
assert "python3 tests/check_owner_overview.py" in ci
print("OK — private portrait roster and semester dashboard use owner-only RLS resources.")
