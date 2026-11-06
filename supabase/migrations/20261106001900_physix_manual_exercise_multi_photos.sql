-- Manual-only homework photo submission: optional teacher answer key + multiple pages.
begin;
alter table public.physix_ai_exercises alter column teacher_correction set default '';
alter table public.physix_ai_exercises drop constraint if exists physix_ai_exercises_teacher_correction_check;
alter table public.physix_ai_exercises add constraint physix_teacher_reference_optional
 check(length(teacher_correction)<=12000);
create table public.physix_submission_pages(
 id uuid primary key default gen_random_uuid(),
 submission_id uuid not null references public.physix_ai_submissions(id) on delete cascade,
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 exercise_id uuid not null references public.physix_ai_exercises(id) on delete cascade,
 page_number smallint not null check(page_number between 1 and 4),
 storage_path text not null unique,
 sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
 mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp')),
 bytes_size integer not null check(bytes_size between 1024 and 5242880),
 unique(submission_id,page_number),
 unique(owner_id,exercise_id,sha256)
);
create index physix_submission_pages_submission_idx on public.physix_submission_pages(submission_id,page_number);
alter table public.physix_submission_pages enable row level security;
revoke all on public.physix_submission_pages from anon,authenticated;
grant select on public.physix_submission_pages to authenticated;
create policy physix_submission_pages_teacher_read on public.physix_submission_pages for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));

-- Preserve previously uploaded one-page work when adopting the new page model.
insert into public.physix_submission_pages(submission_id,owner_id,exercise_id,page_number,storage_path,sha256,mime_type,bytes_size)
select s.id,s.owner_id,s.exercise_id,1,s.storage_path,s.sha256,s.mime_type,s.bytes_size
from public.physix_ai_submissions s
on conflict do nothing;

-- Protect against a forged relation between an uploaded page and a submission belonging to a different pupil/exercise.
create function private.physix_guard_submission_page()
returns trigger language plpgsql set search_path='' as $$
declare s public.physix_ai_submissions%rowtype;
begin
 select * into s from public.physix_ai_submissions where id=new.submission_id;
 if not found or s.owner_id<>new.owner_id or s.exercise_id<>new.exercise_id then
  raise exception 'La page ne correspond pas à cet exercice';
 end if;
 return new;
end;$$;
create trigger physix_guard_submission_page_trg
 before insert or update on public.physix_submission_pages
 for each row execute function private.physix_guard_submission_page();

-- Teacher must have reviewed every uploaded image before counting it in Suivi.
create or replace function public.physix_ai_review_submission(p_submission uuid,p_accepted boolean,p_feedback text default '')
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare s public.physix_ai_submissions%rowtype;ex public.physix_ai_exercises%rowtype;
begin
 if not (select private.physix_is_owner(auth.uid())) then raise exception 'Accès refusé';end if;
 if length(coalesce(p_feedback,''))>400 then raise exception 'Avis trop long';end if;
 select * into s from public.physix_ai_submissions where id=p_submission and owner_id=(select auth.uid()) for update;
 if not found then raise exception 'Copie introuvable';end if;
 select * into ex from public.physix_ai_exercises where id=s.exercise_id and owner_id=s.owner_id;
 if not found then raise exception 'Exercice introuvable';end if;
 if s.review_status<>'pending' then raise exception 'Copie déjà vérifiée';end if;
 if not exists(select 1 from public.physix_submission_pages where submission_id=s.id) then
  raise exception 'La copie ne contient pas de photo';
 end if;
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
commit;