import { createHash, timingSafeEqual } from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { capturePayPalOrder, checkoutReady, dollars } from "@/lib/paypal";
import { rest, rpc } from "@/lib/supabase-server";

type Order = { id: string; order_number: string; status: string; expires_at: string; total_minor: number; currency: string; provider_order_id: string; access_token_hash: string };
export async function GET(request: NextRequest) {
  const failure = () => NextResponse.redirect(new URL("/checkout?payment=review", request.url));
  if (!checkoutReady()) return failure();
  const [id, secret] = (request.cookies.get("sz_retail_payment")?.value || "").split(".");
  const paypalId = request.nextUrl.searchParams.get("token") || "";
  if (!/^[0-9a-f-]{36}$/i.test(id || "") || !/^[0-9a-f]{64}$/.test(secret || "") || !/^[A-Z0-9]{8,30}$/.test(paypalId)) return failure();
  try {
    const order = (await rest<Order[]>(`retail_orders?select=id,order_number,status,expires_at,total_minor,currency,provider_order_id,access_token_hash&id=eq.${id}&limit=1`)).data[0];
    if (!order || order.provider_order_id !== paypalId) return failure();
    const supplied = Buffer.from(createHash("sha256").update(secret).digest("hex")); const expected = Buffer.from(order.access_token_hash);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) return failure();
    if (order.status !== "pending" || new Date(order.expires_at).getTime() < Date.now()) return failure();
    const canCapture = await rpc<boolean>("retail_begin_capture", { p_order_id: order.id, p_provider_order_id: paypalId });
    if (!canCapture) return failure();
    const result = await capturePayPalOrder(paypalId, `capture-${order.id}`);
    const capture = result.purchase_units?.[0]?.payments?.captures?.[0];
    if (result.status !== "COMPLETED" || capture?.status !== "COMPLETED" || capture.amount.currency_code !== order.currency || capture.amount.value !== dollars(order.total_minor)) return failure();
    const paid = await rpc<boolean>("retail_mark_paid", { p_order_id: order.id, p_provider_order_id: paypalId, p_capture_id: capture.id, p_total_minor: order.total_minor, p_currency: order.currency });
    if (!paid) return failure();
    const response = NextResponse.redirect(new URL(`/order-confirmed?number=${encodeURIComponent(order.order_number)}`, request.url));
    response.cookies.delete("sz_retail_payment");
    response.cookies.set("sz_retail_confirm", `${order.id}.${secret}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/order-confirmed", maxAge: 600 });
    return response;
  } catch { return failure(); }
}
