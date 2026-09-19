-- Atomic account binding prevents an OAuth race from reassigning another tenant's account.
create function public.connect_account(p_org uuid,p_external text,p_platform text,p_name text,p_token text) returns uuid language plpgsql security definer set search_path='' as $$
declare account_id uuid; begin
 perform pg_advisory_xact_lock(hashtextextended(p_platform||':'||p_external,0));
 if exists(select 1 from public.social_accounts where platform=p_platform and external_id=p_external and organization_id<>p_org) then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 insert into public.social_accounts(organization_id,external_id,platform,name,connected) values(p_org,p_external,p_platform,p_name,true)
 on conflict(platform,external_id) do update set name=excluded.name,connected=true where public.social_accounts.organization_id=p_org returning id into account_id;
 if account_id is null then raise exception 'ACCOUNT_UNAVAILABLE'; end if;
 insert into public.social_credentials(organization_id,social_account_id,encrypted_token) values(p_org,account_id,p_token)
 on conflict(social_account_id) do update set encrypted_token=excluded.encrypted_token where public.social_credentials.organization_id=p_org;
 return account_id;
end $$;
revoke all on function public.connect_account(uuid,text,text,text,text) from public,anon,authenticated;
grant execute on function public.connect_account(uuid,text,text,text,text) to service_role;

create function public.create_workspace(p_user uuid,p_name text,p_display_name text,p_config jsonb) returns uuid language plpgsql security definer set search_path='' as $$
declare org uuid; begin
 perform pg_advisory_xact_lock(hashtextextended(p_user::text,0));
 if exists(select 1 from public.memberships where user_id=p_user) then raise exception 'WORKSPACE_EXISTS'; end if;
 insert into public.organizations(name) values(p_name) returning id into org;
 insert into public.memberships values(org,p_user,'owner',p_display_name);
 insert into public.business_profiles(organization_id,name) values(org,p_name);
 insert into public.ai_settings(organization_id,config) values(org,p_config);
 return org;
end $$;
revoke all on function public.create_workspace(uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function public.create_workspace(uuid,text,text,jsonb) to service_role;

create function public.is_org_admin(org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.memberships where organization_id=org and user_id=(select auth.uid()) and role in ('owner','admin')); $$;
revoke all on function public.is_org_admin(uuid) from public;
grant execute on function public.is_org_admin(uuid) to authenticated,service_role;
do $$ declare t text; begin
 foreach t in array array['ai_usage','ai_requests','audit_events'] loop
  execute format('drop policy members_read on public.%I',t);
  execute format('create policy admins_read on public.%I for select to authenticated using(public.is_org_admin(organization_id))',t);
 end loop;
end $$;

alter table public.outbox add column claimed_at timestamptz;
alter table public.drafts add column claimed_at timestamptz;
create function public.stamp_claim() returns trigger language plpgsql set search_path='' as $$ begin
 if new.status in ('sending','publishing') and old.status<>new.status then new.claimed_at=now(); end if; return new;
end $$;
create trigger outbox_claim_time before update on public.outbox for each row execute function public.stamp_claim();
create trigger draft_claim_time before update on public.drafts for each row execute function public.stamp_claim();
-- Ambiguous transport failures are never automatically retried, even after a worker restart.
create function public.reconcile_deliveries() returns void language plpgsql security definer set search_path='' as $$
declare item record; begin
 for item in update public.outbox set status='needs_review' where status='sending' and claimed_at<now()-interval '5 minutes' returning * loop
  update public.messages set delivery_status='needs_review' where organization_id=item.organization_id and id=item.message_id;
  perform public.handoff(item.organization_id,item.conversation_id,'Delivery was interrupted. Check the platform before sending again.');
 end loop;
 for item in update public.drafts set status='needs_review' where status='publishing' and claimed_at<now()-interval '5 minutes' returning * loop
  insert into public.notifications(organization_id,message) values(item.organization_id,'Publishing was interrupted. Check the platform before publishing again.');
 end loop;
end $$;
revoke all on function public.reconcile_deliveries() from public,anon,authenticated;
grant execute on function public.reconcile_deliveries() to service_role;
revoke all on function public.stamp_claim() from public,anon,authenticated;
