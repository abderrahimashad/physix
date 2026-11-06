-- Prevent students from bypassing mandatory profile portrait by writing an invented path.
begin;
create or replace function private.physix_guard_profile_portrait()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.avatar_path is distinct from old.avatar_path and new.avatar_path is not null then
  if not exists (
   select 1 from storage.objects obj
   where obj.bucket_id='physix-avatars'
    and obj.name=new.avatar_path
    and obj.owner_id=new.auth_user_id::text
    and obj.metadata->>'mimetype' in ('image/jpeg','image/png','image/webp')
  ) then
   raise exception 'La photo privée doit être importée avant la validation du profil';
  end if;
 end if;
 return new;
end;$$;
create trigger physix_profile_portrait_exists before update of avatar_path
on public.physix_student_profiles
for each row execute function private.physix_guard_profile_portrait();
commit;