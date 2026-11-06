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
assert "physix_resource_files" in source, "Métadonnées des PDF attendues"
files=(root/"assets/admin-files.js").read_text(encoding="utf-8")
assert "/assets/admin-files.js" in html
for requirement in ["physixFilesRender","application/pdf","%PDF-","MAX_BYTES","authHeaders","Bearer ","/storage/v1/object/","x-upsert","storage_path","window.confirm","URL.createObjectURL"]:
    assert requirement in files, f"Contrôle PDF absent : {requirement}"
for forbidden in ["sb_secret_","service_role","localStorage","sessionStorage","/object/public/"]:
    assert forbidden not in files, f"Usage interdit dans le client PDF : {forbidden}"
sql=(root/"supabase/migrations/20261106000100_physix_private_pdf_storage_policies.sql").read_text(encoding="utf-8")
for requirement in ["physix_pdf_owner_select","physix_pdf_owner_insert","physix_pdf_owner_delete","for select to authenticated","for insert to authenticated","for delete to authenticated","private.physix_is_owner","bucket_id = 'physix-private'","public=false","array_length(storage.foldername"]:
    assert requirement in sql, f"Règle SQL manquante : {requirement}"
assert "for update to authenticated" not in sql.lower()
assert "root.scrollIntoView" in source, "Le panneau doit être affiché après connexion"
assert "Connexion reconnue, mais le chargement" in source
assert "#owner-form[hidden]{display:none!important}" in html
assert "let authenticated=false" in auth
print("OK — contrat statique du CRUD propriétaire (tests RLS réels à exécuter).")
