-- PhysiX — QCM par chapitre, answers protected server-side.
begin;
create table public.physix_chapter_qcm(
 id uuid primary key default gen_random_uuid(),
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 class_code text not null,
 chapter_id uuid not null,
 semester smallint not null check(semester in(1,2)),
 question text not null check(length(btrim(question)) between 10 and 1000),
 option_a text not null check(length(btrim(option_a)) between 1 and 400),
 option_b text not null check(length(btrim(option_b)) between 1 and 400),
 option_c text not null check(length(btrim(option_c)) between 1 and 400),
 option_d text not null check(length(btrim(option_d)) between 1 and 400),
 correct_option smallint not null check(correct_option between 0 and 3),
 explanation text not null default '' check(length(explanation)<=1500),
 published boolean not null default false,created_at timestamptz not null default now(),
 foreign key(owner_id,class_code) references public.physix_classes(owner_id,code),
 foreign key(owner_id,chapter_id) references public.physix_chapters(owner_id,id)
);
create index physix_chapter_qcm_class on public.physix_chapter_qcm(owner_id,class_code,chapter_id,semester,published);
alter table public.physix_chapter_qcm enable row level security;
revoke all on public.physix_chapter_qcm from anon,authenticated;
grant select,insert,update,delete on public.physix_chapter_qcm to authenticated;
create policy physix_chapter_qcm_teacher on public.physix_chapter_qcm for all to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())))
 with check(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
create function private.physix_guard_chapter_qcm() returns trigger language plpgsql set search_path='' as $$
declare c record;
begin
 select semester,state into c from public.physix_chapters where id=new.chapter_id and owner_id=new.owner_id;
 if not found or c.semester is distinct from new.semester then
  raise exception 'Chapitre et semestre incompatibles';
 end if;
 return new;
end;$$;
create trigger physix_guard_chapter_qcm_trg before insert or update on public.physix_chapter_qcm
 for each row execute function private.physix_guard_chapter_qcm();
create table public.physix_chapter_qcm_attempts(
 id uuid primary key default gen_random_uuid(),
 question_id uuid not null references public.physix_chapter_qcm(id) on delete cascade,
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 pupil_id uuid not null, auth_user_id uuid not null references auth.users(id) on delete cascade,
 selected_option smallint not null check(selected_option between 0 and 3),
 is_correct boolean not null, created_at timestamptz not null default now(),
 foreign key(owner_id,pupil_id) references public.physix_pupils(owner_id,id),
 unique(question_id,pupil_id)
);
create index physix_qcm_attempts_owner_idx on public.physix_chapter_qcm_attempts(owner_id,question_id);
alter table public.physix_chapter_qcm_attempts enable row level security;
revoke all on public.physix_chapter_qcm_attempts from anon,authenticated;
grant select on public.physix_chapter_qcm_attempts to authenticated;
create policy physix_qcm_attempts_teacher on public.physix_chapter_qcm_attempts for select to authenticated
 using(owner_id=(select auth.uid()) and (select private.physix_is_owner(auth.uid())));
create function public.physix_student_chapter_qcm()
returns table(id uuid,chapter_id uuid,chapter_title text,class_code text,semester smallint,
 question text,options jsonb,answered boolean,selected_option smallint,is_correct boolean,explanation text)
language sql stable security definer set search_path='' as $$
 select q.id,q.chapter_id,ch.title,q.class_code,q.semester,q.question,
 jsonb_build_array(q.option_a,q.option_b,q.option_c,q.option_d),
 (a.id is not null),a.selected_option,a.is_correct,
 case when a.id is not null then q.explanation else ''::text end
 from public.physix_chapter_qcm q
 join public.physix_chapters ch on ch.owner_id=q.owner_id and ch.id=q.chapter_id
 join public.physix_pupil_links l on l.owner_id=q.owner_id
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id and p.class_code=q.class_code
 left join public.physix_chapter_qcm_attempts a on a.question_id=q.id
  and a.owner_id=q.owner_id and a.pupil_id=p.id and a.auth_user_id=(select auth.uid())
 where q.published and ch.state='published' and private.physix_verified_profile(l.owner_id,l.pupil_id)
 order by q.semester,ch.title,q.created_at;
$$;
revoke all on function public.physix_student_chapter_qcm() from public,anon;
grant execute on function public.physix_student_chapter_qcm() to authenticated;
create function public.physix_student_answer_qcm(p_question uuid,p_selected smallint)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare q public.physix_chapter_qcm%rowtype;v_pupil uuid;v_owner uuid;v_correct boolean;inserted integer;
begin
 if (select auth.uid()) is null or p_selected is null or p_selected not between 0 and 3 then raise exception 'Réponse invalide';end if;
 select question.* into q from public.physix_chapter_qcm question
 join public.physix_chapters ch on ch.owner_id=question.owner_id and ch.id=question.chapter_id
 where question.id=p_question and question.published and ch.state='published';
 if not found then raise exception 'Question indisponible';end if;
 select l.pupil_id,l.owner_id into v_pupil,v_owner
 from public.physix_pupil_links l
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id and p.class_code=q.class_code
 where l.owner_id=q.owner_id and private.physix_verified_profile(l.owner_id,l.pupil_id)
 limit 1;
 if not found then raise exception 'Question non autorisée';end if;
 v_correct=(p_selected=q.correct_option);
 insert into public.physix_chapter_qcm_attempts(question_id,owner_id,pupil_id,auth_user_id,selected_option,is_correct)
 values(q.id,v_owner,v_pupil,(select auth.uid()),p_selected,v_correct)
 on conflict(question_id,pupil_id) do nothing;
 get diagnostics inserted=row_count;
 if inserted<>1 then raise exception 'Vous avez déjà répondu à cette question';end if;
 return jsonb_build_object('is_correct',v_correct,'explanation',q.explanation,
  'selected_option',p_selected,'correct_option',q.correct_option);
end;$$;
revoke all on function public.physix_student_answer_qcm(uuid,smallint) from public,anon;
grant execute on function public.physix_student_answer_qcm(uuid,smallint) to authenticated;
commit;