-- Sai Zhao B2B Growth Console: phase 1 data layer
-- Run this once in Supabase SQL Editor before enabling production tracking.

create extension if not exists pgcrypto;
create schema if not exists private;

create table if not exists private.request_limits (
  scope text not null,
  fingerprint text not null,
  window_started_at timestamptz not null,
  request_count integer not null default 1,
  primary key (scope, fingerprint, window_started_at)
);

create table if not exists public.analytics_visitors (
  id uuid primary key default gen_random_uuid(),
  anonymous_id text not null unique,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  ip_hash text,
  ip_masked text
);

create table if not exists public.analytics_sessions (
  id uuid primary key default gen_random_uuid(),
  visitor_id uuid not null references public.analytics_visitors(id) on delete cascade,
  session_key text not null unique,
  started_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  country_code text,
  region text,
  source text,
  medium text,
  campaign text,
  term text,
  content text,
  referrer text,
  is_excluded boolean not null default false,
  exclusion_reason text,
  page_count integer not null default 0
);

create table if not exists public.analytics_events (
  id bigint generated always as identity primary key,
  visitor_id uuid not null references public.analytics_visitors(id) on delete cascade,
  session_id uuid not null references public.analytics_sessions(id) on delete cascade,
  created_at timestamptz not null default now(),
  event_name text not null,
  page_path text,
  page_title text,
  user_agent text,
  is_excluded boolean not null default false,
  exclusion_reason text
);

create table if not exists public.traffic_rules (
  id uuid primary key default gen_random_uuid(),
  rule_name text not null,
  rule_type text not null check (rule_type in ('ip', 'user_agent', 'referrer', 'environment')),
  match_value text not null,
  action text not null default 'exclude' check (action in ('exclude', 'review')),
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  status text not null default 'New',
  name text not null,
  email text not null,
  company text not null,
  application text,
  brief text not null,
  country_code text,
  country_name text,
  phone text,
  page_path text,
  referrer text,
  source text,
  medium text,
  campaign text,
  term text,
  content text,
  anonymous_id text,
  assigned_to uuid,
  next_follow_up_at timestamptz,
  privacy_accepted_at timestamptz,
  notification_status text not null default 'pending' check (notification_status in ('pending', 'sent', 'not_configured', 'failed'))
);

alter table public.leads add column if not exists country_name text;
alter table public.leads add column if not exists privacy_accepted_at timestamptz;
alter table public.leads add column if not exists notification_status text not null default 'pending';

create index if not exists analytics_sessions_started_at_idx on public.analytics_sessions (started_at desc);
create index if not exists analytics_sessions_visitor_idx on public.analytics_sessions (visitor_id, started_at desc);
create index if not exists analytics_events_created_at_idx on public.analytics_events (created_at desc);
create index if not exists analytics_events_session_idx on public.analytics_events (session_id, created_at desc);
create index if not exists leads_created_at_idx on public.leads (created_at desc);
create index if not exists leads_status_idx on public.leads (status);

alter table public.analytics_visitors enable row level security;
alter table public.analytics_sessions enable row level security;
alter table public.analytics_events enable row level security;
alter table public.traffic_rules enable row level security;
alter table public.leads enable row level security;

-- There are deliberately no anon/authenticated policies. Only the server-side service key
-- may write/read operational data. Do not put this key in client-side variables.
revoke all on all tables in schema public from anon, authenticated;
revoke all on all sequences in schema public from anon, authenticated;
revoke all on schema private from public, anon, authenticated;
grant usage on schema public to service_role;
grant select, insert, update, delete on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;
grant usage on schema private to service_role;
grant select, insert, update, delete on all tables in schema private to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated;
alter default privileges in schema public revoke all on sequences from anon, authenticated;

create or replace function public.check_request_limit(
  p_scope text,
  p_fingerprint text,
  p_limit integer,
  p_window_seconds integer
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_window timestamptz;
  v_count integer;
begin
  if p_scope !~ '^[a-z_]{2,40}$' or length(p_fingerprint) < 32 or p_limit < 1 or p_limit > 500 or p_window_seconds < 10 or p_window_seconds > 86400 then
    return jsonb_build_object('allowed', false);
  end if;
  v_window := to_timestamp(floor(extract(epoch from now()) / p_window_seconds) * p_window_seconds);
  insert into private.request_limits (scope, fingerprint, window_started_at, request_count)
  values (p_scope, p_fingerprint, v_window, 1)
  on conflict (scope, fingerprint, window_started_at) do update
    set request_count = private.request_limits.request_count + 1
  returning request_count into v_count;
  delete from private.request_limits where window_started_at < now() - interval '2 days';
  return jsonb_build_object('allowed', v_count <= p_limit, 'remaining', greatest(p_limit - v_count, 0));
end;
$$;

revoke all on function public.check_request_limit(text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.check_request_limit(text, text, integer, integer) to service_role;

create or replace function public.submit_lead(p_lead jsonb, p_fingerprint text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_limit jsonb;
  v_id uuid;
begin
  v_limit := public.check_request_limit('lead', p_fingerprint, 5, 3600);
  if not coalesce((v_limit->>'allowed')::boolean, false) then
    return jsonb_build_object('stored', false, 'reason', 'rate_limited');
  end if;
  insert into public.leads (
    name, email, company, phone, country_name, country_code, application, brief,
    page_path, referrer, source, medium, campaign, term, content, anonymous_id, privacy_accepted_at
  ) values (
    left(p_lead->>'name', 160), left(lower(p_lead->>'email'), 254), left(p_lead->>'company', 220), nullif(left(p_lead->>'phone', 80), ''),
    nullif(left(p_lead->>'country_name', 120), ''), nullif(left(upper(p_lead->>'country_code'), 8), ''), nullif(left(p_lead->>'application', 160), ''), left(p_lead->>'brief', 6000),
    nullif(left(p_lead->>'page_path', 500), ''), nullif(left(p_lead->>'referrer', 2048), ''), nullif(left(p_lead->>'source', 160), ''),
    nullif(left(p_lead->>'medium', 160), ''), nullif(left(p_lead->>'campaign', 220), ''), nullif(left(p_lead->>'term', 220), ''),
    nullif(left(p_lead->>'content', 220), ''), nullif(left(p_lead->>'anonymous_id', 100), ''), (p_lead->>'privacy_accepted_at')::timestamptz
  )
  returning id into v_id;
  return jsonb_build_object('stored', true, 'id', v_id);
end;
$$;

revoke all on function public.submit_lead(jsonb, text) from public, anon, authenticated;
grant execute on function public.submit_lead(jsonb, text) to service_role;

create or replace function public.record_lead_notification(p_lead_id uuid, p_status text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
begin
  if p_status not in ('sent', 'not_configured', 'failed') then
    return jsonb_build_object('updated', false);
  end if;
  update public.leads set notification_status = p_status where id = p_lead_id;
  return jsonb_build_object('updated', found);
end;
$$;

revoke all on function public.record_lead_notification(uuid, text) from public, anon, authenticated;
grant execute on function public.record_lead_notification(uuid, text) to service_role;

create or replace function public.track_analytics_event(p_event jsonb)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_visitor_id uuid;
  v_session_id uuid;
  v_excluded boolean := coalesce((p_event->>'is_excluded')::boolean, false);
begin
  insert into public.analytics_visitors (anonymous_id, first_seen_at, last_seen_at, ip_hash, ip_masked)
  values (
    p_event->>'anonymous_id',
    now(),
    now(),
    nullif(p_event->>'ip_hash', ''),
    nullif(p_event->>'ip_masked', '')
  )
  on conflict (anonymous_id) do update set
    last_seen_at = excluded.last_seen_at,
    ip_hash = coalesce(excluded.ip_hash, analytics_visitors.ip_hash),
    ip_masked = coalesce(excluded.ip_masked, analytics_visitors.ip_masked)
  returning id into v_visitor_id;

  insert into public.analytics_sessions (
    visitor_id, session_key, started_at, last_seen_at, country_code, region,
    source, medium, campaign, term, content, referrer, is_excluded, exclusion_reason, page_count
  ) values (
    v_visitor_id, p_event->>'session_key', now(), now(),
    nullif(upper(p_event->>'country_code'), ''), nullif(p_event->>'region', ''),
    nullif(p_event->>'source', ''), nullif(p_event->>'medium', ''), nullif(p_event->>'campaign', ''),
    nullif(p_event->>'term', ''), nullif(p_event->>'content', ''), nullif(p_event->>'referrer', ''),
    v_excluded, nullif(p_event->>'exclusion_reason', ''), 1
  )
  on conflict (session_key) do update set
    last_seen_at = excluded.last_seen_at,
    country_code = coalesce(excluded.country_code, analytics_sessions.country_code),
    region = coalesce(excluded.region, analytics_sessions.region),
    source = coalesce(excluded.source, analytics_sessions.source),
    medium = coalesce(excluded.medium, analytics_sessions.medium),
    campaign = coalesce(excluded.campaign, analytics_sessions.campaign),
    referrer = coalesce(excluded.referrer, analytics_sessions.referrer),
    is_excluded = analytics_sessions.is_excluded or excluded.is_excluded,
    exclusion_reason = coalesce(analytics_sessions.exclusion_reason, excluded.exclusion_reason),
    page_count = analytics_sessions.page_count + 1
  returning id into v_session_id;

  insert into public.analytics_events (
    visitor_id, session_id, event_name, page_path, page_title, user_agent, is_excluded, exclusion_reason
  ) values (
    v_visitor_id, v_session_id, coalesce(nullif(p_event->>'event_name', ''), 'page_view'),
    nullif(p_event->>'page_path', ''), nullif(p_event->>'page_title', ''),
    nullif(p_event->>'user_agent', ''), v_excluded, nullif(p_event->>'exclusion_reason', '')
  );

  return jsonb_build_object('stored', true, 'excluded', v_excluded);
end;
$$;

revoke all on function public.track_analytics_event(jsonb) from public, anon, authenticated;
grant execute on function public.track_analytics_event(jsonb) to service_role;

create or replace function public.admin_dashboard(
  p_start timestamptz,
  p_end timestamptz,
  p_country text default null,
  p_source text default null,
  p_page integer default 1,
  p_page_size integer default 25
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with selected_sessions as (
  select s.*, v.anonymous_id, v.ip_masked
  from public.analytics_sessions s
  join public.analytics_visitors v on v.id = s.visitor_id
  where s.started_at >= p_start
    and s.started_at <= p_end
    and s.is_excluded = false
    and (p_country is null or s.country_code = upper(p_country))
    and (p_source is null or lower(coalesce(s.source, 'direct')) = lower(p_source))
),
selected_events as (
  select e.*
  from public.analytics_events e
  join selected_sessions s on s.id = e.session_id
  where e.is_excluded = false
),
visitor_rows as (
  select
    s.visitor_id,
    max(s.anonymous_id) as anonymous_id,
    coalesce(max(s.country_code), 'Unknown') as country,
    coalesce(max(s.source), 'Direct') as source,
    coalesce(max(s.ip_masked), '') as ip_masked,
    count(*) as visits,
    max(s.last_seen_at) as last_seen,
    (array_agg(e.page_path order by e.created_at desc))[1] as latest_page
  from selected_sessions s
  left join selected_events e on e.session_id = s.id
  group by s.visitor_id
),
ordered_visitors as (
  select * from visitor_rows order by last_seen desc
),
recent_leads as (
  select name, company, country_code, coalesce(source, 'Direct') as source, created_at, status
  from public.leads
  where created_at >= p_start and created_at <= p_end
  order by created_at desc
  limit 8
)
select jsonb_build_object(
  'metrics', jsonb_build_object(
    'visitors', (select count(*) from visitor_rows),
    'sessions', (select count(*) from selected_sessions),
    'pageViews', (select count(*) from selected_events where event_name = 'page_view'),
    'leads', (select count(*) from public.leads where created_at >= p_start and created_at <= p_end),
    'excluded', (select count(*) from public.analytics_events where created_at >= p_start and created_at <= p_end and is_excluded = true)
  ),
  'countries', coalesce((select jsonb_agg(jsonb_build_object('label', country, 'value', visits) order by visits desc) from (
    select coalesce(country_code, 'Unknown') as country, count(*) as visits from selected_sessions group by 1 order by 2 desc limit 6
  ) x), '[]'::jsonb),
  'sources', coalesce((select jsonb_agg(jsonb_build_object('label', source, 'value', visits) order by visits desc) from (
    select coalesce(source, 'Direct') as source, count(*) as visits from selected_sessions group by 1 order by 2 desc limit 6
  ) x), '[]'::jsonb),
  'pages', coalesce((select jsonb_agg(jsonb_build_object('label', page_path, 'value', views) order by views desc) from (
    select coalesce(page_path, '/') as page_path, count(*) as views from selected_events where event_name = 'page_view' group by 1 order by 2 desc limit 6
  ) x), '[]'::jsonb),
  'visitors', coalesce((select jsonb_agg(jsonb_build_object(
    'anonymousId', anonymous_id, 'country', country, 'source', source, 'visits', visits,
    'lastSeen', to_char(last_seen at time zone 'UTC', 'YYYY-MM-DD HH24:MI'),
    'latestPage', coalesce(latest_page, '/'), 'ipMasked', ip_masked, 'classification', case when visits >= 3 then 'Returning' else 'New' end
  ) order by last_seen desc) from (
    select * from ordered_visitors offset greatest((p_page - 1) * p_page_size, 0) limit least(greatest(p_page_size, 25), 100)
  ) x), '[]'::jsonb),
  'visitorTotal', (select count(*) from visitor_rows),
  'leads', coalesce((select jsonb_agg(jsonb_build_object(
    'name', name, 'company', company, 'country', coalesce(country_code, 'Unknown'), 'source', source,
    'createdAt', to_char(created_at at time zone 'UTC', 'YYYY-MM-DD HH24:MI'), 'status', status
  ) order by created_at desc) from recent_leads), '[]'::jsonb)
);
$$;

revoke all on function public.admin_dashboard(timestamptz, timestamptz, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard(timestamptz, timestamptz, text, text, integer, integer) to service_role;
