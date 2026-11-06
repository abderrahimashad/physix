#!/usr/bin/env python3
"""Manual-only copies: teacher notification, multiple private photos, explicit activity credit."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
files=lambda path:(root/path).read_text(encoding="utf-8")
sql=files("supabase/migrations/20261106001800_physix_ai_photo_submissions_reviewed_activity.sql")
multi=files("supabase/migrations/20261106001900_physix_manual_exercise_multi_photos.sql")
notifications=files("supabase/migrations/20261106002000_physix_manual_copies_owner_notifications.sql")
edge=files("supabase/functions/physix-ai-submission/index.ts")
student=files("assets/eleve-remises.js")
teacher=files("assets/admin-remises.js")
bell=files("assets/admin-notifications.js")
portal=files("eleve.html")
admin=files("admin.html")
shell=files("assets/admin-content.js")
ci=files(".github/workflows/physix-quality.yml")
for token in ("physix_ai_submissions","physix_ai_review_submission","review_status",
    "unique(exercise_id,pupil_id)","unique(owner_id,exercise_id,sha256)",
    "kind,occurred_on,details,ai_submission_id","'exercise'","private.physix_is_owner"):
    assert token in sql,token
for token in ("physix_submission_pages","page_number between 1 and 4",
    "unique(owner_id,exercise_id,sha256)","physix_guard_submission_page",
    "teacher_correction set default","physix_ai_review_submission",
    "insert into public.physix_activity_events","if p_accepted then"):
    assert token in multi,token
for token in ("physix_teacher_pending_copies","s.review_status='pending'",
    "p.full_name","ex.class_code","ex.title","private.physix_is_owner",
    "revoke all on function","to authenticated"):
    assert token in notifications,token
for token in ("physix_ai_upload_context","member.auth.getUser(jwt)","getAll(\"photos\")",
    "files.length>4","SHA-256","physix_submission_pages",
    "storage.from(\"physix-solutions\")","req.method===\"GET\"","page_id",
    "Access-Control-Allow-Headers","req.method===\"OPTIONS\"",
    "owner_id:owner","pupil_id:pupil","sha256:p.hash"):
    assert token in edge,token
assert "OPENAI_API_KEY" not in edge and "GEMINI_API_KEY" not in edge
assert "createClient(BASE,secret()" in edge and "user.user.id" in edge
for token in ("multiple required","new FormData()","payload.append(\"photos\"",
    "physix_ai_my_submission_status","En attente de validation","physix-ai-submission"):
    assert token in student,token
for token in ("data-review","physix_ai_review_submission","data-open-copy",
    "page_id","pages.filter","pupil?.full_name","copies-class"):
    assert token in teacher,token
for token in ("physix_teacher_pending_copies","pupil_name","class_code",
    "exercise_title","total_pending","setInterval(refresh,45000)",
    'openTab("remises")'):
    assert token in bell,token
assert "physixStudentRemises" in files("assets/eleve.js")
assert "physixStudentAi?.render" not in files("assets/eleve.js")
assert 'src="/assets/eleve-remises.js"' in portal
assert 'src="/assets/eleve-ai.js"' not in portal
assert "window.physixAdminNotificationsInit" in shell
assert 'id="open-remises"' in shell
for src in ("admin-remises.js","admin-notifications.js"):
    assert ('src="/assets/'+src+'"') in admin
for source in (student,teacher,bell):
    for forbidden in ("localStorage","sessionStorage","service_role","sb_secret_","/object/public/"):
        assert forbidden not in source,forbidden
assert "python3 tests/check_manual_submissions.py" in ci
print("OK — private photo homework, in-site teacher bell and manual-only Suivi credit.")
