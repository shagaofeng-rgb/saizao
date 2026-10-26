-- Keep editorial focus terms and accessible cover descriptions with the article.
-- Public reads remain behind the existing server-side service-role path and RLS.
alter table public.articles add column if not exists cover_alt text;
alter table public.articles add column if not exists focus_keywords text;
