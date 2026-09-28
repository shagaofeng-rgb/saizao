import { NextResponse } from "next/server";
import { canManageStaff, getAdminSession } from "@/lib/admin-session";
import { rest, rpc } from "@/lib/supabase-server";
import { isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
const uuid = /^[0-9a-f-]{36}$/i;
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession(); const { id } = await params;
  if (!session || !canManageStaff(session.role)) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!uuid.test(id) || !isSameOrigin(request) || requestBodyTooLarge(request, 10000)) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  const body = await request.json().catch(() => null); const fulfillment_status = String(body?.fulfillment_status || "");
  if (!["unfulfilled", "packed", "shipped", "delivered"].includes(fulfillment_status)) return NextResponse.json({ message: "Invalid status" }, { status: 400 });
  try {
    const current = (await rest<{ status: string }[]>(`retail_orders?select=status&id=eq.${id}&limit=1`)).data[0];
    if (current?.status !== "paid") return NextResponse.json({ message: "只有已支付订单可更新履约状态。" }, { status: 400 });
    const tracking_number = String(body.tracking_number || "").trim().slice(0, 100) || null;
    const carrier = String(body.carrier || "").trim().slice(0, 100) || null;
    if (fulfillment_status === "shipped" && (!tracking_number || !carrier)) return NextResponse.json({ message: "发货需要填写承运商和运单号。" }, { status: 400 });
    const { data } = await rest(`retail_orders?id=eq.${id}&status=eq.paid`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ fulfillment_status, tracking_number, carrier, shipped_at: fulfillment_status === "shipped" ? new Date().toISOString() : null, updated_at: new Date().toISOString() }) });
    await rpc("admin_log_audit", { p_actor_id: session.accountId, p_action: "order_fulfillment_updated", p_entity_type: "retail_orders", p_entity_id: id, p_metadata: { fulfillment_status } }).catch(() => undefined);
    return NextResponse.json({ ok: true, data });
  } catch { return NextResponse.json({ message: "订单更新失败。" }, { status: 503 }); }
}
