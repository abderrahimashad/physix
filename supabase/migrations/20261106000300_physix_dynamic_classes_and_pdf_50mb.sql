-- PhysiX: classes administrables + seuils PDF 50 MiB (projet Free).
-- L'affectation ne donne JAMAIS accès aux fichiers privés aux élèves.
begin;
create table if not exists public.physix_classes (
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 code text not null check (length(btrim(code)) between 2 and 70),
 level text not null check (level in ('1BAC','2BAC PC')),
 active boolean not null default true,
 created_at timestamptz not null default now(),
 unique(owner_id,code)
);
alter table public.physix_classes enable row level security;
revoke all on public.physix_classes from anon,authenticated;
grant select,insert,update on public.physix_classes to authenticated;
drop policy if exists physix_classes_owner on public.physix_classes;
create policy physix_classes_owner on public.physix_classes for all to authenticated
using (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
with check (owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
insert into public.physix_classes(owner_id,code,level)
select o.user_id,v.code,v.level from public.physix_owners o
cross join (values
 ('1BAC BIOF G1','1BAC'),('1BAC BIOF G2','1BAC'),('1BAC BIOF G3','1BAC'),
 ('2BAC PC BIOF','2BAC PC')) v(code,level)
on conflict(owner_id,code) do nothing;

alter table public.physix_resources drop constraint if exists physix_resources_target_classes_allowed;
alter table public.physix_resources add constraint physix_resources_target_classes_allowed
check(cardinality(target_classes)<=30 and array_position(target_classes,null) is null);

-- Le serveur vérifie l'existence, le propriétaire et le bon niveau.
create or replace function public.physix_validate_resource_classes()
returns trigger language plpgsql security invoker set search_path='' as $$
declare allowed_count integer;
declare chapter_level text;
begin
 if cardinality(new.target_classes)=0 then return new; end if;
 select c.level into chapter_level from public.physix_chapters c
  where c.id=new.chapter_id and c.owner_id=new.owner_id;
 if chapter_level is null then raise exception 'Chapitre introuvable'; end if;
 select count(*) into allowed_count
 from public.physix_classes c
 where c.owner_id=new.owner_id and c.level=chapter_level
   and c.active=true and c.code=any(new.target_classes);
 if allowed_count<>cardinality(new.target_classes) or
    (select count(distinct val) from unnest(new.target_classes) val)<>cardinality(new.target_classes)
 then raise exception 'Classe absente, inactive, en doublon ou de niveau incorrect'; end if;
 return new;
end;$$;
revoke all on function public.physix_validate_resource_classes() from public;
drop trigger if exists physix_validate_resource_classes_trigger on public.physix_resources;
create trigger physix_validate_resource_classes_trigger before insert or update of target_classes,chapter_id,owner_id
on public.physix_resources for each row execute function public.physix_validate_resource_classes();

-- 50 MiB (la limite globale Storage doit aussi autoriser >= 50 MiB).
alter table public.physix_resource_files drop constraint if exists physix_resource_files_file_size_check;
alter table public.physix_resource_files add constraint physix_resource_files_file_size_check
 check(file_size between 1 and 52428800);
update storage.buckets set file_size_limit=52428800 where id='physix-private' and public=false;
commit;