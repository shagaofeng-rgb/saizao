create index if not exists leads_assigned_follow_up_idx on public.leads (assigned_to, next_follow_up_at asc nulls last);
create index if not exists leads_anonymous_id_idx on public.leads (anonymous_id) where anonymous_id is not null;
create index if not exists lead_notes_lead_created_idx on public.lead_notes (lead_id, created_at desc);
