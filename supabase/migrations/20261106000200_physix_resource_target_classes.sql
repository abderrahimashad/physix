-- PhysiX: cible pédagogique de chaque PDF; métadonnées uniquement, sans droits élèves.
alter table public.physix_resources
  add column if not exists target_classes text[] not null default '{}'::text[];
comment on column public.physix_resources.target_classes is
  'Classes choisies par le propriétaire. Vide = document non attribué. Aucun accès élève accordé.';
alter table public.physix_resources
  drop constraint if exists physix_resources_target_classes_allowed;
alter table public.physix_resources
  add constraint physix_resources_target_classes_allowed check (
    target_classes <@ array['1BAC BIOF G1','1BAC BIOF G2','1BAC BIOF G3','2BAC PC BIOF']::text[]
    and cardinality(target_classes) <= 4
    and array_position(target_classes,null) is null
  );