#!/usr/bin/env python3
"""Teacher-only wheel and chapter QCM: safe student questions, single attempt, no activity grading."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
get=lambda p:(root/p).read_text(encoding="utf-8")
schema=get("supabase/migrations/20261106002200_physix_chapter_qcm_teacher_grading.sql")
wheel=get("assets/admin-wheel.js")
teacher=get("assets/admin-qcm.js")
student=get("assets/eleve-qcm.js")
main=get("assets/admin-content.js")
eleve=get("assets/eleve.js")
adminhtml=get("admin.html")
studenthtml=get("eleve.html")
workflow=get(".github/workflows/physix-quality.yml")
for key in ("physix_chapter_qcm","physix_chapter_qcm_attempts",
            "correct_option smallint","published boolean not null default false",
            "enable row level security","private.physix_is_owner",
            "physix_student_chapter_qcm","physix_student_answer_qcm",
            "private.physix_verified_profile","unique(question_id,pupil_id)",
            "on conflict(question_id,pupil_id) do nothing"):
    assert key in schema,key
listing=schema.split("create function public.physix_student_chapter_qcm()",1)[1].split(
    "revoke all on function public.physix_student_chapter_qcm()",1)[0]
assert "q.correct_option" not in listing
assert "jsonb_build_array(q.option_a,q.option_b,q.option_c,q.option_d)" in listing
assert "case when a.id is not null then q.explanation" in listing
assert "and ch.state='published'" in schema
assert "from public.physix_activity_events" not in schema
assert "insert into public.physix_activity_events" not in schema
for required in ("crypto.getRandomValues","secureIndex","wheel-norepeat","wheel-spin",
                 'rest("pupils"',"rotate(","Prêt pour le tirage","target.full_name"):
    assert required in wheel,required
for required in ("rest(\"chapter_qcm\"","chapter_id","class_code","correct_option",
                "published:false","chapter_qcm_attempts","data-publish","data-delete"):
    assert required in teacher,required
for required in ("physix_student_chapter_qcm","physix_student_submit_chapter_qcm",
                 "physix_student_review_chapter_qcm","p_answers","p_chapter",
                 "chapter_title","options","is_correct","correct_option","student-qcm-final"):
    assert required in student,required
for forbidden in ("teacher_correction","service_role","sb_secret_",
                  "localStorage","sessionStorage"):
    assert forbidden not in student,forbidden
assert "window.physixClassWheel?.(" in main
assert "window.physixTeacherQcm?.(" in main
assert 'id="open-wheel"' in main and 'id="open-qcm"' in main
assert 'src="/assets/admin-wheel.js"' in adminhtml
assert 'src="/assets/admin-qcm.js"' in adminhtml
assert 'src="/assets/eleve-qcm.js"' in studenthtml
assert "window.physixStudentQcm?.render" in eleve
assert "window.physixStudentQcm?.clear" in eleve
for p in ("assets/admin-wheel.js","assets/admin-qcm.js","assets/eleve-qcm.js"):
    assert "node --check "+p in workflow
assert "python3 tests/check_chapter_qcm_wheel.py" in workflow
print("OK — random teacher wheel and chapter QCM without public answer keys or automated grades.")
