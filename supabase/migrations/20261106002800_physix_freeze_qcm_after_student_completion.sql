-- Keep the 19-question quiz stable once a pupil has submitted it.
-- Editing/publishing/deleting or adding a question afterward could invalidate final scores.
begin;
create function private.physix_lock_started_chapter_quiz()
returns trigger language plpgsql set search_path='' as $$
declare uid uuid;cid uuid;cls text;
begin
 uid=coalesce(old.owner_id,new.owner_id);
 cid=coalesce(old.chapter_id,new.chapter_id);
 cls=coalesce(old.class_code,new.class_code);
 if exists(
  select 1 from public.physix_chapter_qcm_attempts a
  join public.physix_chapter_qcm q on q.id=a.question_id
  where q.owner_id=uid and q.chapter_id=cid and q.class_code=cls
 ) then raise exception 'QCM déjà commencé par les élèves : modifications verrouillées';
 end if;
 return case when tg_op='DELETE' then old else new end;
end;$$;
create trigger physix_lock_started_chapter_quiz_trg
before insert or update or delete on public.physix_chapter_qcm
for each row execute function private.physix_lock_started_chapter_quiz();
commit;