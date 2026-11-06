-- The date selector describes activity during the chosen interval, including sessions
-- that began before it. Count the same qualifying events in the overview and visitor list.
create or replace function public.admin_dashboard(
  p_start timestamptz,
  p_end timestamptz,
  p_country text default null,
  p_source text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with period_events as (
  select e.session_id, e.page_path, e.created_at
  from public.analytics_events e
  where e.created_at between p_start and p_end
    and not e.is_excluded
    and e.event_name = 'page_view'
),
selected_sessions as (
  select s.id, s.visitor_id, s.country_code, s.source, v.anonymous_id, v.ip_masked
  from public.analytics_sessions s
  join public.analytics_visitors v on v.id = s.visitor_id
  where not s.is_excluded
    and exists (select 1 from period_events e where e.session_id = s.id)
    and (p_country is null or coalesce(s.country_code, 'UNKNOWN') = upper(p_country))
    and (p_source is null or lower(coalesce(s.source, 'Direct')) = lower(p_source))
),
selected_events as (
  select e.* from period_events e join selected_sessions s on s.id = e.session_id
),
visitor_rows as (
  select s.visitor_id, max(s.anonymous_id) as anonymous_id,
    (array_agg(coalesce(s.country_code, 'Unknown') order by e.created_at desc))[1] as country,
    (array_agg(coalesce(s.source, 'Direct') order by e.created_at desc))[1] as source,
    max(s.ip_masked) as ip_masked,
    count(distinct s.id) as visits, max(e.created_at) as last_seen,
    (array_agg(e.page_path order by e.created_at desc))[1] as latest_page
  from selected_sessions s
  join selected_events e on e.session_id = s.id
  group by s.visitor_id
),
ordered_visitors as (
  select * from visitor_rows
  order by last_seen desc, visitor_id
  offset greatest((p_page - 1) * least(greatest(p_page_size, 20), 100), 0)
  limit least(greatest(p_page_size, 20), 100)
),
period_leads as (
  select name, company, country_code, coalesce(source, 'Direct') as source,
    created_at, status, notification_status
  from public.leads
  where created_at between p_start and p_end
),
recent_leads as (
  select * from period_leads order by created_at desc limit 8
)
select jsonb_build_object(
  'metrics', jsonb_build_object(
    'visitors', (select count(*) from visitor_rows),
    'sessions', (select count(*) from selected_sessions),
    'pageViews', (select count(*) from selected_events),
    'leads', (select count(*) from period_leads),
    'notificationIssues', (select count(*) from period_leads where notification_status in ('failed', 'not_configured')),
    'excluded', (select count(*) from public.analytics_events where created_at between p_start and p_end and is_excluded)
  ),
  'countries', coalesce((select jsonb_agg(jsonb_build_object('label', country, 'value', visits) order by visits desc, country) from (
    select coalesce(country_code, 'Unknown') as country, count(*) as visits from selected_sessions group by 1 order by 2 desc, 1 limit 6
  ) x), '[]'::jsonb),
  'sources', coalesce((select jsonb_agg(jsonb_build_object('label', source, 'value', visits) order by visits desc, source) from (
    select coalesce(source, 'Direct') as source, count(*) as visits from selected_sessions group by 1 order by 2 desc, 1 limit 6
  ) x), '[]'::jsonb),
  'pages', coalesce((select jsonb_agg(jsonb_build_object('label', page_path, 'value', views) order by views desc, page_path) from (
    select page_path, count(*) as views from selected_events where page_path is not null group by 1 order by 2 desc, 1 limit 6
  ) x), '[]'::jsonb),
  'visitors', coalesce((select jsonb_agg(jsonb_build_object(
    'id', visitor_id, 'anonymousId', anonymous_id, 'country', country, 'source', source,
    'visits', visits, 'lastSeen', last_seen, 'latestPage', latest_page,
    'ipMasked', ip_masked, 'classification', case when visits >= 2 then 'Returning' else 'New' end
  ) order by last_seen desc, visitor_id) from ordered_visitors), '[]'::jsonb),
  'visitorTotal', (select count(*) from visitor_rows),
  'leads', coalesce((select jsonb_agg(jsonb_build_object(
    'name', name, 'company', company, 'country', coalesce(country_code, 'Unknown'), 'source', source,
    'createdAt', created_at, 'status', status
  ) order by created_at desc) from recent_leads), '[]'::jsonb)
);
$$;

create or replace function public.admin_list_visitors(
  p_start timestamptz,
  p_end timestamptz,
  p_country text default null,
  p_source text default null,
  p_query text default null,
  p_page integer default 1,
  p_page_size integer default 20
)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
with period_sessions as (
  select e.session_id, min(e.created_at) as first_activity, max(e.created_at) as last_activity
  from public.analytics_events e
  where e.created_at between p_start and p_end
    and not e.is_excluded
    and e.event_name = 'page_view'
  group by e.session_id
),
scoped_sessions as (
  select s.visitor_id, s.started_at, s.country_code, s.source, s.landing_page,
    e.first_activity, e.last_activity, v.anonymous_id, v.ip_masked
  from period_sessions e
  join public.analytics_sessions s on s.id = e.session_id
  join public.analytics_visitors v on v.id = s.visitor_id
  where not s.is_excluded
    and (p_country is null or coalesce(s.country_code, 'UNKNOWN') = upper(p_country))
    and (p_source is null or lower(coalesce(s.source, 'Direct')) = lower(p_source))
    and (p_query is null or p_query = '' or lower(v.anonymous_id) like '%' || lower(p_query) || '%'
      or lower(coalesce(v.ip_masked, '')) like '%' || lower(p_query) || '%')
),
rollup as (
  select visitor_id, max(anonymous_id) as anonymous_id, max(ip_masked) as ip_masked,
    count(*) as session_count, min(first_activity) as first_seen_at, max(last_activity) as last_seen_at,
    (array_agg(coalesce(country_code, 'Unknown') order by last_activity desc))[1] as country,
    (array_agg(coalesce(source, 'Direct') order by started_at asc))[1] as first_source,
    (array_agg(coalesce(source, 'Direct') order by last_activity desc))[1] as latest_source,
    (array_agg(landing_page order by started_at asc))[1] as first_landing_page
  from scoped_sessions group by visitor_id
),
paged as (
  select * from rollup order by last_seen_at desc, visitor_id
  offset greatest((p_page - 1) * least(greatest(p_page_size, 20), 100), 0)
  limit least(greatest(p_page_size, 20), 100)
)
select jsonb_build_object(
  'items', coalesce((select jsonb_agg(jsonb_build_object(
    'id', visitor_id, 'anonymousId', anonymous_id, 'ipMasked', coalesce(ip_masked, ''),
    'sessionCount', session_count, 'firstSeenAt', first_seen_at, 'lastSeenAt', last_seen_at,
    'country', country, 'firstSource', first_source, 'latestSource', latest_source,
    'firstLandingPage', first_landing_page,
    'classification', case when session_count >= 2 then 'Returning' else 'New' end
  ) order by last_seen_at desc, visitor_id) from paged), '[]'::jsonb),
  'total', (select count(*) from rollup),
  'page', greatest(p_page, 1),
  'pageSize', least(greatest(p_page_size, 20), 100)
);
$$;

revoke all on function public.admin_dashboard(timestamptz, timestamptz, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard(timestamptz, timestamptz, text, text, integer, integer) to service_role;
revoke all on function public.admin_list_visitors(timestamptz, timestamptz, text, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_list_visitors(timestamptz, timestamptz, text, text, text, integer, integer) to service_role;
