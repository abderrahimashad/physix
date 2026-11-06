-- PhysiX enrolment: one-use teacher activation + verified email or SMS + password + private portrait.
begin;
alter table public.physix_pupil_links alter column access_id drop not null;
alter table public.physix_pupil_links add column auth_user_id uuid references auth.users(id) on delete set null;
create unique index physix_pupil_links_auth_uid_unique on public.physix_pupil_links(auth_user_id)
 where auth_user_id is not null;
-- Support both old teacher invitation links and new activation, only one account per pupil.
create or replace function private.physix_check_pupil_link()
returns trigger language plpgsql security invoker set search_path='' as $$
declare pc text;ac text;
begin
 select class_code into pc from public.physix_pupils where id=new.pupil_id and owner_id=new.owner_id and active;
 if pc is null then raise exception 'Élève absent ou inactif'; end if;
 if new.access_id is not null then
   select class_code into ac from public.physix_student_access
    where id=new.access_id and owner_id=new.owner_id and enabled;
   if ac is null or ac<>pc then raise exception 'Invitation et classe incompatibles'; end if;
 end if;
 if new.access_id is null and new.auth_user_id is null then raise exception 'Association sans identité interdite'; end if;
 return new;
end;$$;

create table public.physix_activation_codes(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 pupil_id uuid not null,
 code_hash text not null unique,
 expires_at timestamptz not null default (now()+interval '14 days'),
 redeemed_at timestamptz,
 created_at timestamptz not null default now(),
 unique(owner_id,pupil_id),
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id) on delete cascade
);
alter table public.physix_activation_codes enable row level security;
revoke all on public.physix_activation_codes from anon,authenticated;
-- Code material is never exposed by a table SELECT, even to students.
create or replace function public.physix_issue_activation(p_pupil_id uuid)
returns text language plpgsql volatile security definer set search_path='' as $$
declare v_owner uuid;new_code text;
begin
 if not (select private.physix_is_owner(auth.uid())) then raise exception 'Accès refusé'; end if;
 select owner_id into v_owner from public.physix_pupils where id=p_pupil_id
  and owner_id=(select auth.uid()) and active;
 if not found then raise exception 'Élève non trouvé'; end if;
 new_code=upper(encode(extensions.gen_random_bytes(12),'hex'));
 insert into public.physix_activation_codes(owner_id,pupil_id,code_hash,expires_at,redeemed_at)
 values(v_owner,p_pupil_id,encode(extensions.digest(new_code,'sha256'),'hex'),now()+interval '14 days',null)
 on conflict(owner_id,pupil_id) do update set code_hash=excluded.code_hash,
  expires_at=excluded.expires_at,redeemed_at=null,created_at=now();
 return new_code;
end;$$;
revoke all on function public.physix_issue_activation(uuid) from public,anon;
grant execute on function public.physix_issue_activation(uuid) to authenticated;

create table public.physix_student_profiles(
 auth_user_id uuid primary key references auth.users(id) on delete cascade,
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 pupil_id uuid not null,
 class_code text not null,
 display_name text not null check(length(btrim(display_name)) between 2 and 120),
 phone text check(phone is null or phone ~ '^\+[1-9][0-9]{7,14}$'),
 avatar_path text check(avatar_path is null or avatar_path ~ ('^'||auth_user_id::text||'/[A-Za-z0-9_-]{5,48}\.(jpg|png|webp)$')),
 created_at timestamptz not null default now(),
 updated_at timestamptz not null default now(),
 unique(owner_id,pupil_id),
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id),
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code)
);
alter table public.physix_student_profiles enable row level security;
revoke all on public.physix_student_profiles from anon,authenticated;
grant select,update on public.physix_student_profiles to authenticated;
create policy physix_profile_self_read on public.physix_student_profiles
 for select to authenticated using(auth_user_id=(select auth.uid()));
create policy physix_profile_teacher_read on public.physix_student_profiles
 for select to authenticated using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
create policy physix_profile_self_edit on public.physix_student_profiles
 for update to authenticated using(auth_user_id=(select auth.uid()))
 with check(auth_user_id=(select auth.uid()));
create or replace function private.physix_profile_immutable()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.auth_user_id<>old.auth_user_id or new.owner_id<>old.owner_id or
 new.pupil_id<>old.pupil_id or new.class_code<>old.class_code
 then raise exception 'Affectation du profil immuable';end if;
 new.updated_at=now();return new;
end;$$;
create trigger physix_profile_immutable_trg before update on public.physix_student_profiles
 for each row execute function private.physix_profile_immutable();

create or replace function public.physix_activate_pupil(p_code text,p_class text,p_name text)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_id uuid;v_owner uuid;v_pupil uuid;v_full text;v_class text;v_link uuid;v_user uuid;
begin
 v_user=(select auth.uid());
 if v_user is null or not exists(select 1 from auth.users u where u.id=v_user and
 (u.email_confirmed_at is not null or u.phone_confirmed_at is not null))
 then raise exception 'Vérifiez votre e-mail ou téléphone';end if;
 if p_code is null or p_code !~ '^[A-Fa-f0-9]{24}$' or length(btrim(p_name)) not between 2 and 120 then
 raise exception 'Code ou identité invalides';end if;
 select ac.id,ac.owner_id,ac.pupil_id,p.full_name,p.class_code
 into v_id,v_owner,v_pupil,v_full,v_class
 from public.physix_activation_codes ac
 join public.physix_pupils p on p.id=ac.pupil_id and p.owner_id=ac.owner_id and p.active
 join public.physix_classes c on c.owner_id=p.owner_id and c.code=p.class_code and c.active
 where ac.code_hash=encode(extensions.digest(upper(p_code),'sha256'),'hex')
 and ac.redeemed_at is null and ac.expires_at>now()
 and p.class_code=p_class and lower(btrim(p.full_name))=lower(btrim(p_name))
 for update of ac;
 if not found then raise exception 'Code invalide, expiré ou identité différente';end if;
 if exists(select 1 from public.physix_pupil_links where auth_user_id=v_user) then
 raise exception 'Compte déjà activé';end if;
 if exists(select 1 from public.physix_pupil_links where owner_id=v_owner and pupil_id=v_pupil and auth_user_id is not null)
 then raise exception 'Profil déjà activé';end if;
 update public.physix_pupil_links set auth_user_id=v_user
 where owner_id=v_owner and pupil_id=v_pupil
 returning id into v_link;
 if v_link is null then
  insert into public.physix_pupil_links(owner_id,pupil_id,auth_user_id)
  values(v_owner,v_pupil,v_user);
 end if;
 insert into public.physix_student_profiles(auth_user_id,owner_id,pupil_id,class_code,display_name,phone)
 values(v_user,v_owner,v_pupil,v_class,v_full,
  (select case when phone_confirmed_at is not null then phone else null end from auth.users where id=v_user));
 update public.physix_activation_codes set redeemed_at=now() where id=v_id;
 return jsonb_build_object('class_code',v_class,'full_name',v_full);
end;$$;
revoke all on function public.physix_activate_pupil(text,text,text) from public,anon;
grant execute on function public.physix_activate_pupil(text,text,text) to authenticated;

-- private portrait: never publicly accessible, only authenticated owner of account or teacher.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('physix-avatars','physix-avatars',false,2097152,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=2097152,
allowed_mime_types=array['image/jpeg','image/png','image/webp'];
create policy physix_avatar_self_upload on storage.objects for insert to authenticated
with check(bucket_id='physix-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text
 and exists(select 1 from public.physix_student_profiles sp where sp.auth_user_id=(select auth.uid())));
create policy physix_avatar_self_read on storage.objects for select to authenticated
using(bucket_id='physix-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);
create policy physix_avatar_teacher_read on storage.objects for select to authenticated
using(bucket_id='physix-avatars' and exists(
 select 1 from public.physix_student_profiles sp where sp.avatar_path=storage.objects.name
 and sp.owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid()))
));
create policy physix_avatar_self_delete on storage.objects for delete to authenticated
using(bucket_id='physix-avatars' and (storage.foldername(name))[1]=(select auth.uid())::text);

-- Auth account is the canonical identity. Email/SMS only verifies the account, never grants a class.
-- Mandatory photo: pupil data will not be returned until avatar_path is set.
create or replace function private.physix_verified_profile(p_owner uuid,p_pupil uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.physix_student_profiles sp
 join public.physix_pupil_links l on l.owner_id=sp.owner_id and l.pupil_id=sp.pupil_id
 join public.physix_pupils p on p.owner_id=sp.owner_id and p.id=sp.pupil_id and p.active
 join public.physix_classes c on c.owner_id=sp.owner_id and c.code=sp.class_code and c.active
 join auth.users u on u.id=sp.auth_user_id
 where sp.owner_id=p_owner and sp.pupil_id=p_pupil
 and l.auth_user_id=(select auth.uid()) and sp.auth_user_id=(select auth.uid())
 and sp.avatar_path is not null
 and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
 );
$$;
revoke all on function private.physix_verified_profile(uuid,uuid) from public;
grant execute on function private.physix_verified_profile(uuid,uuid) to authenticated;
commit;