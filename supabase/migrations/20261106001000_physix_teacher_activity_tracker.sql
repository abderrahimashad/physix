-- PhysiX: suivi pédagogique individuel, strictement privé au professeur.
-- Pas de calcul automatique de la note officielle, pas d'accès élève ni anonyme.
begin;
create table if not exists public.physix_pupils (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 class_code text not null,
 full_name text not null check(length(btrim(full_name)) between 2 and 120),
 roster_number integer check(roster_number between 1 and 500),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(owner_id,id),
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code) on delete restrict
);
create index if not exists physix_pupils_class on public.physix_pupils(owner_id,class_code,full_name);

create table if not exists public.physix_activity_events (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 pupil_id uuid not null,
 class_code text not null,
 semester smallint not null check(semester in (1,2)),
 kind text not null check(kind in ('participation','exercise','homework','expose','notebook','materials','disturbance','absence','late','positive','note')),
 occurred_on date not null default current_date,
 details text not null default '' check(length(details)<=300),
 created_at timestamptz not null default now(),
 unique(owner_id,id),
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id) on delete restrict,
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code) on delete restrict
);
create index if not exists physix_activity_by_pupil on public.physix_activity_events(owner_id,pupil_id,semester,occurred_on desc);

create table if not exists public.physix_activity_grades (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 pupil_id uuid not null,
 semester smallint not null check(semester in (1,2)),
 grade numeric(4,2) check(grade between 0 and 20),
 comment text not null default '' check(length(comment)<=400),
 updated_at timestamptz not null default now(),
 unique(owner_id,pupil_id,semester),
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id) on delete restrict
);
create index if not exists physix_activity_grade_owner on public.physix_activity_grades(owner_id,pupil_id);

create or replace function private.physix_guard_activity_event()
returns trigger language plpgsql security invoker set search_path='' as $$
declare p record;
begin
 select owner_id,class_code,active into p from public.physix_pupils
 where id=new.pupil_id and owner_id=new.owner_id;
 if not found or p.class_code is distinct from new.class_code or not p.active then
  raise exception 'Élève absent, inactif ou d’une autre classe';
 end if;
 if new.occurred_on > current_date + 1 then raise exception 'Date future invalide'; end if;
 return new;
end;$$;
drop trigger if exists physix_activity_guard on public.physix_activity_events;
create trigger physix_activity_guard before insert or update of owner_id,pupil_id,class_code,occurred_on
on public.physix_activity_events for each row execute function private.physix_guard_activity_event();

-- Mise à jour de l'horodatage de la note saisie par l'enseignant.
create or replace function private.physix_touch_activity_grade()
returns trigger language plpgsql set search_path='' as $$
begin new.updated_at=now();return new;end;$$;
drop trigger if exists physix_grade_touch on public.physix_activity_grades;
create trigger physix_grade_touch before update on public.physix_activity_grades
for each row execute function private.physix_touch_activity_grade();

alter table public.physix_pupils enable row level security;
alter table public.physix_activity_events enable row level security;
alter table public.physix_activity_grades enable row level security;
revoke all on public.physix_pupils,public.physix_activity_events,public.physix_activity_grades from anon,authenticated;
grant select,insert,update,delete on public.physix_pupils,public.physix_activity_events,public.physix_activity_grades to authenticated;
drop policy if exists physix_pupils_owner on public.physix_pupils;
create policy physix_pupils_owner on public.physix_pupils for all to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
 with check(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
drop policy if exists physix_activity_events_owner on public.physix_activity_events;
create policy physix_activity_events_owner on public.physix_activity_events for all to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
 with check(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
drop policy if exists physix_activity_grades_owner on public.physix_activity_grades;
create policy physix_activity_grades_owner on public.physix_activity_grades for all to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
 with check(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
commit;