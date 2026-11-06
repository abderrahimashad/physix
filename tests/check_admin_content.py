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
assert "Cette ressource possède des PDF" in source
assert "Ce devoir possède des PDF" in source
assert "root.scrollIntoView" in source, "Le panneau doit être affiché après connexion"
assert "Connexion reconnue, mais le chargement" in source
assert "#owner-form[hidden]{display:none!important}" in html
assert "let authenticated=false" in auth
assert 'tab="documents"' in source
assert 'window.physixQuickPdfRender(root' in source
assert "Créer une ressource privée" not in files or "physixQuickPdfRender" in files
for required in ["quick-pdf-form","Ajouter un PDF","Mes PDF enregistrés","visibility:\"private\"","state:\"draft\"","committed=true","uploadedPath","MAX_BYTES","%PDF-"]:
    assert required in files, f"Import simple manquant : {required}"
assert "1. Dans quel chapitre ?" in files
assert "3. Choisissez votre document" in files
assert "Enregistrer mon PDF" in files
assert "guessKind(file?.name)" in files
assert 'quick-optional' in files and 'quick-documents' in files
assert "quick-advanced-menu" in source
assert ".quick-simple-form" in html
assert "1BAC BIOF G1" in files and "1BAC BIOF G2" in files and "1BAC BIOF G3" in files
assert "2BAC PC BIOF" in files
assert "target_classes" in files and "target_classes,visibility" in files
assert "quick-class-options" in files and 'name="target_class"' in files
assert "quick-class-chip" in html
assert "classesForChapter(chapter_id)" in files
assert "target_classes.some(x=>!validClasses.includes(x))" in files
sql_classes=(root/"supabase/migrations/20261106000200_physix_resource_target_classes.sql").read_text(encoding="utf-8")
assert "add column if not exists target_classes" in sql_classes
assert "physix_resources_target_classes_allowed" in sql_classes
assert "aucun accès" in sql_classes.lower() or "aucun droit" in sql_classes.lower()
simple=(root/"assets/admin-simple.js").read_text(encoding="utf-8")
class_ui=(root/"assets/admin-classes.js").read_text(encoding="utf-8")
assert 'src="/assets/admin-simple.js"' in html and 'src="/assets/admin-classes.js"' in html
for required in ['Pour quelle classe ?', 'Quel type de document ?', 'Choisir votre PDF', 'Devoir surveillé', 'MAX_BYTES=50*1024*1024','target_classes:[classroom.code]', 'data-class-manager','Documents généraux']:
    assert required in simple, f"Interface simplifiée manquante : {required}"
for required in ['physixClassRender','Ajouter la classe','Retirer cette classe','Réactiver','rest("classes"']:
    assert required in class_ui, f"Gestion de classes manquante : {required}"
assert 'classes:"physix_classes"' in source
assert 'classes=classes' not in source or 'physix_classes' in source
dynamic_sql=(root/"supabase/migrations/20261106000300_physix_dynamic_classes_and_pdf_50mb.sql").read_text(encoding="utf-8")
for required in ["create table if not exists public.physix_classes", "enable row level security", "physix_classes_owner",
                 "physix_validate_resource_classes","file_size between 1 and 52428800"]:
    assert required in dynamic_sql
kind_sql=(root/"supabase/migrations/20261106000400_physix_document_devoir_kind.sql").read_text(encoding="utf-8")
assert "Devoir surveillé" in kind_sql
print("OK — CRUD propriétaire et import PDF direct contrôlés statiquement.")
