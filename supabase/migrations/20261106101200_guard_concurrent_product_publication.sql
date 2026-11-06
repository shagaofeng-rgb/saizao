-- Keep the publication check and the save under the same row lock.
create or replace function public.admin_save_retail_product_if_current(
  p_product_id uuid, p_expected_status text, p_payload jsonb, p_variants jsonb
)
returns jsonb language plpgsql set search_path = '' as $$
declare
  v_status text;
begin
  select status::text into v_status from public.products where id = p_product_id for update;
  if not found or v_status is distinct from p_expected_status then
    return jsonb_build_object('conflict', true);
  end if;
  return jsonb_build_object('data', public.admin_save_retail_product(p_product_id, p_payload, p_variants));
end;
$$;

revoke all on function public.admin_save_retail_product_if_current(uuid,text,jsonb,jsonb) from public, anon, authenticated;
grant execute on function public.admin_save_retail_product_if_current(uuid,text,jsonb,jsonb) to service_role;
