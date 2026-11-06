begin;
create or replace function private.physix_lock_started_chapter_quiz()
returns trigger language plpgsql set search_path='' as $$
declare uid uuid;cid uuid;cls text;
begin
 if tg_op='INSERT' then
  uid=new.owner_id;cid=new.chapter_id;cls=new.class_code;
 else
  uid=old.owner_id;cid=old.chapter_id;cls=old.class_code;
 end if;
 if exists(
  select 1 from public.physix_chapter_qcm_attempts a
  join public.physix_chapter_qcm q on q.id=a.question_id
  where q.owner_id=uid and q.chapter_id=cid and q.class_code=cls
 ) then raise exception 'QCM déjà commencé par les élèves : modifications verrouillées';
 end if;
 if tg_op='UPDATE' and (new.owner_id,new.chapter_id,new.class_code)
  is distinct from (old.owner_id,old.chapter_id,old.class_code)
 and exists(
  select 1 from public.physix_chapter_qcm_attempts a
  join public.physix_chapter_qcm q on q.id=a.question_id
  where q.owner_id=new.owner_id and q.chapter_id=new.chapter_id and q.class_code=new.class_code
 ) then raise exception 'Impossible de déplacer un QCM déjà commencé';end if;
 if tg_op='DELETE' then return old;end if;
 return new;
end;$$;
commit;