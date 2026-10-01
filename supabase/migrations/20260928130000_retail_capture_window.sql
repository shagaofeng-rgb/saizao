-- Extend a still-valid reservation briefly before requesting the external capture.
create or replace function public.retail_begin_capture(p_order_id uuid, p_provider_order_id text)
returns boolean language plpgsql security definer set search_path = ''
as $$
declare v_order public.retail_orders%rowtype;
begin
  select * into v_order from public.retail_orders where id = p_order_id for update;
  if not found or v_order.status <> 'pending' or v_order.expires_at < now()
    or v_order.provider_order_id is distinct from p_provider_order_id then return false; end if;
  update public.retail_orders set expires_at = now() + interval '10 minutes', updated_at = now()
  where id = p_order_id;
  return true;
end;
$$;
revoke all on function public.retail_begin_capture(uuid,text) from public,anon,authenticated;
grant execute on function public.retail_begin_capture(uuid,text) to service_role;
