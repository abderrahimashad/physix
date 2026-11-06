begin;
alter table public.physix_student_access add constraint physix_student_access_owner_id_uq unique(owner_id,id);
create table public.physix_pupil_links (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 pupil_id uuid not null,access_id uuid not null, created_at timestamptz not null default now(),
 unique(owner_id,pupil_id),unique(owner_id,access_id),
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id) on delete cascade,
 foreign key(owner_id,access_id) references public.physix_student_access(owner_id,id) on delete cascade);
create function private.physix_check_pupil_link() returns trigger language plpgsql security invoker set search_path='' as $$
declare pc text;ac text;
begin
 select class_code into pc from public.physix_pupils where owner_id=new.owner_id and id=new.pupil_id and active;
 select class_code into ac from public.physix_student_access where owner_id=new.owner_id and id=new.access_id and enabled;
 if pc is null or ac is null or pc<>ac then raise exception 'Le compte et le profil élève doivent appartenir à la même classe';end if;
 return new;
end $$;
create trigger physix_link_guard before insert or update of owner_id,pupil_id,access_id on public.physix_pupil_links
 for each row execute function private.physix_check_pupil_link();
create table public.physix_class_work (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 class_code text not null,title text not null check(length(btrim(title)) between 3 and 160),
 instructions text not null default '' check(length(instructions)<=1500),due_on date,
 semester smallint not null check(semester in (1,2)),published boolean not null default false,
 created_at timestamptz not null default now(),
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code) on delete restrict);
create index physix_work_class_idx on public.physix_class_work(owner_id,class_code,semester);
create table public.physix_class_announcements (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 class_code text not null,title text not null check(length(btrim(title)) between 3 and 160),
 message text not null check(length(btrim(message)) between 3 and 1500),
 published boolean not null default false,created_at timestamptz not null default now(),
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code) on delete restrict);
create index physix_announcements_class_idx on public.physix_class_announcements(owner_id,class_code,created_at desc);
create table public.physix_pupil_objectives (
 id uuid primary key default gen_random_uuid(),owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 pupil_id uuid not null,semester smallint not null check(semester in (1,2)),
 title text not null check(length(btrim(title)) between 3 and 180),
 status text not null default 'in_progress' check(status in ('in_progress','achieved')),
 visible boolean not null default false,created_at timestamptz not null default now(),
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id) on delete cascade);
create index physix_objectives_pupil_idx on public.physix_pupil_objectives(owner_id,pupil_id,semester);
do $$
declare t text;
begin
 foreach t in array array['physix_pupil_links','physix_class_work','physix_class_announcements','physix_pupil_objectives'] loop
 execute format('alter table public.%I enable row level security',t);
 execute format('revoke all on public.%I from anon,authenticated',t);
 execute format('grant select,insert,update,delete on public.%I to authenticated',t);
 execute format('create policy %I on public.%I for all to authenticated using (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid()))) with check (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))',t||'_owner',t);
 end loop;
end $$;
create function public.physix_student_my_progress() returns jsonb
 language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'pupil_id',p.id,'full_name',p.full_name,'class_code',p.class_code,
 'semesters',(
   select jsonb_agg(jsonb_build_object(
     'semester',s.n,
     'participation',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='participation'),
     'exercises',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='exercise'),
     'homework',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='homework'),
     'exposes',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='expose'),
     'efforts',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='positive')
   ) order by s.n) from (values (1),(2)) s(n)
 ),
 'objectives',(
   select coalesce(jsonb_agg(jsonb_build_object('id',g.id,'title',g.title,'semester',g.semester,'status',g.status)
    order by g.created_at),'[]'::jsonb) from public.physix_pupil_objectives g
   where g.owner_id=p.owner_id and g.pupil_id=p.id and g.visible)
 ) order by p.full_name),'[]'::jsonb)
 from public.physix_pupil_links l
 join public.physix_pupils p on p.id=l.pupil_id and p.owner_id=l.owner_id and p.active
 join public.physix_student_access a on a.id=l.access_id and a.owner_id=l.owner_id and a.enabled and a.class_code=p.class_code
 join public.physix_classes c on c.owner_id=p.owner_id and c.code=p.class_code and c.active
 join auth.users u on u.id=(select auth.uid()) and u.email_confirmed_at is not null and lower(u.email)=a.email;
$$;
create function public.physix_student_my_class_board() returns jsonb
 language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'class_code',a.class_code,
 'work',(select coalesce(jsonb_agg(jsonb_build_object('id',w.id,'title',w.title,'instructions',w.instructions,
 'due_on',w.due_on,'semester',w.semester) order by w.due_on nulls last,w.created_at desc),'[]'::jsonb)
 from public.physix_class_work w where w.owner_id=a.owner_id and w.class_code=a.class_code and w.published),
 'announcements',(select coalesce(jsonb_agg(jsonb_build_object('id',n.id,'title',n.title,'message',n.message,
 'created_at',n.created_at) order by n.created_at desc),'[]'::jsonb)
 from public.physix_class_announcements n where n.owner_id=a.owner_id and n.class_code=a.class_code and n.published)
 ) order by a.class_code),'[]'::jsonb)
 from public.physix_student_access a
 join public.physix_classes c on c.owner_id=a.owner_id and c.code=a.class_code and c.active
 join auth.users u on u.id=(select auth.uid()) and u.email_confirmed_at is not null and lower(u.email)=a.email
 where a.enabled;
$$;
revoke all on function public.physix_student_my_progress() from public,anon;
revoke all on function public.physix_student_my_class_board() from public,anon;
grant execute on function public.physix_student_my_progress() to authenticated;
grant execute on function public.physix_student_my_class_board() to authenticated;
commit;