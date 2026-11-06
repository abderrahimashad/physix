-- PhysiX: attribuer les devoirs à une classe exacte en conservant les anciennes fiches.
begin;
alter table public.physix_devoirs add column if not exists target_class text;
comment on column public.physix_devoirs.target_class is
 'Code de classe choisi pour un devoir, obligatoire dans le nouvel éditeur; NULL pour fiches historiques.';
create or replace function public.physix_validate_devoir_class()
returns trigger language plpgsql security invoker set search_path='' as $$
begin
 if new.target_class is null then return new; end if;
 if not exists (
   select 1 from public.physix_classes c
   where c.owner_id=new.owner_id and c.code=new.target_class
   and c.level=new.level and c.active=true
 ) then
   raise exception 'Classe absente, inactive ou de niveau incompatible';
 end if;
 return new;
end;
$$;
drop trigger if exists physix_validate_devoir_class_trg on public.physix_devoirs;
create trigger physix_validate_devoir_class_trg
before insert or update of target_class,level,owner_id on public.physix_devoirs
for each row execute function public.physix_validate_devoir_class();
commit;