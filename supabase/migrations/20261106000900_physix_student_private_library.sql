begin;
alter table public.physix_resource_files
 add constraint physix_file_owner_id_unique unique(owner_id,id);
create table if not exists public.physix_student_access(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 email text not null check(email=lower(btrim(email)) and length(email) between 5 and 254 and position('@' in email)>1),
 class_code text not null,
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 unique(owner_id,email,class_code),
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code)
);
create table if not exists public.physix_student_publications(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 file_id uuid not null,
 class_code text not null,
 storage_path text not null check(length(storage_path) between 1 and 512),
 enabled boolean not null default true,
 created_at timestamptz not null default now(),
 unique(file_id,class_code),
 foreign key(owner_id,file_id) references public.physix_resource_files(owner_id,id) on delete cascade,
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code)
);
create index if not exists physix_students_email on public.physix_student_access(email) where enabled;
create index if not exists physix_pub_path on public.physix_student_publications(storage_path) where enabled;
alter table public.physix_student_access enable row level security;
alter table public.physix_student_publications enable row level security;
revoke all on public.physix_student_access,public.physix_student_publications from anon,authenticated;
grant select,insert,update,delete on public.physix_student_access,public.physix_student_publications to authenticated;
create policy physix_students_owner on public.physix_student_access for all to authenticated
 using (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
 with check (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
create policy physix_publications_owner on public.physix_student_publications for all to authenticated
 using (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
 with check (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
create or replace function private.physix_guard_publication()
returns trigger language plpgsql security invoker set search_path='' as $$
declare f record; r record; d record;
begin
 if not exists(select 1 from public.physix_classes c where c.owner_id=new.owner_id and c.code=new.class_code and c.active)
  then raise exception 'Classe absente ou inactive'; end if;
 select * into f from public.physix_resource_files where owner_id=new.owner_id and id=new.file_id;
 if not found then raise exception 'PDF absent'; end if;
 if f.resource_id is not null then
  select * into r from public.physix_resources where id=f.resource_id and owner_id=new.owner_id;
  if not found or not(new.class_code=any(r.target_classes)) then raise exception 'Mauvaise classe'; end if;
 else
  select * into d from public.physix_devoirs where id=f.devoir_id and owner_id=new.owner_id;
  if not found or d.target_class is distinct from new.class_code then raise exception 'Mauvaise classe du devoir'; end if;
 end if;
 if f.storage_provider='supabase' then
  if new.storage_path<>f.storage_path then raise exception 'Chemin PDF invalide'; end if;
 elsif f.storage_provider='google_drive' then
  if new.storage_path not like (new.owner_id::text||'/'||(case when f.resource_id is not null
   then 'resource/'||f.resource_id::text else 'devoir/'||f.devoir_id::text end)||'/%')
   then raise exception 'Copie Drive privée requise'; end if;
 end if;
 return new;
end;$$;
create trigger physix_publication_guard before insert or update of owner_id,file_id,class_code,storage_path
on public.physix_student_publications for each row execute function private.physix_guard_publication();

create or replace function private.physix_student_can_see_publication(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.physix_student_publications p
  join public.physix_student_access a on a.owner_id=p.owner_id and a.class_code=p.class_code and a.enabled
  join auth.users u on u.id=(select auth.uid()) and u.email_confirmed_at is not null and lower(u.email)=a.email
  join public.physix_classes c on c.owner_id=p.owner_id and c.code=p.class_code and c.active
  join public.physix_resource_files f on f.id=p.file_id and f.owner_id=p.owner_id
  left join public.physix_resources r on r.id=f.resource_id and r.owner_id=p.owner_id
  left join public.physix_chapters h on h.id=r.chapter_id and h.owner_id=p.owner_id
  left join public.physix_devoirs d on d.id=f.devoir_id and d.owner_id=p.owner_id
  where p.id=p_id and p.enabled
  and ((f.resource_id is not null and r.state='published' and h.state='published'
     and p.class_code=any(r.target_classes))
   or (f.devoir_id is not null and d.state='published'
     and d.target_class=p.class_code
     and (f.file_role<>'correction' or d.correction_state='authorized')))
 );
$$;
revoke all on function private.physix_student_can_see_publication(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.physix_student_can_see_publication(uuid) to authenticated;
create policy physix_publications_student_read on public.physix_student_publications
 for select to authenticated using(private.physix_student_can_see_publication(id));
create policy physix_pdf_student_published_read on storage.objects
 for select to authenticated using(bucket_id='physix-private'
 and storage.allow_any_operation(array['object.get_authenticated','object.get_authenticated_info'])
 and exists(select 1 from public.physix_student_publications p where
   p.storage_path=storage.objects.name and private.physix_student_can_see_publication(p.id)));

create or replace function public.physix_my_student_library()
returns table (publication_id uuid,class_code text,title text,category text,
 chapter_title text,subject text,semester smallint,devoir_number integer,
 file_role text,filename text,storage_path text)
language sql stable security definer set search_path='' as $$
 select p.id,p.class_code,coalesce(r.title,d.title),coalesce(r.kind,'Devoir surveillé'),
  h.title,coalesce(h.subject,d.subject),coalesce(h.semester,d.semester),
  d.devoir_number,f.file_role,f.filename,p.storage_path
 from public.physix_student_publications p
 join public.physix_resource_files f on f.id=p.file_id and f.owner_id=p.owner_id
 left join public.physix_resources r on r.id=f.resource_id and r.owner_id=p.owner_id
 left join public.physix_chapters h on h.id=r.chapter_id and h.owner_id=p.owner_id
 left join public.physix_devoirs d on d.id=f.devoir_id and d.owner_id=p.owner_id
 where private.physix_student_can_see_publication(p.id)
 order by p.class_code,h.sort_order nulls last,h.title nulls last,d.semester,d.devoir_number;
$$;
revoke all on function public.physix_my_student_library() from public,anon;
grant execute on function public.physix_my_student_library() to authenticated;
commit;