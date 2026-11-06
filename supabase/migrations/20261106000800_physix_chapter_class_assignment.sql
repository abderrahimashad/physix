-- PhysiX: chapitres attribués au groupe exact, sans perdre les chapitres historiques.
begin;
alter table public.physix_chapters add column if not exists target_class text;
comment on column public.physix_chapters.target_class is
 'Classe du chapitre pour le nouveau parcours; NULL = ancien chapitre non attribué à un groupe.';
create or replace function public.physix_validate_chapter_class()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.target_class is null then return new; end if;
 if not exists (
  select 1 from public.physix_classes c
  where c.owner_id=new.owner_id and c.code=new.target_class
    and c.level=new.level and c.active=true
 ) then
  raise exception 'Classe du chapitre absente, inactive ou incompatible';
 end if;
 return new;
end;
$$;
drop trigger if exists physix_validate_chapter_class_trg on public.physix_chapters;
create trigger physix_validate_chapter_class_trg
before insert or update of target_class,level,owner_id
on public.physix_chapters for each row execute function public.physix_validate_chapter_class();

-- Une ressource ne peut plus cibler un groupe différent de celui de son chapitre.
create or replace function public.physix_validate_resource_classes()
returns trigger language plpgsql security invoker set search_path='' as $$
declare allowed_count integer;
declare chapter_level text;
declare chapter_class text;
begin
 select c.level,c.target_class into chapter_level,chapter_class from public.physix_chapters c
  where c.id=new.chapter_id and c.owner_id=new.owner_id;
 if chapter_level is null then raise exception 'Chapitre introuvable'; end if;
 if chapter_class is not null and (
   cardinality(new.target_classes)<>1 or new.target_classes[1]<>chapter_class
 ) then raise exception 'La classe du PDF ne correspond pas au chapitre'; end if;
 if cardinality(new.target_classes)=0 then return new; end if;
 select count(*) into allowed_count
 from public.physix_classes c
 where c.owner_id=new.owner_id and c.level=chapter_level
   and c.active=true and c.code=any(new.target_classes);
 if allowed_count<>cardinality(new.target_classes) or
    (select count(distinct val) from unnest(new.target_classes) val)<>cardinality(new.target_classes)
 then raise exception 'Classe absente, inactive ou de niveau incorrect'; end if;
 return new;
end;$$;
commit;