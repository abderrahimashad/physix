-- PhysiX PDF Storage: accès STRICTEMENT réservé au propriétaire authentifié.
-- Bucket privé : pas de liens publics, pas d'upsert, pas de partage invité/élève.
begin;
drop policy if exists physix_pdf_owner_select on storage.objects;
drop policy if exists physix_pdf_owner_insert on storage.objects;
drop policy if exists physix_pdf_owner_delete on storage.objects;
create policy physix_pdf_owner_select on storage.objects
for select to authenticated
using (
  bucket_id = 'physix-private'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.physix_is_owner(auth.uid()))
);
create policy physix_pdf_owner_insert on storage.objects
for insert to authenticated
with check (
  bucket_id = 'physix-private'
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and array_length(storage.foldername(name), 1) = 3
  and (storage.foldername(name))[2] in ('resource','devoir')
  and storage.extension(name) = 'pdf'
  and (select private.physix_is_owner(auth.uid()))
  and (
    (
      (storage.foldername(name))[2] = 'resource'
      and exists (select 1 from public.physix_resources r
        where r.owner_id = (select auth.uid())
        and r.id::text = (storage.foldername(name))[3])
    )
    or
    (
      (storage.foldername(name))[2] = 'devoir'
      and exists (select 1 from public.physix_devoirs d
        where d.owner_id = (select auth.uid())
        and d.id::text = (storage.foldername(name))[3])
    )
  )
);
create policy physix_pdf_owner_delete on storage.objects
for delete to authenticated
using (
  bucket_id = 'physix-private'
  and owner_id = (select auth.uid())::text
  and (storage.foldername(name))[1] = (select auth.uid())::text
  and (select private.physix_is_owner(auth.uid()))
);
-- Pas de policy UPDATE afin d'empêcher remplacement d'un fichier existant.
-- Le bucket reste privé avec limite PDF 20 MiB.
update storage.buckets set public=false,
 file_size_limit=20971520,allowed_mime_types=array['application/pdf']
where id='physix-private';
commit;