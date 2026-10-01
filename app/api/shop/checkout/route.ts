import { createHash, randomBytes, randomUUID } from "crypto";
import { NextResponse } from "next/server";
import { checkoutReady, createPayPalOrder } from "@/lib/paypal";
import { fingerprint, isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { rest, rpc } from "@/lib/supabase-server";

type Reservation = { id: string; orderNumber: string; subtotalMinor: number; shippingMinor: number; taxMinor: number; totalMinor: number; currency: string };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  if (!checkoutReady()) return NextResponse.json({ message: "Online checkout is currently unavailable." }, { status: 503 });
  if (!isSameOrigin(request) || requestBodyTooLarge(request, 20000)) return NextResponse.json({ message: "Invalid request" }, { status: 400 });
  try { const limit = await rpc<{ allowed: boolean }>("check_request_limit", { p_scope: "retail_checkout", p_fingerprint: fingerprint(request, "retail_checkout"), p_limit: 6, p_window_seconds: 3600 }); if (!limit.allowed) return NextResponse.json({ message: "Too many checkout attempts. Please try later." }, { status: 429 }); }
  catch { return NextResponse.json({ message: "Checkout is temporarily unavailable." }, { status: 503 }); }
  const body = await request.json().catch(() => null); const items = Array.isArray(body?.items) ? body.items : [];
  const country = String(body?.country || "").toUpperCase(); const buyer = body?.buyer;
  if (!items.length || items.length > 25 || !/^[A-Z]{2}$/.test(country) || !buyer || typeof buyer !== "object" || items.some((x: { variantId?: string; quantity?: number }) => !uuid.test(String(x.variantId)) || !Number.isInteger(x.quantity) || Number(x.quantity) < 1 || Number(x.quantity) > 20)) return NextResponse.json({ message: "Please review your cart and delivery details." }, { status: 400 });
  const cleanedBuyer = { name: String(buyer.name || "").trim().slice(0, 160), email: String(buyer.email || "").trim().toLowerCase().slice(0, 254), phone: String(buyer.phone || "").trim().slice(0, 50), address1: String(buyer.address1 || "").trim().slice(0, 200), address2: String(buyer.address2 || "").trim().slice(0, 200), city: String(buyer.city || "").trim().slice(0, 100), region: String(buyer.region || "").trim().slice(0, 100), postalCode: String(buyer.postalCode || "").trim().slice(0, 40) };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanedBuyer.email) || cleanedBuyer.name.length < 2 || cleanedBuyer.address1.length < 4 || cleanedBuyer.city.length < 2 || cleanedBuyer.postalCode.length < 2) return NextResponse.json({ message: "Please complete the delivery form." }, { status: 400 });
  const secret = randomBytes(32).toString("hex"), hash = createHash("sha256").update(secret).digest("hex");
  let reservation: Reservation | null = null;
  try {
    reservation = await rpc<Reservation>("retail_reserve_order", { p_items: items.map((x: { variantId: string; quantity: number }) => ({ variant_id: x.variantId, quantity: x.quantity })), p_buyer: cleanedBuyer, p_country: country, p_idempotency_key: randomUUID(), p_access_token_hash: hash });
    const payment = await createPayPalOrder(reservation);
    const updated = await rest<{ id: string }[]>(`retail_orders?id=eq.${reservation.id}&status=eq.pending`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ provider_order_id: payment.id, updated_at: new Date().toISOString() }) });
    if (!updated.data[0]) throw new Error("Order update failed");
    const response = NextResponse.json({ approvalUrl: payment.approveUrl, orderNumber: reservation.orderNumber });
    response.cookies.set("sz_retail_payment", `${reservation.id}.${secret}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/api/shop/paypal", maxAge: 60 * 60 });
    return response;
  } catch {
    if (reservation) await rpc("retail_cancel_order", { p_order_id: reservation.id }).catch(() => undefined);
    return NextResponse.json({ message: "We could not start secure payment. Please try again." }, { status: 503 });
  }
}
