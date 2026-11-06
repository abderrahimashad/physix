-- PhysiX: single private handwritten-solution submission, teacher-approved activity credit.
begin;
create table public.physix_ai_submissions(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 exercise_id uuid not null references public.physix_ai_exercises(id) on delete cascade,
 pupil_id uuid not null,
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 storage_path text not null unique check(length(storage_path) between 30 and 500),
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 bytes_size integer not null check(bytes_size between 1024 and 5242880),
 review_status text not null default 'pending' check(review_status in ('pending','accepted','rejected')),
 teacher_feedback text not null default '' check(length(teacher_feedback)<=400),
 created_at timestamptz not null default now(),
 reviewed_at timestamptz,
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id),
 unique(exercise_id,pupil_id),
 unique(owner_id,exercise_id,sha256)
);
create index physix_ai_submissions_owner_idx on public.physix_ai_submissions(owner_id,created_at desc);
alter table public.physix_ai_submissions enable row level security;
revoke all on public.physix_ai_submissions from anon,authenticated;
grant select on public.physix_ai_submissions to authenticated;
create policy physix_ai_submission_teacher_read on public.physix_ai_submissions for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
-- Student may read ONLY own status, NEVER storage_path or hashes.
create function public.physix_ai_my_submission_status()
returns table(exercise_id uuid,status text,teacher_feedback text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select s.exercise_id,s.review_status,
 case when s.review_status='rejected' then s.teacher_feedback else '' end,s.created_at
 from public.physix_ai_submissions s
 join public.physix_pupil_links l on l.owner_id=s.owner_id and l.pupil_id=s.pupil_id
 where s.auth_user_id=(select auth.uid()) and l.auth_user_id=(select auth.uid())
 and private.physix_verified_profile(l.owner_id,l.pupil_id);
$$;
revoke all on function public.physix_ai_my_submission_status() from public,anon;
grant execute on function public.physix_ai_my_submission_status() to authenticated;

-- Student identity and class checked server-side. Endpoint may call this as student.
create function public.physix_ai_upload_context(p_exercise uuid)
returns table(owner_id uuid,pupil_id uuid)
language sql stable security definer set search_path='' as $$
 select x.owner_id,p.id
 from public.physix_ai_exercises x
 join public.physix_pupil_links l on l.owner_id=x.owner_id
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id and p.class_code=x.class_code
 where x.id=p_exercise and x.published
 and private.physix_verified_profile(l.owner_id,l.pupil_id);
$$;
revoke all on function public.physix_ai_upload_context(uuid) from public,anon;
grant execute on function public.physix_ai_upload_context(uuid) to authenticated;

-- Credits to Suivi are issued by teacher review only; official /20 remains manual.
alter table public.physix_activity_events
 add column ai_submission_id uuid unique references public.physix_ai_submissions(id) on delete set null;
create or replace function public.physix_ai_review_submission(p_submission uuid,p_accepted boolean,p_feedback text default '')
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare s public.physix_ai_submissions%rowtype; ex public.physix_ai_exercises%rowtype;
begin
 if not (select private.physix_is_owner(auth.uid())) then raise exception 'Accès refusé';end if;
 if length(coalesce(p_feedback,''))>400 then raise exception 'Avis trop long';end if;
 select * into s from public.physix_ai_submissions where id=p_submission and owner_id=(select auth.uid()) for update;
 if not found then raise exception 'Copie introuvable';end if;
 select * into ex from public.physix_ai_exercises where id=s.exercise_id and owner_id=s.owner_id;
 if not found then raise exception 'Exercice introuvable';end if;
 if s.review_status<>'pending' then raise exception 'Copie déjà vérifiée';end if;
 update public.physix_ai_submissions set review_status=case when p_accepted then 'accepted' else 'rejected' end,
  teacher_feedback=coalesce(p_feedback,''),reviewed_at=now() where id=s.id;
 if p_accepted then
  insert into public.physix_activity_events(owner_id,pupil_id,class_code,semester,kind,occurred_on,details,ai_submission_id)
  values(s.owner_id,s.pupil_id,ex.class_code,ex.semester,'exercise',current_date,'Exercice remis et validé par le professeur',s.id);
 end if;
 return true;
end;$$;
revoke all on function public.physix_ai_review_submission(uuid,boolean,text) from public,anon;
grant execute on function public.physix_ai_review_submission(uuid,boolean,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('physix-solutions','physix-solutions',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=5242880,
 allowed_mime_types=array['image/jpeg','image/png','image/webp'];
-- No student direct write / public read / direct download. Edge function only.
commit;