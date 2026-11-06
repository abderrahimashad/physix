-- PhysiX activated-account access to personal counters and classroom publications.
-- Code-based enrollment always requires a verified identity and mandatory profile photograph.
begin;
create or replace function public.physix_student_my_progress()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'pupil_id',p.id,'full_name',p.full_name,'class_code',p.class_code,
 'semesters',(
  select jsonb_agg(jsonb_build_object(
   'semester',s.n,
   'participation',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='participation'),
   'exercises',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='exercise'),
   'homework',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='homework'),
   'exposes',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='expose'),
   'efforts',(select count(*) from public.physix_activity_events e where e.owner_id=p.owner_id and e.pupil_id=p.id and e.semester=s.n and e.kind='positive')
  ) order by s.n) from (values(1),(2)) s(n)),
 'objectives',(select coalesce(jsonb_agg(jsonb_build_object(
 'id',g.id,'title',g.title,'semester',g.semester,'status',g.status)
 order by g.created_at),'[]'::jsonb) from public.physix_pupil_objectives g
 where g.owner_id=p.owner_id and g.pupil_id=p.id and g.visible)
 ) order by p.full_name),'[]'::jsonb)
 from public.physix_pupil_links l
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id
 where private.physix_verified_profile(l.owner_id,l.pupil_id);
$$;
create or replace function public.physix_student_my_class_board()
returns jsonb language sql stable security definer set search_path='' as $$
 select coalesce(jsonb_agg(jsonb_build_object(
 'class_code',p.class_code,
 'work',(select coalesce(jsonb_agg(jsonb_build_object(
 'id',w.id,'title',w.title,'instructions',w.instructions,'due_on',w.due_on,
 'semester',w.semester) order by w.due_on nulls last,w.created_at desc),'[]'::jsonb)
 from public.physix_class_work w where w.owner_id=p.owner_id and w.class_code=p.class_code and w.published),
 'announcements',(select coalesce(jsonb_agg(jsonb_build_object(
 'id',n.id,'title',n.title,'message',n.message,'created_at',n.created_at)
 order by n.created_at desc),'[]'::jsonb)
 from public.physix_class_announcements n
 where n.owner_id=p.owner_id and n.class_code=p.class_code and n.published)
 ) order by p.class_code),'[]'::jsonb)
 from public.physix_pupil_links l
 join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id
 where private.physix_verified_profile(l.owner_id,l.pupil_id);
$$;
create or replace function private.physix_student_can_see_publication(p_id uuid)
returns boolean language sql stable security definer set search_path='' as $$
 select exists(
  select 1 from public.physix_student_publications pub
  join public.physix_resource_files f on f.owner_id=pub.owner_id and f.id=pub.file_id
  left join public.physix_resources r on r.id=f.resource_id and r.owner_id=pub.owner_id
  left join public.physix_chapters h on h.id=r.chapter_id and h.owner_id=pub.owner_id
  left join public.physix_devoirs d on d.id=f.devoir_id and d.owner_id=pub.owner_id
  join public.physix_pupil_links l on l.owner_id=pub.owner_id
  join public.physix_pupils p on p.owner_id=l.owner_id and p.id=l.pupil_id
    and p.class_code=pub.class_code
  where pub.id=p_id and pub.enabled
   and private.physix_verified_profile(l.owner_id,l.pupil_id)
   and (
     (f.resource_id is not null and r.state='published' and h.state='published'
       and pub.class_code=any(r.target_classes))
    or (f.devoir_id is not null and d.state='published' and d.target_class=pub.class_code
       and (f.file_role<>'correction' or d.correction_state='authorized'))
   )
 );
$$;
-- Public REST profile access may only see one's own or one's teacher pupils.
-- Existing attendance, incidents, private remarks and grades keep their owner-only policies.
commit;