#!/usr/bin/env python3
"""Static privacy gates for PhysiX invited-student library (not live student login)."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
html=(root/"eleve.html").read_text(encoding="utf-8")
student=(root/"assets/eleve.js").read_text(encoding="utf-8")
teacher=(root/"assets/admin-students.js").read_text(encoding="utf-8")
drive=(root/"assets/admin-drive.js").read_text(encoding="utf-8")
admin=(root/"admin.html").read_text(encoding="utf-8")
home=(root/"index.html").read_text(encoding="utf-8")
migration=(root/"supabase/migrations/20261106000900_physix_student_private_library.sql").read_text(encoding="utf-8")
for required in ['id="login-panel"','id="library-panel"','id="class-filter"','id="devoirs-tab"','/assets/eleve.js']:
    assert required in html, required
for required in ['auth/v1/otp','auth/v1/user','auth/v1/verify','physix_my_student_library',
                 '/storage/v1/object/authenticated/physix-private/','access_token','history.replaceState',
                 'Bearer '+ '"+"+token', 'no-store']:
    assert required in student,required
for forbidden in ['service_role','sb_secret_','client_secret','localStorage','sessionStorage','/object/public/']:
    assert forbidden not in student,forbidden
for required in ['physix_student_access','physix_student_publications','physix_student_can_see_publication',
                 'email_confirmed_at','object.get_authenticated','physix_pdf_student_published_read',
                 "r.state='published'","d.state='published'","d.correction_state='authorized'"]:
    assert required in migration,required
assert 'from anon,authenticated' in migration
assert "public,anon" in migration
for required in ['physix_student_', 'api("access"', 'api("publications"', 'data-publish',
                 'data-access','downloadPdf','50 Mo','confirm(']:
    assert required in teacher,required
for forbidden in ['service_role','sb_secret_','client_secret','localStorage']:
    assert forbidden not in teacher,forbidden
assert 'async function downloadPdf(' in drive
assert 'downloadPdf,removePdf' in drive
assert '/assets/admin-students.js' in admin
assert 'window.physixStudentAdminRender?.(' in (root/"assets/admin-content.js").read_text(encoding="utf-8")
assert '/eleve.html' in home
print("OK — invitations élèves, RLS de publication, PDFs privés et séparation cours/devoirs.")
