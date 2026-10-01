import { NextRequest, NextResponse } from "next/server";
import { createHash, timingSafeEqual } from "crypto";
import { rest, rpc } from "@/lib/supabase-server";
export async function GET(request: NextRequest) {
  const [id, secret] = (request.cookies.get("sz_retail_payment")?.value || "").split(".");
  if (/^[0-9a-f-]{36}$/i.test(id || "") && /^[0-9a-f]{64}$/.test(secret || "")) {
    const order = (await rest<{ access_token_hash: string }[]>(`retail_orders?select=access_token_hash&id=eq.${id}&limit=1`).catch(() => ({ data: [] }))).data[0];
    if (order) { const actual = Buffer.from(createHash("sha256").update(secret).digest("hex")); const expected = Buffer.from(order.access_token_hash); if (actual.length === expected.length && timingSafeEqual(actual, expected)) await rpc("retail_cancel_order", { p_order_id: id }).catch(() => undefined); }
  }
  const response = NextResponse.redirect(new URL("/cart?payment=cancelled", request.url)); response.cookies.delete("sz_retail_payment"); return response;
}
