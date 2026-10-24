-- Correct visitor session counts and use evidence-based referral labels.
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
    count(distinct s.id) as visits,
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
    'notificationIssues', (select count(*) from public.leads where created_at >= p_start and created_at <= p_end and notification_status in ('failed', 'not_configured')),
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
    'id', visitor_id, 'anonymousId', anonymous_id, 'country', country, 'source', source, 'visits', visits,
    'lastSeen', last_seen,
    'latestPage', coalesce(latest_page, '/'), 'ipMasked', ip_masked, 'classification', case when visits >= 3 then 'Returning' else 'New' end
  ) order by last_seen desc) from (
    select * from ordered_visitors offset greatest((p_page - 1) * least(greatest(p_page_size, 20), 100), 0) limit least(greatest(p_page_size, 20), 100)
  ) x), '[]'::jsonb),
  'visitorTotal', (select count(*) from visitor_rows),
  'leads', coalesce((select jsonb_agg(jsonb_build_object(
    'name', name, 'company', company, 'country', coalesce(country_code, 'Unknown'), 'source', source,
    'createdAt', created_at, 'status', status
  ) order by created_at desc) from recent_leads), '[]'::jsonb)
);
$$;

revoke all on function public.admin_dashboard(timestamptz, timestamptz, text, text, integer, integer) from public, anon, authenticated;
grant execute on function public.admin_dashboard(timestamptz, timestamptz, text, text, integer, integer) to service_role;

-- These legacy labels were inferred from referrers alone, not verified ad channels.
update public.analytics_sessions set source = 'meta-referral' where source = 'meta-organic';
update public.analytics_sessions set source = 'linkedin-referral' where source = 'linkedin-organic';
update public.analytics_sessions set source = 'bing-referral' where source = 'bing-organic';
update public.analytics_sessions set source = 'gemini.google.com'
where source = 'google-organic' and referrer ~* '^https?://gemini\.google\.com([/:?]|$)';
update public.analytics_sessions set source = 'google-referral' where source = 'google-organic';

-- Backfill only enquiries whose stored referrer conclusively identifies Meta.
update public.leads set source = 'meta-referral'
where source is null and referrer ~* '^https?://([a-z0-9-]+\.)*(facebook|instagram)\.com([/:?]|$)';

create index if not exists retail_order_items_product_lookup_idx on public.retail_order_items (product_id);
create index if not exists retail_order_items_variant_lookup_idx on public.retail_order_items (variant_id);
