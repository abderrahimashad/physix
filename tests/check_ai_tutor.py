#!/usr/bin/env python3
"""No teacher-correction leaks, secure AI exercise listing, bounded student prompts."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
migration=(root/"supabase/migrations/20261106001700_physix_ai_tutor_private_corrections_quota.sql").read_text()
edge=(root/"supabase/functions/physix-ai-tutor/index.ts").read_text()
student=(root/"assets/eleve-ai.js").read_text()
teacher=(root/"assets/admin-ai.js").read_text()
owner=(root/"assets/admin-content.js").read_text()
student_html=(root/"eleve.html").read_text()
admin_html=(root/"admin.html").read_text()
workflow=(root/".github/workflows/physix-quality.yml").read_text()
for key in ("physix_ai_exercises","teacher_correction","published boolean not null default false",
    "enable row level security","private.physix_is_owner","physix_ai_my_exercises",
    "physix_ai_claim_attempt","physix_ai_attempts","pg_advisory_xact_lock",
    "interval '1 minute'","interval '1 hour'","interval '1 day'"):
    assert key in migration,key
assert "ex.teacher_correction" not in migration.split("create function public.physix_ai_my_exercises()",1)[1]
assert "grant select,insert,update,delete on public.physix_ai_exercises to authenticated" in migration
assert "revoke all on public.physix_ai_attempts from anon,authenticated" in migration
for key in ("client.auth.getUser(jwt)","physix_ai_claim_attempt","OPENAI_API_KEY",
    "teacher_correction","secret()","model:MODEL","max_completion_tokens:600",
    "mode===\"compare\"","mode===\"hint\""):
    assert key in edge,key
assert 'ex.teacher_correction' not in student and 'teacher_correction' not in student
assert "physix_ai_my_exercises" in student
assert "physix-ai-tutor" in student and "Authorization" in student
assert 'teacher_correction' in teacher and 'published:false' in teacher
assert 'ai_exercises:"physix_ai_exercises"' in owner
assert 'id="open-ai"' in owner
assert 'src="/assets/admin-ai.js"' in admin_html
assert 'src="/assets/eleve-ai.js"' in student_html
assert "node --check assets/admin-ai.js" in workflow
assert "node --check assets/eleve-ai.js" in workflow
assert "python3 tests/check_ai_tutor.py" in workflow
for source in (student,teacher):
    for bad in ("localStorage","sessionStorage","service_role","sb_secret_","/object/public/"):
        assert bad not in source,bad
print("OK — private teacher corrections, authenticated classroom exercises and AI request quotas.")
