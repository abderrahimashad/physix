#!/usr/bin/env python3
"""Contrôles statiques d'interface Auth ; pas un test du parcours email réel."""
from pathlib import Path
import json
root=Path(__file__).resolve().parents[1]
js=(root/"assets/admin-auth.js").read_text(encoding="utf-8")
admin=(root/"admin.html").read_text(encoding="utf-8")
callback=(root/"auth-confirm.html").read_text(encoding="utf-8")
cfg=json.loads((root/"vercel.json").read_text(encoding="utf-8"))
csp=next(h["value"] for rule in cfg["headers"] for h in rule["headers"] if h["key"]=="Content-Security-Policy")
assert 'id="owner-form"' in admin
assert 'id="activation-form"' in callback
assert 'id="go-admin"' in callback
assert '/auth/v1/token?grant_type=password' in js
assert '/auth/v1/user' in js
assert '/rest/v1/physix_owners?select=user_id&limit=1' in js
assert "history.replaceState" in js
assert 'https://auqzfcucpglrnvwhjamo.supabase.co' in csp
assert "sb_secret_" not in js and "service_role" not in js
assert "localhost:3000" not in js
print("OK : interface Auth, contrôle propriétaire, nettoyage du fragment et CSP détectés.")
