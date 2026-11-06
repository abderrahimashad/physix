-- Teacher can suspend an activated student account without archiving attendance history.
begin;
alter table public.physix_student_profiles add column enabled boolean not null default true;
revoke update on public.physix_student_profiles from authenticated;
grant update(display_name,phone,avatar_path) on public.physix_student_profiles to authenticated;
create or replace function private.physix_verified_profile(p_owner uuid,p_pupil uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.physix_student_profiles sp
 join public.physix_pupil_links l on l.owner_id=sp.owner_id and l.pupil_id=sp.pupil_id
 join public.physix_pupils p on p.owner_id=sp.owner_id and p.id=sp.pupil_id and p.active
 join public.physix_classes c on c.owner_id=sp.owner_id and c.code=sp.class_code and c.active
 join auth.users u on u.id=sp.auth_user_id
 where sp.owner_id=p_owner and sp.pupil_id=p_pupil and sp.enabled
 and l.auth_user_id=(select auth.uid()) and sp.auth_user_id=(select auth.uid())
 and sp.avatar_path is not null
 and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
 );
$$;
create or replace function public.physix_set_student_account_enabled(p_pupil_id uuid,p_enabled boolean)
returns boolean language plpgsql security definer set search_path='' as $$
declare changed integer;
begin
 if not (select private.physix_is_owner(auth.uid())) then raise exception 'Accès refusé';end if;
 update public.physix_student_profiles set enabled=p_enabled
 where owner_id=(select auth.uid()) and pupil_id=p_pupil_id;
 get diagnostics changed=row_count;
 if changed<>1 then raise exception 'Compte élève non trouvé';end if;
 return true;
end;$$;
revoke all on function public.physix_set_student_account_enabled(uuid,boolean) from public,anon;
grant execute on function public.physix_set_student_account_enabled(uuid,boolean) to authenticated;
commit;