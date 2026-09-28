import { NextResponse } from "next/server";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";

export async function GET() {
  if (!(await getAdminSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  try { const { data } = await rest("retail_shipping_zones?select=*&order=country_name.asc"); return NextResponse.json({ data }); }
  catch { return NextResponse.json({ message: "无法读取配送区域。" }, { status: 503 }); }
}
export async function POST(request: Request) {
  const session = await getAdminSession();
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 10000)) return NextResponse.json({ message: "请求校验失败。" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const country_code = String(body?.country_code || "").toUpperCase().trim(); const country_name = String(body?.country_name || "").trim().slice(0, 100);
  const rate_minor = Number(body?.rate_minor), free_over_minor = body?.free_over_minor === "" || body?.free_over_minor == null ? null : Number(body.free_over_minor), tax_rate_bps = Number(body?.tax_rate_bps);
  if (!/^[A-Z]{2}$/.test(country_code) || !country_name || !Number.isInteger(rate_minor) || rate_minor < 0 || !Number.isInteger(tax_rate_bps) || tax_rate_bps < 0 || tax_rate_bps > 10000 || (free_over_minor !== null && (!Number.isInteger(free_over_minor) || free_over_minor < 0))) return NextResponse.json({ message: "请检查国家代码、运费与税率。" }, { status: 400 });
  try {
    const { data } = await rest("retail_shipping_zones?on_conflict=country_code", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=representation" }, body: JSON.stringify({ country_code, country_name, rate_minor, free_over_minor, tax_rate_bps, estimated_days: String(body?.estimated_days || "").slice(0, 100) || null, enabled: Boolean(body?.enabled), updated_at: new Date().toISOString() }) });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "shipping_zone_saved", p_entity_type: "retail_shipping_zones", p_entity_id: country_code, p_metadata: { enabled: Boolean(body?.enabled) } }).catch(() => undefined);
    return NextResponse.json({ ok: true, data });
  } catch { return NextResponse.json({ message: "配送区域保存失败。" }, { status: 400 }); }
}
