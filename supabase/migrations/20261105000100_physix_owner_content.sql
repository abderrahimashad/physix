-- PhysiX: fondation propriétaire unique / métadonnées pédagogiques.
-- Ne pas utiliser de vraies données d'élèves avant audit et tests RLS.
begin;
create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists public.physix_owners (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
comment on table public.physix_owners is 'Attribution du rôle propriétaire uniquement dans Supabase SQL Editor, jamais depuis le client.';
alter table public.physix_owners enable row level security;
revoke all on public.physix_owners from anon, authenticated;
grant select on public.physix_owners to authenticated;

-- Cette fonction lit uniquement la liste des propriétaires, sans contrôle client.
create or replace function private.physix_is_owner(p_user_id uuid)
returns boolean language sql stable security definer
set search_path = ''
as $$
  select exists (
    select 1 from public.physix_owners o
    where o.user_id = p_user_id and p_user_id = (select auth.uid())
  );
$$;
revoke all on function private.physix_is_owner(uuid) from public;
grant usage on schema private to authenticated;
grant execute on function private.physix_is_owner(uuid) to authenticated;

drop policy if exists physix_owner_self_read on public.physix_owners;
create policy physix_owner_self_read on public.physix_owners
for select to authenticated using (user_id = (select auth.uid()));

create table if not exists public.physix_chapters (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.physix_owners(user_id),
  level text not null check (level in ('1BAC','2BAC PC')),
  subject text not null check (subject in ('Physique','Chimie')),
  title text not null check (length(btrim(title)) between 1 and 160),
  description text not null default '',
  semester smallint not null check (semester in (1,2)),
  sort_order integer not null default 0 check (sort_order >= 0),
  state text not null default 'draft' check (state in ('draft','published','archived')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,id)
);
create table if not exists public.physix_resources (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.physix_owners(user_id),
  chapter_id uuid not null,
  title text not null check (length(btrim(title)) between 1 and 160),
  kind text not null check (kind in ('Cours','Résumé','Exercices','Série','Correction','QCM','Présentation','Vidéo','Autre')),
  visibility text not null default 'private' check (visibility in ('private','public')),
  state text not null default 'draft' check (state in ('draft','published','archived')),
  sort_order integer not null default 0 check (sort_order >= 0),
  publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,id),
  foreign key(owner_id,chapter_id) references public.physix_chapters(owner_id,id) on delete restrict
);
create table if not exists public.physix_devoirs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.physix_owners(user_id),
  level text not null check (level in ('1BAC','2BAC PC')),
  subject text not null check (subject in ('Physique','Chimie')),
  semester smallint not null check (semester in (1,2)),
  devoir_number integer not null check (devoir_number between 1 and 30),
  title text not null check (length(btrim(title)) between 1 and 160),
  duration_minutes integer not null check (duration_minutes between 1 and 600),
  state text not null default 'draft' check (state in ('draft','published','archived')),
  correction_state text not null default 'hidden' check (correction_state in ('hidden','authorized')),
  correction_publish_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(owner_id,id)
);
-- Chemins de fichiers confidentiels : ne sont pas dans les ressources visibles publiquement.
create table if not exists public.physix_resource_files (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.physix_owners(user_id),
  resource_id uuid,
  devoir_id uuid,
  file_role text not null check (file_role in ('content','subject','correction')),
  storage_path text not null unique check (length(storage_path) between 1 and 512),
  filename text not null check (length(btrim(filename)) between 1 and 200),
  mime_type text not null check (mime_type in ('application/pdf')),
  file_size bigint not null check (file_size between 1 and 20971520),
  created_at timestamptz not null default now(),
  check ((resource_id is not null and devoir_id is null) or (resource_id is null and devoir_id is not null)),
  foreign key(owner_id,resource_id) references public.physix_resources(owner_id,id) on delete cascade,
  foreign key(owner_id,devoir_id) references public.physix_devoirs(owner_id,id) on delete cascade
);

-- Le client anonyme n'obtient aucun accès aux tables.
revoke all on public.physix_chapters, public.physix_resources, public.physix_devoirs, public.physix_resource_files from anon, authenticated;
grant select,insert,update,delete on public.physix_chapters, public.physix_resources, public.physix_devoirs, public.physix_resource_files to authenticated;
alter table public.physix_chapters enable row level security;
alter table public.physix_resources enable row level security;
alter table public.physix_devoirs enable row level security;
alter table public.physix_resource_files enable row level security;

drop policy if exists physix_chapter_owner on public.physix_chapters;
create policy physix_chapter_owner on public.physix_chapters
for all to authenticated
using (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())))
with check (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())));
drop policy if exists physix_resource_owner on public.physix_resources;
create policy physix_resource_owner on public.physix_resources
for all to authenticated
using (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())))
with check (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())));
drop policy if exists physix_devoir_owner on public.physix_devoirs;
create policy physix_devoir_owner on public.physix_devoirs
for all to authenticated
using (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())))
with check (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())));
drop policy if exists physix_file_owner on public.physix_resource_files;
create policy physix_file_owner on public.physix_resource_files
for all to authenticated
using (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())))
with check (owner_id = (select auth.uid()) and (select private.physix_is_owner(auth.uid())));

-- Bucket privé uniquement. Pas de policies Storage : uploads et téléchargements restent bloqués.
-- Il faudra une fonction serveur qui valide le propriétaire et le fichier AVANT de signer un lien.
insert into storage.buckets (id,name,public,file_size_limit,allowed_mime_types)
values ('physix-private','physix-private',false,20971520,array['application/pdf'])
on conflict (id) do update set public=false, file_size_limit=20971520,
  allowed_mime_types=array['application/pdf'];

create index if not exists physix_resources_chapter_order on public.physix_resources(chapter_id,sort_order);
create index if not exists physix_chapters_owner_level on public.physix_chapters(owner_id,level,subject,sort_order);
create index if not exists physix_devoirs_owner_semester on public.physix_devoirs(owner_id,semester,subject);

commit;
