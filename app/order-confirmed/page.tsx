import Link from "next/link";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { createHash, timingSafeEqual } from "crypto";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { ClearCartAfterOrder } from "@/components/retail/ClearCartAfterOrder";
import { rest } from "@/lib/supabase-server";
export default async function OrderConfirmed({ searchParams }: { searchParams: Promise<{ number?: string }> }) {
  const [id, secret] = ((await cookies()).get("sz_retail_confirm")?.value || "").split(".");
  const number = (await searchParams).number;
  if (!/^[0-9a-f-]{36}$/i.test(id || "") || !/^[0-9a-f]{64}$/.test(secret || "") || !/^SZ-\d{8}-\d{6,}$/.test(number || "")) redirect("/cart");
  const order = (await rest<{ order_number: string; status: string; access_token_hash: string }[]>(`retail_orders?select=order_number,status,access_token_hash&id=eq.${id}&limit=1`).catch(() => ({ data: [] }))).data[0];
  if (!order || order.status !== "paid" || order.order_number !== number) redirect("/cart");
  const actual = Buffer.from(createHash("sha256").update(secret).digest("hex")), expected = Buffer.from(order.access_token_hash);
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) redirect("/cart");
  return <><SiteHeader/><main id="main-content" className="retail-order-confirmed"><ClearCartAfterOrder/><h1>Thank you for your order.</h1>{number && <p>Order reference: <strong>{number}</strong></p>}<p>We have received your payment. Please keep your order reference for support.</p><Link className="button" href="/products">Continue shopping</Link></main><SiteFooter/></>;
}
