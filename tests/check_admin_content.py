#!/usr/bin/env python3
"""Vérifications statiques ; ne remplace pas des essais avec deux comptes réels."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
source=(root/"assets/admin-content.js").read_text(encoding="utf-8")
auth=(root/"assets/admin-auth.js").read_text(encoding="utf-8")
html=(root/"admin.html").read_text(encoding="utf-8")
for keyword in ["physix_chapters","physix_resources","physix_devoirs","rest/v1/","physixAdminStart","Authorization","Bearer ","owner_id","data-edit","data-delete","window.confirm"]:
    assert keyword in source, f"Gestion manquante : {keyword}"
assert "ownerId=await isOwner" in auth
assert "window.physixAdminStart(session.access_token,ownerId)" in auth
assert 'id="content-root"' in html
assert "/assets/admin-content.js" in html
assert "localStorage" not in source and "sessionStorage" not in source
assert "service_role" not in source and "sb_secret_" not in source
assert "physix_resource_files" not in source, "Fichiers réels interdits dans ce module"
print("OK — contrat statique du CRUD propriétaire (tests RLS réels à exécuter).")
