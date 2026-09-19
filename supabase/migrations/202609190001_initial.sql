-- Apply to a fresh Supabase project. All mutations go through the authenticated backend.
create table public.organizations (id uuid primary key default gen_random_uuid(), name text not null, created_at timestamptz not null default now());
create table public.memberships (organization_id uuid references public.organizations on delete cascade, user_id uuid not null references auth.users on delete cascade, role text not null check(role in ('owner','admin','agent')), display_name text not null default 'Team member', primary key(organization_id,user_id));
create table public.business_profiles (organization_id uuid primary key references public.organizations on delete cascade, name text not null, category text not null default '', description text not null default '', location text not null default '', contact text not null default '', hours text not null default '', delivery text not null default '', payments text not null default '', policies text not null default '');
create table public.ai_settings (organization_id uuid primary key references public.organizations on delete cascade, config jsonb not null default '{}');
create table public.knowledge (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade, kind text not null check(kind in ('product','faq','policy','service')), title text not null, content text not null, verified boolean not null default false, created_at timestamptz not null default now(), unique(organization_id,id));
create table public.automations (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade, name text not null, keywords text[] not null, reply text not null, enabled boolean not null default true, priority integer not null default 50, uses integer not null default 0, created_at timestamptz not null default now());
create table public.social_accounts (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade, external_id text not null, platform text not null check(platform in ('facebook','instagram')), name text not null, connected boolean not null default true, created_at timestamptz not null default now(), unique(platform,external_id), unique(organization_id,id));
-- Credentials and OAuth state have no authenticated grants or policies.
create table public.social_credentials (organization_id uuid not null, social_account_id uuid primary key, encrypted_token text not null, foreign key(organization_id,social_account_id) references public.social_accounts(organization_id,id) on delete cascade);
create table public.oauth_states (id text primary key, organization_id uuid not null references public.organizations on delete cascade, user_id uuid not null references auth.users, expires_at timestamptz not null, created_at timestamptz not null default now());
create table public.customers (id uuid primary key default gen_random_uuid(), organization_id uuid not null, social_account_id uuid not null, external_id text not null, name text not null default 'Customer', created_at timestamptz not null default now(), foreign key(organization_id,social_account_id) references public.social_accounts(organization_id,id), unique(organization_id,social_account_id,external_id), unique(organization_id,id));
create table public.conversations (id uuid primary key default gen_random_uuid(), organization_id uuid not null, customer_id uuid not null, social_account_id uuid not null, customer_name text not null default 'Customer', platform text not null, status text not null default 'open' check(status in ('open','human','resolved')), last_message text not null default '', last_incoming_at timestamptz not null default now(), assigned_to uuid, is_test boolean not null default false, summary text not null default '', summary_through timestamptz, created_at timestamptz not null default now(), updated_at timestamptz not null default now(), foreign key(organization_id,customer_id) references public.customers(organization_id,id), foreign key(organization_id,social_account_id) references public.social_accounts(organization_id,id), foreign key(organization_id,assigned_to) references public.memberships(organization_id,user_id), unique(organization_id,customer_id,social_account_id), unique(organization_id,id));
create table public.messages (id uuid primary key default gen_random_uuid(), organization_id uuid not null, conversation_id uuid not null, external_id text, direction text not null check(direction in ('inbound','outbound','note')), source text not null check(source in ('customer','ai','automation','human','system')), text text not null, delivery_status text not null default 'received', created_at timestamptz not null default now(), foreign key(organization_id,conversation_id) references public.conversations(organization_id,id), unique(organization_id,conversation_id,external_id), unique(organization_id,id));
create table public.webhook_jobs (id uuid primary key default gen_random_uuid(), organization_id uuid not null, social_account_id uuid not null, event_id text not null, sender_id text not null, text text not null, event_timestamp timestamptz not null, status text not null default 'pending' check(status in ('pending','processing','completed','failed')), attempts integer not null default 0, lease_until timestamptz, created_at timestamptz not null default now(), foreign key(organization_id,social_account_id) references public.social_accounts(organization_id,id), unique(social_account_id,event_id));
create table public.outbox (id uuid primary key default gen_random_uuid(), organization_id uuid not null, conversation_id uuid not null, message_id uuid not null, dedupe_key text not null, status text not null default 'pending' check(status in ('pending','sending','sent','needs_review','cancelled')), is_automatic boolean not null default true, created_at timestamptz not null default now(), foreign key(organization_id,conversation_id) references public.conversations(organization_id,id), foreign key(organization_id,message_id) references public.messages(organization_id,id), unique(organization_id,dedupe_key));
create table public.ai_requests (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations on delete cascade, user_id uuid references auth.users, conversation_id uuid, message_id uuid, reserved_tokens integer not null check(reserved_tokens>=0), request_status text not null default 'started', created_at timestamptz not null default now(), foreign key(organization_id,conversation_id) references public.conversations(organization_id,id), foreign key(organization_id,message_id) references public.messages(organization_id,id));
create table public.ai_usage (id uuid primary key references public.ai_requests, organization_id uuid not null references public.organizations, user_id uuid references auth.users, conversation_id uuid, message_id uuid, model text not null, provider text not null default 'openai', input_tokens integer not null default 0, output_tokens integer not null default 0, total_tokens integer not null default 0, estimated_cost numeric, request_status text not null, latency_ms integer not null, is_test boolean not null default false, created_at timestamptz not null default now(), foreign key(organization_id,conversation_id) references public.conversations(organization_id,id), foreign key(organization_id,message_id) references public.messages(organization_id,id));
create table public.drafts (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, kind text not null default 'post', title text not null, content text not null, status text not null default 'draft' check(status in ('draft','approved','scheduled','publishing','published','needs_review')), platform text not null default 'facebook', scheduled_at timestamptz, social_account_id uuid, image_url text, ai_generated boolean not null default false, created_at timestamptz not null default now(), foreign key(organization_id,social_account_id) references public.social_accounts(organization_id,id));
create table public.notifications (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, conversation_id uuid, message text not null, read boolean not null default false, created_at timestamptz not null default now(), foreign key(organization_id,conversation_id) references public.conversations(organization_id,id));
create table public.audit_events (id uuid primary key default gen_random_uuid(), organization_id uuid not null references public.organizations, user_id uuid references auth.users, action text not null, resource_id uuid, created_at timestamptz not null default now());

create function public.is_member(org uuid) returns boolean language sql stable security definer set search_path='' as $$ select exists(select 1 from public.memberships where organization_id=org and user_id=(select auth.uid())); $$;
revoke all on function public.is_member(uuid) from public;
grant execute on function public.is_member(uuid) to authenticated,service_role;
alter table public.organizations enable row level security;
create policy members_read on public.organizations for select to authenticated using(public.is_member(id));
grant select on public.organizations to authenticated;
do $$ declare t text; begin
 foreach t in array array['memberships','business_profiles','ai_settings','knowledge','automations','social_accounts','customers','conversations','messages','ai_requests','ai_usage','drafts','notifications','audit_events'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
  execute format('grant select on public.%I to authenticated',t);
  execute format('create policy members_read on public.%I for select to authenticated using(public.is_member(organization_id))',t);
  execute format('create index on public.%I(organization_id)',t);
 end loop;
 foreach t in array array['social_credentials','oauth_states','webhook_jobs','outbox'] loop
  execute format('alter table public.%I enable row level security',t);
  execute format('revoke all on public.%I from anon,authenticated',t);
 end loop;
end $$;
revoke all on public.organizations from anon;
grant all on all tables in schema public to service_role;
create index on public.messages(organization_id,conversation_id,created_at desc);
create index on public.conversations(organization_id,updated_at desc);
create index on public.ai_requests(created_at,organization_id,request_status);
create index on public.ai_usage(organization_id,created_at desc);
create index on public.ai_usage(organization_id,conversation_id);
create index on public.ai_usage(organization_id,message_id);
create index on public.ai_usage(organization_id,request_status);
create index on public.webhook_jobs(status,created_at);
create index on public.outbox(status,created_at);
create index on public.drafts(status,scheduled_at);

-- Atomic global + tenant limit reservation. Lock serializes admission across all API replicas.
create function public.reserve_ai(p_org uuid,p_user uuid,p_conversation uuid,p_tokens integer,p_rpm integer,p_day integer,p_month bigint) returns uuid language plpgsql security definer set search_path='' as $$
declare cfg jsonb; rid uuid; org_rpm integer; org_day integer; org_month bigint; begin
 perform pg_advisory_xact_lock(937410);
 select config into cfg from public.ai_settings where organization_id=p_org;
 if cfg is null then raise exception 'AI_NOT_CONFIGURED'; end if;
 org_rpm:=least(p_rpm,coalesce((cfg->>'requests_per_minute')::integer,20));
 org_day:=least(p_day,coalesce((cfg->>'requests_per_day')::integer,1000));
 org_month:=least(p_month,coalesce((cfg->>'monthly_token_limit')::bigint,1000000));
 if p_tokens<1 or p_tokens>p_month or p_tokens>org_month then raise exception 'AI_LIMIT'; end if;
 if (select count(*) from public.ai_requests where created_at>=now()-interval '1 minute')>=p_rpm or
 (select count(*) from public.ai_requests where created_at>=date_trunc('day',now()))>=p_day or
 (select count(*) from public.ai_requests where organization_id=p_org and created_at>=now()-interval '1 minute')>=org_rpm or
 (select count(*) from public.ai_requests where organization_id=p_org and created_at>=date_trunc('day',now()))>=org_day or
 (select coalesce(sum(reserved_tokens),0) from public.ai_requests where created_at>=date_trunc('month',now()))+p_tokens>p_month or
 (select coalesce(sum(reserved_tokens),0) from public.ai_requests where organization_id=p_org and created_at>=date_trunc('month',now()))+p_tokens>org_month then raise exception 'AI_LIMIT'; end if;
 insert into public.ai_requests(organization_id,user_id,conversation_id,reserved_tokens) values(p_org,p_user,p_conversation,p_tokens) returning id into rid; return rid;
end $$;
create function public.finish_ai(p_org uuid,p_id uuid,p_usage jsonb) returns void language plpgsql security definer set search_path='' as $$ begin
 insert into public.ai_usage(id,organization_id,user_id,conversation_id,message_id,model,provider,input_tokens,output_tokens,total_tokens,estimated_cost,request_status,latency_ms,is_test)
 select id,organization_id,user_id,conversation_id,message_id,p_usage->>'model',coalesce(p_usage->>'provider','openai'),coalesce((p_usage->>'input_tokens')::integer,0),coalesce((p_usage->>'output_tokens')::integer,0),coalesce((p_usage->>'total_tokens')::integer,0),(p_usage->>'estimated_cost')::numeric,p_usage->>'request_status',(p_usage->>'latency_ms')::integer,coalesce((p_usage->>'is_test')::boolean,false)
 from public.ai_requests where id=p_id and organization_id=p_org on conflict(id) do nothing;
 -- On ambiguous provider failures retain the reservation; never undercount uncertain spend.
 update public.ai_requests set request_status=p_usage->>'request_status',reserved_tokens=case when p_usage->>'total_tokens' is not null then (p_usage->>'total_tokens')::integer else reserved_tokens end where id=p_id and organization_id=p_org;
end $$;
create function public.claim_webhook() returns setof public.webhook_jobs language plpgsql security definer set search_path='' as $$ begin
 return query update public.webhook_jobs set status='processing',attempts=attempts+1,lease_until=now()+interval '3 minutes' where id=(
 select j.id from public.webhook_jobs j where (j.status='pending' or (j.status='processing' and j.lease_until<now())) and j.attempts<3
 and not exists(select 1 from public.webhook_jobs older where older.social_account_id=j.social_account_id and older.sender_id=j.sender_id and older.status in ('pending','processing') and (older.created_at,older.id)<(j.created_at,j.id))
 order by j.created_at,j.id for update skip locked limit 1) returning *;
 update public.webhook_jobs set status='failed' where status='processing' and lease_until<now() and attempts>=3;
end $$;
create function public.ingest_message(p_org uuid,p_account uuid,p_sender text,p_event text,p_text text,p_timestamp timestamptz) returns jsonb language plpgsql security definer set search_path='' as $$
declare cust uuid; conv uuid; msg uuid; plat text; begin
 select platform into plat from public.social_accounts where id=p_account and organization_id=p_org and connected=true;
 if plat is null then raise exception 'NOT_FOUND'; end if;
 insert into public.customers(organization_id,social_account_id,external_id) values(p_org,p_account,p_sender) on conflict(organization_id,social_account_id,external_id) do update set external_id=excluded.external_id returning id into cust;
 insert into public.conversations(organization_id,customer_id,social_account_id,platform) values(p_org,cust,p_account,plat) on conflict(organization_id,customer_id,social_account_id) do update set customer_id=excluded.customer_id returning id into conv;
 insert into public.messages(organization_id,conversation_id,external_id,direction,source,text,created_at) values(p_org,conv,p_event,'inbound','customer',p_text,p_timestamp) on conflict do nothing returning id into msg;
 if msg is not null then update public.conversations set last_message=p_text,last_incoming_at=greatest(last_incoming_at,p_timestamp),updated_at=now(),status=case when status='resolved' then 'open' else status end where id=conv and organization_id=p_org; end if;
 return jsonb_build_object('conversation_id',conv,'customer_id',cust,'message_id',msg,'duplicate',msg is null);
end $$;
create function public.handoff(p_org uuid,p_conversation uuid,p_reason text) returns void language plpgsql security definer set search_path='' as $$ begin
 update public.conversations set status='human',updated_at=now() where organization_id=p_org and id=p_conversation and status<>'human';
 if found then
  update public.outbox set status='cancelled' where organization_id=p_org and conversation_id=p_conversation and status='pending' and is_automatic;
  insert into public.messages(organization_id,conversation_id,direction,source,text) values(p_org,p_conversation,'note','system',p_reason);
  insert into public.notifications(organization_id,conversation_id,message) values(p_org,p_conversation,'A conversation needs your attention.');
 end if;
end $$;
create function public.queue_reply(p_org uuid,p_conversation uuid,p_text text,p_source text,p_key text,p_automatic boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare mid uuid; oid uuid; c public.conversations; begin
 select * into c from public.conversations where organization_id=p_org and id=p_conversation for update;
 if c.id is null or c.is_test or (p_automatic and c.status<>'open') then return null; end if;
 if c.last_incoming_at<now()-interval '24 hours' then return null; end if;
 select id into oid from public.outbox where organization_id=p_org and dedupe_key=p_key;
 if oid is not null then return oid; end if;
 insert into public.messages(organization_id,conversation_id,direction,source,text,delivery_status) values(p_org,p_conversation,'outbound',p_source,p_text,'queued') returning id into mid;
 insert into public.outbox(organization_id,conversation_id,message_id,dedupe_key,is_automatic) values(p_org,p_conversation,mid,p_key,p_automatic) returning id into oid;
 return oid;
end $$;
create function public.claim_outbox() returns setof public.outbox language plpgsql security definer set search_path='' as $$
declare candidate public.outbox; c public.conversations; begin
 select * into candidate from public.outbox where status='pending' order by created_at for update skip locked limit 1;
 if candidate.id is null then return; end if;
 select * into c from public.conversations where organization_id=candidate.organization_id and id=candidate.conversation_id for update;
 if c.is_test or (candidate.is_automatic and c.status<>'open') or c.last_incoming_at<now()-interval '24 hours' then
  update public.outbox set status='cancelled' where id=candidate.id;
  update public.messages set delivery_status='cancelled' where organization_id=candidate.organization_id and id=candidate.message_id;
 else return query update public.outbox set status='sending' where id=candidate.id returning *;
 end if;
end $$;
create function public.claim_post() returns setof public.drafts language plpgsql security definer set search_path='' as $$ begin
 return query update public.drafts set status='publishing' where id=(select id from public.drafts where status='scheduled' and scheduled_at<=now() and social_account_id is not null order by scheduled_at for update skip locked limit 1) returning *;
end $$;
-- RPCs are strictly service-only, including future default PUBLIC execution grants.
do $$ declare f record; begin
 for f in select p.oid::regprocedure as signature from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname='public' and p.proname in ('reserve_ai','finish_ai','claim_webhook','ingest_message','handoff','queue_reply','claim_outbox','claim_post') loop
  execute format('revoke all on function %s from public,anon,authenticated',f.signature);
  execute format('grant execute on function %s to service_role',f.signature);
 end loop;
end $$;
