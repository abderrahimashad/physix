-- Permettre Devoir surveillé comme type de document associé à une classe.
alter table public.physix_resources drop constraint if exists physix_resources_kind_check;
alter table public.physix_resources add constraint physix_resources_kind_check
 check(kind in ('Cours','Résumé','Exercices','Série','Correction','QCM','Présentation','Vidéo','Autre','Devoir surveillé'));
