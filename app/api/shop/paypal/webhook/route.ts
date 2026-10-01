import { NextResponse } from "next/server";
import { checkoutReady, verifyPayPalWebhook } from "@/lib/paypal";
import { rest, rpc } from "@/lib/supabase-server";
type CaptureEvent = { event_type?: string; resource?: { id?: string; status?: string; amount?: { value?: string; currency_code?: string }; supplementary_data?: { related_ids?: { order_id?: string } } } };
export async function POST(request: Request) {
  if (!checkoutReady()) return NextResponse.json({ message: "Unavailable" }, { status: 503 });
  const raw = await request.text(); if (raw.length > 200000) return NextResponse.json({ message: "Too large" }, { status: 413 });
  try {
    const event = JSON.parse(raw) as CaptureEvent;
    if (!(await verifyPayPalWebhook(request.headers, event))) return NextResponse.json({ message: "Invalid signature" }, { status: 401 });
    if (event.event_type !== "PAYMENT.CAPTURE.COMPLETED") return NextResponse.json({ ok: true });
    const providerId = event.resource?.supplementary_data?.related_ids?.order_id, captureId = event.resource?.id;
    if (!providerId || !captureId || event.resource?.status !== "COMPLETED") return NextResponse.json({ message: "Invalid capture" }, { status: 400 });
    const order = (await rest<{ id: string; total_minor: number; currency: string }[]>(`retail_orders?select=id,total_minor,currency&provider_order_id=eq.${encodeURIComponent(providerId)}&limit=1`)).data[0];
    if (!order) return NextResponse.json({ message: "Order not found" }, { status: 503 });
    if (event.resource?.amount?.currency_code !== order.currency || Math.round(Number(event.resource?.amount?.value) * 100) !== order.total_minor) return NextResponse.json({ message: "Amount mismatch" }, { status: 400 });
    const marked = await rpc<boolean>("retail_mark_paid", { p_order_id: order.id, p_provider_order_id: providerId, p_capture_id: captureId, p_total_minor: order.total_minor, p_currency: order.currency });
    return marked ? NextResponse.json({ ok: true }) : NextResponse.json({ message: "Order requires reconciliation" }, { status: 503 });
  } catch { return NextResponse.json({ message: "Verification unavailable" }, { status: 503 }); }
}
