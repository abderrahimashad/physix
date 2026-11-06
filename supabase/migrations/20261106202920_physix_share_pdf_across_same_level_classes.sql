-- Shared PDF resources may target several active classes at the same level.
-- Existing rows are preserved; teacher ownership and class-level restrictions remain.
create or replace function public.physix_validate_resource_classes()
returns trigger language plpgsql set search_path='' as $function$
declare allowed_count integer;
declare chapter_level text;
declare chapter_class text;
begin
 select c.level,c.target_class into chapter_level,chapter_class from public.physix_chapters c
 where c.id=new.chapter_id and c.owner_id=new.owner_id;
 if chapter_level is null then raise exception 'Chapitre introuvable'; end if;
 if coalesce(cardinality(new.target_classes),0)=0 then
  raise exception 'Choisissez au moins une classe pour ce PDF';
 end if;
 if chapter_class is not null and not (chapter_class=any(new.target_classes)) then
  raise exception 'La classe principale du chapitre doit etre incluse';
 end if;
 select count(*) into allowed_count from public.physix_classes c
 where c.owner_id=new.owner_id and c.level=chapter_level
 and c.active=true and c.code=any(new.target_classes);
 if allowed_count<>cardinality(new.target_classes) or
 (select count(distinct val) from unnest(new.target_classes) as val)
 <>cardinality(new.target_classes) then
  raise exception 'Classe absente, inactive, en double ou de niveau incorrect';
 end if;
 return new;
end;
$function$;
