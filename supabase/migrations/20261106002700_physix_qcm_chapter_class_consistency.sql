-- A QCM's chapter must belong to the same class and semester as its published questions.
begin;
create or replace function private.physix_guard_chapter_qcm()
returns trigger language plpgsql set search_path='' as $$
declare c record;
begin
 select semester,state,target_class into c from public.physix_chapters
 where id=new.chapter_id and owner_id=new.owner_id;
 if not found or c.semester is distinct from new.semester or
 c.target_class is distinct from new.class_code then
  raise exception 'Le chapitre, le semestre et la classe doivent correspondre';
 end if;
 return new;
end;$$;
commit;