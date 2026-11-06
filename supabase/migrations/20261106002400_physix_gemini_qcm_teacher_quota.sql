begin;
create table public.physix_qcm_generation_quotas(
 id bigint generated always as identity primary key,
 owner_id uuid not null references public.physix_owners(user_id) on delete cascade,
 created_at timestamptz not null default now()
);
create index physix_qcm_generation_quotas_owner on public.physix_qcm_generation_quotas(owner_id,created_at desc);
alter table public.physix_qcm_generation_quotas enable row level security;
revoke all on public.physix_qcm_generation_quotas from anon,authenticated;
create function public.physix_qcm_claim_generation()
returns boolean language plpgsql volatile security definer set search_path='' as $$
declare uid uuid;
begin
 uid=(select auth.uid());
 if uid is null or not (select private.physix_is_owner(uid)) then return false;end if;
 perform pg_advisory_xact_lock(hashtextextended(uid::text,44));
 if (select count(*) from public.physix_qcm_generation_quotas
 where owner_id=uid and created_at>now()-interval '1 minute')>=4
 or (select count(*) from public.physix_qcm_generation_quotas
 where owner_id=uid and created_at>now()-interval '1 day')>=10
 then raise exception 'Limite interne atteinte (10 générations / 24h, 4 / min)';end if;
 insert into public.physix_qcm_generation_quotas(owner_id) values(uid);
 return true;
end;$$;
revoke all on function public.physix_qcm_claim_generation() from public,anon;
grant execute on function public.physix_qcm_claim_generation() to authenticated;
commit;