-- Teacher-owned exercises with private answer key, student-safe listing, bounded AI attempts.
begin;
create table public.physix_ai_exercises(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 class_code text not null,
 title text not null check(length(btrim(title)) between 3 and 160),
 subject text not null check(subject in ('Physique','Chimie')),
 chapter text not null default '' check(length(chapter)<=160),
 statement text not null check(length(btrim(statement)) between 20 and 12000),
 teacher_correction text not null check(length(btrim(teacher_correction)) between 10 and 12000),
 teacher_guidance text not null default '' check(length(teacher_guidance)<=1200),
 semester smallint not null check(semester in (1,2)),
 published boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code)
);
create index physix_ai_exercises_class_idx on public.physix_ai_exercises(owner_id,class_code,semester,published);
alter table public.physix_ai_exercises enable row level security;
revoke all on public.physix_ai_exercises from anon,authenticated;
grant select,insert,update,delete on public.physix_ai_exercises to authenticated;
create policy physix_ai_exercises_teacher on public.physix_ai_exercises for all to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
 with check(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
create table public.physix_ai_attempts(
 id bigint generated always as identity primary key,
 auth_user_id uuid not null references auth.users(id) on delete cascade,
 exercise_id uuid not null references public.physix_ai_exercises(id) on delete cascade,
 created_at timestamptz not null default now()
);
create index physix_ai_attempts_limit_idx on public.physix_ai_attempts(auth_user_id,created_at desc);
alter table public.physix_ai_attempts enable row level security;
revoke all on public.physix_ai_attempts from anon,authenticated;

-- Only a verified activated account with mandatory private portrait can list exercises.
-- The teacher's answer key is NEVER returned by this RPC.
create function public.physix_ai_my_exercises()
returns table(id uuid,title text,subject text,chapter text,statement text,semester smallint,class_code text)
language sql stable security definer set search_path='' as $$
 select ex.id,ex.title,ex.subject,ex.chapter,ex.statement,ex.semester,ex.class_code
 from public.physix_ai_exercises ex
 join public.physix_pupil_links l on l.owner_id=ex.owner_id
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id and p.class_code=ex.class_code
 where ex.published and private.physix_verified_profile(l.owner_id,l.pupil_id)
 order by ex.semester,ex.subject,ex.title;
$$;
revoke all on function public.physix_ai_my_exercises() from public,anon;
grant execute on function public.physix_ai_my_exercises() to authenticated;

-- Atomic quota check in the database. Do not show answer key, do not accept identities from browser.
create function public.physix_ai_claim_attempt(p_exercise uuid)
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare uid uuid;eligible boolean;
begin
 uid=(select auth.uid());
 if uid is null then return false;end if;
 select exists(
  select 1 from public.physix_ai_exercises ex
  join public.physix_pupil_links l on l.owner_id=ex.owner_id
  join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id and p.class_code=ex.class_code
  where ex.id=p_exercise and ex.published and private.physix_verified_profile(l.owner_id,l.pupil_id)
 ) into eligible;
 if not eligible then return false;end if;
 -- Serialize requests for same student to make limits effective under concurrent calls.
 perform pg_advisory_xact_lock(hashtextextended(uid::text,0));
 if (select count(*) from public.physix_ai_attempts
     where auth_user_id=uid and created_at>now()-interval '1 minute')>=2
  or (select count(*) from public.physix_ai_attempts
     where auth_user_id=uid and created_at>now()-interval '1 hour')>=12
  or (select count(*) from public.physix_ai_attempts
     where auth_user_id=uid and created_at>now()-interval '1 day')>=30
 then raise exception 'Limite de questions atteinte. Réessayez plus tard.' using errcode='P0001';end if;
 insert into public.physix_ai_attempts(auth_user_id,exercise_id) values(uid,p_exercise);
 return true;
end;$$;
revoke all on function public.physix_ai_claim_attempt(uuid) from public,anon;
grant execute on function public.physix_ai_claim_attempt(uuid) to authenticated;
commit;