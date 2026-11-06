#!/usr/bin/env python3
"""Check enrolled pupil scope, no grade leakage and private portrait onboarding."""
from pathlib import Path
root=Path(__file__).resolve().parents[1]
m1=(root/"supabase/migrations/20261106001200_physix_activation_password_private_portraits.sql").read_text()
m2=(root/"supabase/migrations/20261106001300_physix_activated_student_secure_views.sql").read_text()
mphoto=(root/"supabase/migrations/20261106001400_physix_enforce_uploaded_private_portrait.sql").read_text()
m0=(root/"supabase/migrations/20261106001100_physix_student_progress_class_board.sql").read_text()
student=(root/"assets/eleve.js").read_text()
teacher=(root/"assets/admin-tracking.js").read_text()
board=(root/"assets/admin-pedagogy.js").read_text()
html=(root/"eleve.html").read_text()
admin=(root/"assets/admin-content.js").read_text()
workflow=(root/".github/workflows/physix-quality.yml").read_text()
for term in ("physix_activation_codes","code_hash","sha256","redeemed_at",
             "14 days","physix_issue_activation","physix_activate_pupil",
             "physix_student_profiles","physix-avatars","public=false",
             "auth_user_id","email_confirmed_at","phone_confirmed_at"):
    assert term in m1,term
for term in ("physix_verified_profile","physix_student_my_progress",
             "physix_student_my_class_board","physix_student_can_see_publication"):
    assert term in m2,term
assert "avatar_path is not null" in m1
assert "physix_guard_profile_portrait" in mphoto
assert "storage.objects" in mphoto and "image/jpeg" in mphoto
assert "from public.physix_activity_grades" not in m2.lower()
assert "private.physix_is_owner" in m1
for term in ("physix_pupil_links","physix_pupil_objectives","physix_class_announcements","physix_class_work"):
    assert term in m0
for term in ("signup-activation-code","signup-channel","verify-otp","activation-form","photo-form","login-password","change-photo"):
    assert 'id="'+term+'"' in html,term
for term in ("grant_type=password","auth/v1/otp","auth/v1/verify",
             "auth/v1/user","physix_activate_pupil","physix-avatars",
             "file.size>2097152","screen(\"photo\")"):
    assert term in student,term
for term in ("physix_issue_activation","Code d’activation","track-avatar"):
    assert term in teacher,term
for term in ("class_work","class_announcements","pupil_objectives","pupil_links"):
    assert term in admin,term
for term in ("data-toggle","data-goal-visible","data-goal-status","data-unlink"):
    assert term in board,term
for forbidden in ("localStorage","sessionStorage","service_role","sb_secret_","client_secret","/object/public/"):
    assert forbidden not in student and forbidden not in teacher,forbidden
assert "node --check assets/admin-pedagogy.js" in workflow
assert "node --check assets/eleve-progress.js" in workflow
print("OK — private student activation, mandatory portrait and safe personal view contract.")
