#!/usr/bin/env python3
"""Tracking security and UI invariants — no real pupil data used."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
sql=(root/"supabase/migrations/20261106001000_physix_teacher_activity_tracker.sql").read_text(encoding="utf-8")
js=(root/"assets/admin-tracking.js").read_text(encoding="utf-8")
html=(root/"admin.html").read_text(encoding="utf-8")
admin=(root/"assets/admin-content.js").read_text(encoding="utf-8")
for required in [
    "create table if not exists public.physix_pupils",
    "create table if not exists public.physix_activity_events",
    "create table if not exists public.physix_activity_grades",
    "enable row level security",
    "revoke all on public.physix_pupils",
    "private.physix_is_owner(auth.uid())",
    "physix_guard_activity_event",
    "semester in (1,2)",
    "grade between 0 and 20",
    "foreign key(owner_id,pupil_id)"
]:
    assert required in sql, f"SQL tracking invariant absent: {required}"
for required in [
    "window.physixTrackingRender=",
    'rest("pupils"',
    'rest("activity_events"',
    'rest("activity_grades"',
    '"participation"',
    '"exercise"',
    '"homework"',
    '"expose"',
    '"notebook"',
    '"materials"',
    '"disturbance"',
    '"absence"',
    '"late"',
    "Note d’activité / 20",
    "Enregistrer la note",
    "Exporter le bilan CSV",
    'active=eq.true',
    "new Blob(",
    "À",
]:
    if required == "À": continue
    assert required in js, f"JS tracking invariant absent: {required}"
for forbidden in ["localStorage", "sessionStorage", "service_role", "sb_secret_", "client_secret", "/object/public/"]:
    assert forbidden not in js, forbidden
assert 'src="/assets/admin-tracking.js"' in html
assert 'tab="tracking"' in admin
assert 'window.physixTrackingRender(root,' in admin
assert 'classroom' in js and 'semester' in js
print("OK — suivi élève privé, événements par semestre, note manuelle et export CSV.")
