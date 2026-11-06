-- Exact same solution photo cannot be credited again to the same teacher,
-- even if a pupil tries submitting it to a different exercise.
begin;
alter table public.physix_submission_pages
 add constraint physix_submission_pages_owner_hash_unique unique(owner_id,sha256);
alter table public.physix_ai_submissions
 add constraint physix_ai_submissions_owner_hash_unique unique(owner_id,sha256);
commit;