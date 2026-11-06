-- Owner-only website notifications for new manual exercise submissions.
begin;
create function public.physix_teacher_pending_copies()
returns table(submission_id uuid,pupil_name text,class_code text,exercise_title text,submitted_at timestamptz,total_pending bigint)
language sql stable security definer set search_path='' as $$
 select s.id,p.full_name,ex.class_code,ex.title,s.created_at,count(*) over()
 from public.physix_ai_submissions s
 join public.physix_ai_exercises ex on ex.id=s.exercise_id and ex.owner_id=s.owner_id
 join public.physix_pupils p on p.id=s.pupil_id and p.owner_id=s.owner_id
 where s.owner_id=(select auth.uid())
 and (select private.physix_is_owner(auth.uid())) and s.review_status='pending'
 order by s.created_at desc limit 50;
$$;
revoke all on function public.physix_teacher_pending_copies() from public,anon;
grant execute on function public.physix_teacher_pending_copies() to authenticated;
commit;