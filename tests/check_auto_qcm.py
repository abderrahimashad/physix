#!/usr/bin/env python3
"""15 cours + 4 applications, free-tier Gemini only on teacher PDF import, final-only student correction."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
get=lambda p:(root/p).read_text(encoding="utf-8")
generator=get("supabase/functions/physix-qcm-gemini/index.ts")
teacher=get("assets/admin-qcm.js")
pdf=get("assets/admin-simple.js")
student=get("assets/eleve-qcm.js")
batch=get("supabase/migrations/20261106002300_physix_qcm_final_submit_only.sql")
quotas=get("supabase/migrations/20261106002400_physix_gemini_qcm_teacher_quota.sql")
types=get("supabase/migrations/20261106002500_physix_qcm_15_cours_4_applications.sql")
review=get("supabase/migrations/20261106002600_physix_qcm_review_only_after_finish.sql")
class_guard=get("supabase/migrations/20261106002700_physix_qcm_chapter_class_consistency.sql")
freeze=get("supabase/migrations/20261106002900_physix_qcm_started_trigger_safe_insert_delete.sql")
ci=get(".github/workflows/physix-quality.yml")
for s in ("GEMINI_API_KEY","const MODEL=\"gemini-3-flash-preview\"",
 "pdf instanceof File","application/pdf","generateContent","responseMimeType:\"application/json\"",
 "questions.length!==19","i<15?\"cours\":\"application\"","question_type:expected",
 "published:false","physix_qcm_claim_generation","client.auth.getUser(jwt)",
 "GEMINI_KEY","Quota gratuit Gemini","created:19,cours:15,applications:4"):
    assert s in generator,s
assert "OPENAI_API_KEY" not in generator
assert "SUPABASE_SERVICE_ROLE_KEY" not in generator
assert "http://localhost" not in generator
assert "x-goog-api-key" in generator
assert "getUser(jwt)" in generator
assert "new FormData()" in teacher
assert 'physixQcmGenerateFromPdf' in teacher and 'GEMINI_API_KEY' not in teacher
assert "physixQcmGenerateFromPdf" in pdf
assert '["Cours","Résumé"].includes(kind)' in pdf
assert "createdFile=true" in pdf and "await refresh()" in pdf
for s in ("qcm-owner-publish-all","questions.length!==19",
 "question_type===\"cours\"","question_type===\"application\"",
 "data-edit","chapter.state=\"published\""):
    assert s in teacher,s
for s in ("physix_student_submit_chapter_qcm","physix_student_review_chapter_qcm",
 "Terminer le QCM et voir mon corrigé","Bonne réponse :","Réponse incorrecte",
 "p_answers","currentQuiz()"):
    assert s in student,s
assert "physix_student_answer_qcm" not in student
assert 'revoke all on function public.physix_student_answer_qcm(uuid,smallint) from authenticated' in batch
assert "pg_advisory_xact_lock" in batch
assert "if v_submitted<>v_count" in batch
assert "if v_answered<>v_count" in review or "v_answered<>v_count" in review
assert "question_type in ('cours','application')" in types
assert "c.target_class is distinct from new.class_code" in class_guard
assert "physix_lock_started_chapter_quiz" in freeze and "tg_op='INSERT'" in freeze
assert "chapter.target_class!==classCode" in generator
assert "physix_qcm_claim_generation" in quotas
assert ">=10" in quotas
for src in (teacher,pdf,student):
    assert "GEMINI_API_KEY" not in src
assert "python3 tests/check_auto_qcm.py" in ci
print("OK — 19 teacher-generated PDF QCM, private answers, final-only correction, no per-pupil Gemini calls.")
