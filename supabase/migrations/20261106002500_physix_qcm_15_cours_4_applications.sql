begin;
alter table public.physix_chapter_qcm add column question_type text not null default 'cours'
 check(question_type in ('cours','application'));
create index physix_qcm_type_idx on public.physix_chapter_qcm(owner_id,class_code,chapter_id,question_type);
commit;