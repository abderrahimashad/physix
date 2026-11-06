begin;
create or replace function private.physix_verified_profile(p_owner uuid,p_pupil uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
 select 1 from public.physix_student_profiles sp
 join public.physix_pupil_links l on l.owner_id=sp.owner_id and l.pupil_id=sp.pupil_id
 join public.physix_pupils p on p.owner_id=sp.owner_id and p.id=sp.pupil_id and p.active
 join public.physix_classes c on c.owner_id=sp.owner_id and c.code=sp.class_code and c.active
 join auth.users u on u.id=sp.auth_user_id
 where sp.owner_id=p_owner and sp.pupil_id=p_pupil and sp.enabled
 and p.class_code=sp.class_code
 and l.auth_user_id=(select auth.uid()) and sp.auth_user_id=(select auth.uid())
 and sp.avatar_path is not null
 and (u.email_confirmed_at is not null or u.phone_confirmed_at is not null)
 );
$$;
commit;