-- PhysiX: identifier les PDF conservés dans Google Drive sans toucher aux anciens fichiers.
begin;
alter table public.physix_resource_files
  add column if not exists storage_provider text not null default 'supabase';
alter table public.physix_resource_files
  add column if not exists drive_file_id text;
alter table public.physix_resource_files
  drop constraint if exists physix_file_storage_provider_check;
alter table public.physix_resource_files
  add constraint physix_file_storage_provider_check
  check (
    (storage_provider='supabase' and drive_file_id is null)
    or
    (storage_provider='google_drive'
       and drive_file_id is not null
       and drive_file_id ~ '^[A-Za-z0-9_-]{10,200}$'
       and storage_path = 'gdrive:' || drive_file_id)
  );
create unique index if not exists physix_google_drive_file_id_unique
  on public.physix_resource_files(drive_file_id) where drive_file_id is not null;
comment on column public.physix_resource_files.drive_file_id is
  'Identifiant opaque; ne donne jamais à lui seul accès à un objet Google Drive.';
commit;