-- Additive operational fields. Existing content, leads and orders are untouched.
alter table public.content_categories add column if not exists is_enabled boolean not null default true;
alter table public.content_categories add column if not exists show_in_nav boolean not null default true;
alter table public.content_categories add column if not exists deleted_at timestamptz;
create index if not exists content_categories_active_idx on public.content_categories(content_kind, sort_order, name) where deleted_at is null;

alter table public.media_assets add column if not exists deleted_at timestamptz;
create index if not exists media_assets_active_recent_idx on public.media_assets(created_at desc) where deleted_at is null;

alter table public.leads add column if not exists tags text[] not null default '{}';
alter table public.leads add column if not exists notification_retry_at timestamptz;
create index if not exists leads_assigned_recent_idx on public.leads(assigned_to, created_at desc);

create or replace function public.admin_claim_lead_notification_retry(p_lead_id uuid)
returns jsonb language plpgsql set search_path = '' as $$
declare v_lead public.leads%rowtype;
begin
  update public.leads set notification_status = 'pending', notification_retry_at = now()
    where id = p_lead_id and notification_status in ('failed', 'not_configured')
      and (notification_retry_at is null or notification_retry_at < now() - interval '5 minutes')
    returning * into v_lead;
  if not found then return null; end if;
  return jsonb_build_object('name', v_lead.name, 'company', v_lead.company,
    'email', v_lead.email, 'phone', v_lead.phone,
    'country_name', v_lead.country_name, 'country_code', v_lead.country_code,
    'application', v_lead.application, 'page_path', v_lead.page_path,
    'brief', v_lead.brief);
end;
$$;
revoke all on function public.admin_claim_lead_notification_retry(uuid) from public, anon, authenticated;
grant execute on function public.admin_claim_lead_notification_retry(uuid) to service_role;

create table if not exists public.content_revisions (
  id uuid primary key default gen_random_uuid(),
  entity_type text not null check (entity_type in ('products','articles')),
  entity_id uuid not null,
  snapshot jsonb not null,
  actor_id uuid,
  created_at timestamptz not null default now()
);
create index if not exists content_revisions_entity_recent_idx on public.content_revisions(entity_type, entity_id, created_at desc);
alter table public.content_revisions enable row level security;
revoke all on public.content_revisions from public, anon, authenticated;
grant select, insert on public.content_revisions to service_role;

create or replace function private.capture_content_revision()
returns trigger language plpgsql set search_path = '' as $$
begin
  if to_jsonb(old) is distinct from to_jsonb(new) then
    insert into public.content_revisions(entity_type, entity_id, snapshot, actor_id)
    values (tg_table_name, old.id, to_jsonb(old), new.updated_by);
  end if;
  return new;
end;
$$;
drop trigger if exists products_revision_before_update on public.products;
create trigger products_revision_before_update before update on public.products
for each row execute function private.capture_content_revision();
drop trigger if exists articles_revision_before_update on public.articles;
create trigger articles_revision_before_update before update on public.articles
for each row execute function private.capture_content_revision();

create table if not exists public.integration_sync_runs (
  id uuid primary key default gen_random_uuid(),
  source text not null check (source in ('google')),
  job_key text not null unique,
  status text not null check (status in ('running','completed','partial','failed')),
  period_from date not null,
  period_to date not null,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  result jsonb not null default '{}'::jsonb,
  error_code text,
  triggered_by uuid
);
create index if not exists integration_sync_runs_recent_idx on public.integration_sync_runs(source, started_at desc);
alter table public.integration_sync_runs enable row level security;
revoke all on public.integration_sync_runs from public, anon, authenticated;
grant select, insert, update on public.integration_sync_runs to service_role;

create or replace function public.admin_media_usage(p_url text)
returns jsonb language sql stable set search_path = '' as $$
  select jsonb_build_object(
    'products', coalesce((select jsonb_agg(jsonb_build_object('id', p.id, 'title', p.title))
      from public.products p where p.cover_url = p_url or p.hero_url = p_url
      or position(p_url in coalesce(p.gallery::text, '')) > 0
      or position(p_url in coalesce(p.detail::text, '')) > 0), '[]'::jsonb),
    'articles', coalesce((select jsonb_agg(jsonb_build_object('id', a.id, 'title', a.title))
      from public.articles a where a.cover_url = p_url or a.attachment_url = p_url), '[]'::jsonb)
  );
$$;
revoke all on function public.admin_media_usage(text) from public, anon, authenticated;
grant execute on function public.admin_media_usage(text) to service_role;

-- One RPC call is one Postgres transaction: product and every submitted variant
-- either save together or roll back together.
create or replace function public.admin_save_retail_product(p_product_id uuid, p_payload jsonb, p_variants jsonb)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_product public.products%rowtype;
  v_variant jsonb;
  v_variant_id uuid;
begin
  if jsonb_typeof(p_payload) <> 'object' or jsonb_typeof(p_variants) <> 'array'
     or jsonb_array_length(p_variants) > 30 then
    raise exception 'invalid product payload';
  end if;
  select * into v_product from public.products where id = p_product_id for update;
  if not found then raise exception 'product not found'; end if;
  if v_product.is_demo and p_payload->>'status' = 'published' then
    raise exception 'demo product cannot be published';
  end if;
  update public.products set
    title = p_payload->>'title', slug = p_payload->>'slug',
    category_id = nullif(p_payload->>'category_id', '')::uuid,
    subtitle = p_payload->>'subtitle', badge = p_payload->>'badge',
    summary = p_payload->>'summary', content = p_payload->>'content',
    cover_url = p_payload->>'cover_url', hero_url = p_payload->>'hero_url',
    gallery = coalesce(p_payload->'gallery', '[]'::jsonb),
    detail = coalesce(p_payload->'detail', '{}'::jsonb),
    retail_enabled = (p_payload->>'retail_enabled')::boolean,
    seo_title = p_payload->>'seo_title', seo_description = p_payload->>'seo_description',
    status = p_payload->>'status',
    published_at = case when p_payload->>'status' = 'published' then coalesce(v_product.published_at, now()) else null end,
    updated_at = now(), updated_by = nullif(p_payload->>'updated_by', '')::uuid
  where id = p_product_id returning * into v_product;
  for v_variant in select value from jsonb_array_elements(p_variants) loop
    if nullif(v_variant->>'id', '') is not null then
      update public.retail_variants set
        sku = v_variant->>'sku', label = v_variant->>'label',
        price_minor = (v_variant->>'price_minor')::integer,
        compare_at_minor = nullif(v_variant->>'compare_at_minor', '')::integer,
        stock_quantity = (v_variant->>'stock_quantity')::integer,
        weight_grams = (v_variant->>'weight_grams')::integer,
        image_url = v_variant->>'image_url',
        is_active = (v_variant->>'is_active')::boolean,
        sort_order = (v_variant->>'sort_order')::integer,
        updated_at = now()
      where id = (v_variant->>'id')::uuid and product_id = p_product_id returning id into v_variant_id;
      if v_variant_id is null then raise exception 'variant not found for product'; end if;
      v_variant_id := null;
    else
      insert into public.retail_variants(product_id, sku, label, price_minor, compare_at_minor, currency, stock_quantity, weight_grams, image_url, is_active, sort_order)
      values (p_product_id, v_variant->>'sku', v_variant->>'label', (v_variant->>'price_minor')::integer,
        nullif(v_variant->>'compare_at_minor', '')::integer, 'USD', (v_variant->>'stock_quantity')::integer,
        (v_variant->>'weight_grams')::integer, v_variant->>'image_url', (v_variant->>'is_active')::boolean,
        (v_variant->>'sort_order')::integer);
    end if;
  end loop;
  return to_jsonb(v_product);
end;
$$;
revoke all on function public.admin_save_retail_product(uuid,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_retail_product(uuid,jsonb,jsonb) to service_role;

create or replace function public.admin_content_issues(p_page integer default 1, p_page_size integer default 20)
returns jsonb language sql stable set search_path = '' as $$
  with issues as (
    select 'products'::text as entity_type, id, title, slug, updated_at,
      array_remove(array[
        case when nullif(trim(coalesce(seo_title, '')), '') is null then '缺少搜索标题' end,
        case when nullif(trim(coalesce(seo_description, '')), '') is null then '缺少搜索摘要' end,
        case when nullif(trim(coalesce(cover_url, '')), '') is null then '缺少封面图片' end
      ], null)::text[] as missing
    from public.products where status = 'published' and is_demo = false
    union all
    select 'articles'::text as entity_type, id, title, slug, updated_at,
      array_remove(array[
        case when nullif(trim(coalesce(seo_title, '')), '') is null then '缺少搜索标题' end,
        case when nullif(trim(coalesce(seo_description, '')), '') is null then '缺少搜索摘要' end,
        case when nullif(trim(coalesce(cover_url, '')), '') is null then '缺少封面图片' end
      ], null)::text[] as missing
    from public.articles where status = 'published'
  ), flagged as (select * from issues where cardinality(missing) > 0)
  select jsonb_build_object(
    'total', (select count(*) from flagged),
    'items', coalesce((select jsonb_agg(to_jsonb(item)) from (
      select * from flagged order by updated_at desc
      limit least(greatest(p_page_size, 1), 100)
      offset (greatest(p_page, 1) - 1) * least(greatest(p_page_size, 1), 100)
    ) item), '[]'::jsonb)
  );
$$;
revoke all on function public.admin_content_issues(integer,integer) from public, anon, authenticated;
grant execute on function public.admin_content_issues(integer,integer) to service_role;
