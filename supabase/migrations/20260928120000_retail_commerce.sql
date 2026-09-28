-- Retail commerce foundation. All writes are server-side with the service role.
alter table public.products add column if not exists retail_enabled boolean not null default false;
alter table public.products add column if not exists subtitle text;
alter table public.products add column if not exists badge text;
alter table public.products add column if not exists hero_url text;
alter table public.products add column if not exists gallery jsonb not null default '[]'::jsonb;
alter table public.products add column if not exists detail jsonb not null default '{}'::jsonb;
alter table public.products add column if not exists is_demo boolean not null default false;

create table if not exists public.retail_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  sku text not null unique,
  label text not null,
  price_minor integer not null check (price_minor >= 0),
  compare_at_minor integer check (compare_at_minor is null or compare_at_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  stock_quantity integer not null default 0 check (stock_quantity >= 0),
  reserved_quantity integer not null default 0 check (reserved_quantity >= 0 and reserved_quantity <= stock_quantity),
  weight_grams integer not null default 0 check (weight_grams >= 0),
  image_url text,
  is_active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists retail_variants_product_idx on public.retail_variants(product_id, sort_order);

create table if not exists public.retail_shipping_zones (
  country_code text primary key check (country_code ~ '^[A-Z]{2}$'),
  country_name text not null,
  rate_minor integer not null default 0 check (rate_minor >= 0),
  free_over_minor integer check (free_over_minor is null or free_over_minor >= 0),
  tax_rate_bps integer not null default 0 check (tax_rate_bps between 0 and 10000),
  estimated_days text,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

create sequence if not exists public.retail_order_number_seq;
create table if not exists public.retail_orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  buyer_name text not null,
  buyer_email text not null,
  buyer_phone text,
  shipping_address jsonb not null,
  country_code text not null,
  currency text not null default 'USD',
  subtotal_minor integer not null check (subtotal_minor >= 0),
  shipping_minor integer not null check (shipping_minor >= 0),
  tax_minor integer not null check (tax_minor >= 0),
  total_minor integer not null check (total_minor >= 0),
  status text not null default 'pending' check (status in ('pending','paid','cancelled','expired','refunded')),
  fulfillment_status text not null default 'unfulfilled' check (fulfillment_status in ('unfulfilled','packed','shipped','delivered','cancelled')),
  payment_provider text not null default 'paypal',
  provider_order_id text unique,
  provider_capture_id text unique,
  idempotency_key text not null unique,
  access_token_hash text not null,
  tracking_number text,
  carrier text,
  customer_note text,
  admin_note text,
  expires_at timestamptz not null default (now() + interval '30 minutes'),
  paid_at timestamptz,
  shipped_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists retail_orders_recent_idx on public.retail_orders(created_at desc);
create index if not exists retail_orders_email_idx on public.retail_orders(lower(buyer_email), created_at desc);
create index if not exists retail_orders_status_idx on public.retail_orders(status, created_at desc);

create table if not exists public.retail_order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.retail_orders(id) on delete cascade,
  product_id uuid not null references public.products(id),
  variant_id uuid not null references public.retail_variants(id),
  sku text not null,
  product_title text not null,
  variant_label text not null,
  image_url text,
  quantity integer not null check (quantity between 1 and 100),
  unit_price_minor integer not null check (unit_price_minor >= 0),
  line_total_minor integer not null check (line_total_minor >= 0),
  created_at timestamptz not null default now()
);
create index if not exists retail_order_items_order_idx on public.retail_order_items(order_id);

create or replace function public.retail_expire_orders()
returns integer language plpgsql security definer set search_path = ''
as $$
declare v_order record; v_count integer := 0;
begin
  for v_order in
    select id from public.retail_orders
    where status = 'pending' and expires_at < now()
    order by expires_at limit 100 for update skip locked
  loop
    update public.retail_variants v
    set reserved_quantity = greatest(0, v.reserved_quantity - i.quantity), updated_at = now()
    from public.retail_order_items i where i.order_id = v_order.id and i.variant_id = v.id;
    update public.retail_orders set status = 'expired', updated_at = now() where id = v_order.id;
    v_count := v_count + 1;
  end loop;
  return v_count;
end;
$$;

create or replace function public.retail_reserve_order(
  p_items jsonb, p_buyer jsonb, p_country text, p_idempotency_key text, p_access_token_hash text
) returns jsonb language plpgsql security definer set search_path = ''
as $$
declare
  v_order_id uuid; v_order_number text; v_subtotal bigint := 0; v_shipping integer;
  v_tax integer; v_total bigint; v_zone public.retail_shipping_zones%rowtype;
  v_variant record; v_line record; v_lines jsonb := '[]'::jsonb; v_quantity integer;
begin
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) < 1 or jsonb_array_length(p_items) > 25
    or length(p_idempotency_key) < 24 or length(p_access_token_hash) <> 64 then
    raise exception 'Invalid order input';
  end if;
  select id, order_number into v_order_id, v_order_number
  from public.retail_orders where idempotency_key = p_idempotency_key;
  if found then return jsonb_build_object('id', v_order_id, 'orderNumber', v_order_number, 'reused', true); end if;
  perform public.retail_expire_orders();
  select * into v_zone from public.retail_shipping_zones
    where country_code = upper(p_country) and enabled = true;
  if not found then raise exception 'Delivery is unavailable for this country'; end if;
  if length(coalesce(p_buyer->>'name','')) < 2 or length(coalesce(p_buyer->>'name','')) > 160
    or length(coalesce(p_buyer->>'email','')) < 5 or length(coalesce(p_buyer->>'email','')) > 254
    or length(coalesce(p_buyer->>'address1','')) < 4 or length(coalesce(p_buyer->>'city','')) < 2
    or length(coalesce(p_buyer->>'postalCode','')) < 2 then
    raise exception 'Complete delivery details are required';
  end if;
  for v_line in
    select variant_id, sum(quantity)::integer as quantity
    from jsonb_to_recordset(p_items) as x(variant_id uuid, quantity integer)
    group by variant_id order by variant_id
  loop
    v_quantity := v_line.quantity;
    if v_line.variant_id is null or v_quantity is null or v_quantity < 1 or v_quantity > 20 then
      raise exception 'Invalid quantity';
    end if;
    select v.id, v.product_id, v.sku, v.label, v.price_minor, v.currency,
      v.stock_quantity, v.reserved_quantity, v.image_url, p.title, p.cover_url
    into v_variant from public.retail_variants v join public.products p on p.id = v.product_id
    where v.id = v_line.variant_id and v.is_active and p.status = 'published'
      and p.retail_enabled and not p.is_demo
    for update of v;
    if not found then raise exception 'Product is not available'; end if;
    if v_variant.currency <> 'USD' or v_variant.stock_quantity - v_variant.reserved_quantity < v_quantity then
      raise exception 'Insufficient stock';
    end if;
    v_subtotal := v_subtotal + v_variant.price_minor::bigint * v_quantity;
    if v_subtotal > 200000000 then raise exception 'Order exceeds limit'; end if;
    update public.retail_variants set reserved_quantity = reserved_quantity + v_quantity, updated_at = now()
      where id = v_variant.id;
    v_lines := v_lines || jsonb_build_array(jsonb_build_object(
      'productId', v_variant.product_id, 'variantId', v_variant.id, 'sku', v_variant.sku,
      'title', v_variant.title, 'label', v_variant.label, 'image', coalesce(v_variant.image_url,v_variant.cover_url),
      'quantity', v_quantity, 'unitPrice', v_variant.price_minor,
      'lineTotal', v_variant.price_minor * v_quantity
    ));
  end loop;
  v_shipping := case when v_zone.free_over_minor is not null and v_subtotal >= v_zone.free_over_minor
    then 0 else v_zone.rate_minor end;
  v_tax := round((v_subtotal + v_shipping) * v_zone.tax_rate_bps / 10000.0)::integer;
  v_total := v_subtotal + v_shipping + v_tax;
  v_order_number := 'SZ-' || to_char(now(), 'YYYYMMDD') || '-' ||
    lpad(nextval('public.retail_order_number_seq'::regclass)::text, 6, '0');
  insert into public.retail_orders (
    order_number,buyer_name,buyer_email,buyer_phone,shipping_address,country_code,
    currency,subtotal_minor,shipping_minor,tax_minor,total_minor,idempotency_key,access_token_hash
  ) values (
    v_order_number,trim(p_buyer->>'name'),lower(trim(p_buyer->>'email')),
    nullif(trim(coalesce(p_buyer->>'phone','')),''),
    jsonb_build_object('address1',p_buyer->>'address1','address2',p_buyer->>'address2',
      'city',p_buyer->>'city','region',p_buyer->>'region','postalCode',p_buyer->>'postalCode'),
    v_zone.country_code,'USD',v_subtotal::integer,v_shipping,v_tax,v_total::integer,
    p_idempotency_key,p_access_token_hash
  ) returning id into v_order_id;
  insert into public.retail_order_items (
    order_id,product_id,variant_id,sku,product_title,variant_label,image_url,
    quantity,unit_price_minor,line_total_minor
  )
  select v_order_id,(x->>'productId')::uuid,(x->>'variantId')::uuid,x->>'sku',
    x->>'title',x->>'label',x->>'image',(x->>'quantity')::integer,
    (x->>'unitPrice')::integer,(x->>'lineTotal')::integer
  from jsonb_array_elements(v_lines) x;
  return jsonb_build_object('id',v_order_id,'orderNumber',v_order_number,
    'subtotalMinor',v_subtotal,'shippingMinor',v_shipping,'taxMinor',v_tax,
    'totalMinor',v_total,'currency','USD','reused',false);
end;
$$;

create or replace function public.retail_cancel_order(p_order_id uuid)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_order public.retail_orders%rowtype;
begin
  select * into v_order from public.retail_orders where id = p_order_id for update;
  if not found then return false; end if;
  if v_order.status in ('cancelled','expired') then return true; end if;
  if v_order.status <> 'pending' then return false; end if;
  update public.retail_variants v
  set reserved_quantity = greatest(0, v.reserved_quantity - i.quantity), updated_at = now()
  from public.retail_order_items i where i.order_id = p_order_id and i.variant_id = v.id;
  update public.retail_orders set status='cancelled', updated_at=now() where id=p_order_id;
  return true;
end;
$$;

create or replace function public.retail_mark_paid(
  p_order_id uuid,p_provider_order_id text,p_capture_id text,p_total_minor integer,p_currency text
) returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_order public.retail_orders%rowtype; v_updated integer;
begin
  select * into v_order from public.retail_orders where id=p_order_id for update;
  if not found then return false; end if;
  if v_order.status='paid' then
    return v_order.provider_capture_id=p_capture_id and v_order.provider_order_id=p_provider_order_id;
  end if;
  if v_order.status<>'pending' or v_order.expires_at<now() or
    v_order.provider_order_id is distinct from p_provider_order_id or
    v_order.total_minor<>p_total_minor or v_order.currency<>p_currency or
    length(coalesce(p_capture_id,''))<4 then return false; end if;
  update public.retail_variants v
  set stock_quantity=v.stock_quantity-i.quantity,
      reserved_quantity=v.reserved_quantity-i.quantity,updated_at=now()
  from public.retail_order_items i where i.order_id=p_order_id and i.variant_id=v.id
    and v.reserved_quantity>=i.quantity and v.stock_quantity>=i.quantity;
  get diagnostics v_updated = row_count;
  if (select count(*) from public.retail_order_items where order_id=p_order_id) <>
     v_updated then
    raise exception 'Inventory update failed';
  end if;
  update public.retail_orders set status='paid',provider_capture_id=p_capture_id,
    paid_at=now(),updated_at=now() where id=p_order_id;
  return true;
end;
$$;

alter table public.retail_variants enable row level security;
alter table public.retail_shipping_zones enable row level security;
alter table public.retail_orders enable row level security;
alter table public.retail_order_items enable row level security;
revoke all on public.retail_variants,public.retail_shipping_zones,public.retail_orders,
  public.retail_order_items from anon,authenticated;
grant select,insert,update,delete on public.retail_variants,public.retail_shipping_zones,
  public.retail_orders,public.retail_order_items to service_role;
grant usage,select on sequence public.retail_order_number_seq to service_role;
revoke all on function public.retail_expire_orders() from public,anon,authenticated;
revoke all on function public.retail_reserve_order(jsonb,jsonb,text,text,text) from public,anon,authenticated;
revoke all on function public.retail_cancel_order(uuid) from public,anon,authenticated;
revoke all on function public.retail_mark_paid(uuid,text,text,integer,text) from public,anon,authenticated;
grant execute on function public.retail_expire_orders() to service_role;
grant execute on function public.retail_reserve_order(jsonb,jsonb,text,text,text) to service_role;
grant execute on function public.retail_cancel_order(uuid) to service_role;
grant execute on function public.retail_mark_paid(uuid,text,text,integer,text) to service_role;
