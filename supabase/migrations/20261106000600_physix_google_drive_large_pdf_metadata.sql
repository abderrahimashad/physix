-- Drive : accepter les PDF volumineux. Supabase Storage reste limité à 50 MiB.
begin;
alter table public.physix_resource_files
 drop constraint if exists physix_resource_files_file_size_check;
alter table public.physix_resource_files
 add constraint physix_resource_files_file_size_check check(
   (storage_provider='supabase' and file_size between 1 and 52428800)
   or
   (storage_provider='google_drive' and file_size between 1 and 5497558138880)
 );
commit;