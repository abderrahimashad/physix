begin;
create function public.physix_student_review_chapter_qcm(p_chapter uuid,p_class text)
returns jsonb language plpgsql stable security definer set search_path='' as $$
declare v_owner uuid;v_pupil uuid;v_count integer;v_answered integer;v_score integer;v_details jsonb;
begin
 select l.owner_id,l.pupil_id into v_owner,v_pupil
 from public.physix_pupil_links l
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id and p.class_code=p_class
 where private.physix_verified_profile(l.owner_id,l.pupil_id)
 and exists(select 1 from public.physix_chapter_qcm q
  join public.physix_chapters ch on ch.id=q.chapter_id and ch.owner_id=q.owner_id
  where q.owner_id=l.owner_id and q.chapter_id=p_chapter and q.class_code=p_class
  and q.published and ch.state='published')
 limit 1;
 if not found then raise exception 'Quiz non accessible';end if;
 select count(*) into v_count from public.physix_chapter_qcm q
 where q.owner_id=v_owner and q.chapter_id=p_chapter and q.class_code=p_class and q.published;
 select count(*),count(*) filter(where a.is_correct) into v_answered,v_score
 from public.physix_chapter_qcm_attempts a
 join public.physix_chapter_qcm q on q.id=a.question_id
 where a.owner_id=v_owner and a.pupil_id=v_pupil and a.auth_user_id=(select auth.uid())
 and q.chapter_id=p_chapter and q.class_code=p_class and q.published;
 if v_count=0 or v_answered<>v_count then raise exception 'Terminez le QCM avant de consulter le corrigé';end if;
 select jsonb_agg(jsonb_build_object('question_id',q.id,'selected_option',a.selected_option,
 'is_correct',a.is_correct,'correct_option',q.correct_option,'explanation',q.explanation)
 order by q.created_at) into v_details
 from public.physix_chapter_qcm_attempts a
 join public.physix_chapter_qcm q on q.id=a.question_id
 where a.owner_id=v_owner and a.pupil_id=v_pupil and a.auth_user_id=(select auth.uid())
 and q.chapter_id=p_chapter and q.class_code=p_class and q.published;
 return jsonb_build_object('correct',v_score,'total',v_count,'details',v_details);
end;$$;
revoke all on function public.physix_student_review_chapter_qcm(uuid,text) from public,anon;
grant execute on function public.physix_student_review_chapter_qcm(uuid,text) to authenticated;
commit;