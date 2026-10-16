-- Preserve supplier taxonomy and provenance without changing checkout or permissions.
set lock_timeout = '5s';
alter table public.content_categories
  add column parent_id uuid references public.content_categories(id) on delete restrict,
  add column source_provider text,
  add column source_id text,
  add column source_url text,
  add constraint content_category_not_own_parent check (parent_id is distinct from id);
create unique index content_categories_source_unique
  on public.content_categories(source_provider, source_id) where source_id is not null;
create index content_categories_parent_idx on public.content_categories(parent_id);
alter table public.products
  add column source_provider text,
  add column source_id text,
  add column source_url text,
  add column source_synced_at timestamptz,
  add column source_snapshot jsonb;
create unique index products_source_unique
  on public.products(source_provider, source_id) where source_id is not null;
