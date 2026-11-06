-- QCM final-only grading: do not expose answer correctness before full chapter submission.
begin;
revoke all on function public.physix_student_answer_qcm(uuid,smallint) from authenticated;
create or replace function public.physix_student_chapter_qcm()
returns table(id uuid,chapter_id uuid,chapter_title text,class_code text,semester smallint,
 question text,options jsonb,answered boolean,selected_option smallint,is_correct boolean,explanation text)
language sql stable security definer set search_path='' as $$
 with visible as (
 select q.*,ch.title chapter_name,l.pupil_id,
 (select count(*) from public.physix_chapter_qcm qq
   join public.physix_chapters cc on cc.id=qq.chapter_id and cc.owner_id=qq.owner_id
   where qq.owner_id=q.owner_id and qq.class_code=q.class_code and
   qq.chapter_id=q.chapter_id and qq.published and cc.state='published') question_total,
 (select count(*) from public.physix_chapter_qcm_attempts aa
   join public.physix_chapter_qcm qq on qq.id=aa.question_id
   where aa.owner_id=q.owner_id and aa.pupil_id=l.pupil_id and
   aa.auth_user_id=(select auth.uid()) and qq.chapter_id=q.chapter_id and
   qq.class_code=q.class_code and qq.published) answer_total
 from public.physix_chapter_qcm q
 join public.physix_chapters ch on ch.owner_id=q.owner_id and ch.id=q.chapter_id
 join public.physix_pupil_links l on l.owner_id=q.owner_id
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id
   and p.class_code=q.class_code
 where q.published and ch.state='published' and private.physix_verified_profile(l.owner_id,l.pupil_id)
 )
 select q.id,q.chapter_id,q.chapter_name,q.class_code,q.semester,q.question,
 jsonb_build_array(q.option_a,q.option_b,q.option_c,q.option_d),
 (q.question_total>0 and q.answer_total=q.question_total and a.id is not null),
 case when q.question_total>0 and q.answer_total=q.question_total then a.selected_option else null end,
 case when q.question_total>0 and q.answer_total=q.question_total then a.is_correct else null end,
 case when q.question_total>0 and q.answer_total=q.question_total then q.explanation else '' end
 from visible q
 left join public.physix_chapter_qcm_attempts a
   on a.question_id=q.id and a.owner_id=q.owner_id and a.pupil_id=q.pupil_id
   and a.auth_user_id=(select auth.uid())
 order by q.semester,q.chapter_name,q.created_at;
$$;
revoke all on function public.physix_student_chapter_qcm() from public,anon;
grant execute on function public.physix_student_chapter_qcm() to authenticated;

create function public.physix_student_submit_chapter_qcm(p_chapter uuid,p_class text,p_answers jsonb)
returns jsonb language plpgsql volatile security definer set search_path='' as $$
declare v_owner uuid;v_pupil uuid;v_count int;v_submitted int;v_saved int;v_score int;v_details jsonb;
begin
 if (select auth.uid()) is null or jsonb_typeof(p_answers)<>'array' or jsonb_array_length(p_answers)>100 then
  raise exception 'Réponses invalides';
 end if;
 select l.owner_id,l.pupil_id into v_owner,v_pupil
 from public.physix_pupil_links l join public.physix_pupils p
 on p.owner_id=l.owner_id and p.id=l.pupil_id and p.class_code=p_class
 where private.physix_verified_profile(l.owner_id,l.pupil_id)
 and exists(select 1 from public.physix_chapter_qcm q join public.physix_chapters ch
   on ch.owner_id=q.owner_id and ch.id=q.chapter_id
   where q.owner_id=l.owner_id and q.chapter_id=p_chapter and q.class_code=p_class
   and q.published and ch.state='published')
 limit 1;
 if not found then raise exception 'Quiz non accessible';end if;
 -- Prevent two simultaneous submissions for same account/quiz.
 perform pg_advisory_xact_lock(hashtextextended(v_pupil::text||p_chapter::text,0));
 select count(*) into v_count from public.physix_chapter_qcm q
 join public.physix_chapters ch on ch.id=q.chapter_id and ch.owner_id=q.owner_id
 where q.owner_id=v_owner and q.chapter_id=p_chapter and q.class_code=p_class
 and q.published and ch.state='published';
 if v_count=0 or v_count>100 then raise exception 'Quiz invalide';end if;
 select count(*),count(distinct a.question_id) into v_submitted,v_saved from
 jsonb_to_recordset(p_answers) as a(question_id uuid,selected_option smallint);
 if v_submitted<>v_count or v_saved<>v_count then raise exception 'Répondez à toutes les questions';end if;
 if exists(
 select 1 from jsonb_to_recordset(p_answers) as a(question_id uuid,selected_option smallint)
 left join public.physix_chapter_qcm q on q.id=a.question_id and q.owner_id=v_owner
   and q.chapter_id=p_chapter and q.class_code=p_class and q.published
 where q.id is null or a.selected_option is null or a.selected_option not between 0 and 3
 ) then raise exception 'Une réponse est invalide';end if;
 if exists(
 select 1 from public.physix_chapter_qcm_attempts a
 join public.physix_chapter_qcm q on q.id=a.question_id
 where a.pupil_id=v_pupil and a.owner_id=v_owner and
 q.chapter_id=p_chapter and q.class_code=p_class and q.published
 ) then raise exception 'Ce QCM a déjà été terminé';end if;
 insert into public.physix_chapter_qcm_attempts(question_id,owner_id,pupil_id,auth_user_id,selected_option,is_correct)
 select q.id,v_owner,v_pupil,(select auth.uid()),a.selected_option,
 (a.selected_option=q.correct_option)
 from jsonb_to_recordset(p_answers) as a(question_id uuid,selected_option smallint)
 join public.physix_chapter_qcm q on q.id=a.question_id
 where q.owner_id=v_owner and q.chapter_id=p_chapter and q.class_code=p_class and q.published;
 get diagnostics v_saved=row_count;
 if v_saved<>v_count then raise exception 'Réponses incomplètes';end if;
 select count(*) filter (where a.is_correct),
 jsonb_agg(jsonb_build_object('question_id',q.id,'selected_option',a.selected_option,
  'is_correct',a.is_correct,'correct_option',q.correct_option,'explanation',q.explanation)
 order by q.created_at)
 into v_score,v_details from public.physix_chapter_qcm_attempts a
 join public.physix_chapter_qcm q on q.id=a.question_id
 where a.owner_id=v_owner and a.pupil_id=v_pupil and q.chapter_id=p_chapter
 and q.class_code=p_class and q.published;
 return jsonb_build_object('correct',v_score,'total',v_count,'details',v_details);
end;$$;
revoke all on function public.physix_student_submit_chapter_qcm(uuid,text,jsonb) from public,anon;
grant execute on function public.physix_student_submit_chapter_qcm(uuid,text,jsonb) to authenticated;
commit;