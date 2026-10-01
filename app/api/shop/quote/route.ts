import { NextResponse } from "next/server";
import { rest, rpc } from "@/lib/supabase-server";
import { fingerprint, requestBodyTooLarge } from "@/lib/request-security";
import { checkoutReady } from "@/lib/paypal";

type Variant = { id: string; product_id: string; label: string; price_minor: number; currency: string; stock_quantity: number; reserved_quantity: number; is_active: boolean; products: { id: string; title: string; slug: string; cover_url: string | null; hero_url: string | null; status: string; retail_enabled: boolean; is_demo: boolean } };
type Zone = { country_code: string; country_name: string; rate_minor: number; free_over_minor: number | null; tax_rate_bps: number; estimated_days: string | null };
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export async function POST(request: Request) {
  if (requestBodyTooLarge(request, 12000)) return NextResponse.json({ message: "Cart is too large" }, { status: 400 });
  const body = await request.json().catch(() => null);
  const items = Array.isArray(body?.items) ? body.items.slice(0, 25) : [];
  const country = String(body?.country || "").toUpperCase();
  if (!items.length || items.some((x: { variantId?: string; quantity?: number }) => !uuid.test(String(x.variantId)) || !Number.isInteger(x.quantity) || Number(x.quantity) < 1 || Number(x.quantity) > 20)) return NextResponse.json({ message: "Invalid cart" }, { status: 400 });
  const ids = [...new Set(items.map((x: { variantId: string }) => x.variantId))];
  try {
    const limit = await rpc<{ allowed: boolean }>("check_request_limit", { p_scope: "retail_quote", p_fingerprint: fingerprint(request, "retail_quote"), p_limit: 80, p_window_seconds: 60 });
    if (!limit.allowed) return NextResponse.json({ message: "Too many pricing requests. Please try later." }, { status: 429 });
    await rpc("retail_expire_orders", {}).catch(() => undefined);
    const { data: variants } = await rest<Variant[]>(`retail_variants?select=id,product_id,label,price_minor,currency,stock_quantity,reserved_quantity,is_active,products(id,title,slug,cover_url,hero_url,status,retail_enabled,is_demo)&id=in.(${ids.join(",")})`);
    const lines = items.map((item: { variantId: string; quantity: number }) => {
      const variant = variants.find((v) => v.id === item.variantId);
      if (!variant || !variant.is_active || variant.currency !== "USD" || variant.products.status !== "published" || !variant.products.retail_enabled || variant.products.is_demo) throw new Error("An item is unavailable");
      return { variantId: variant.id, productId: variant.product_id, title: variant.products.title, slug: variant.products.slug, label: variant.label, image: variant.products.cover_url || variant.products.hero_url, quantity: item.quantity, unitPriceMinor: variant.price_minor, lineTotalMinor: variant.price_minor * item.quantity, available: Math.max(0, variant.stock_quantity - variant.reserved_quantity) };
    });
    const subtotalMinor = lines.reduce((sum: number, line: { lineTotalMinor: number }) => sum + line.lineTotalMinor, 0);
    let zone: Zone | null = null;
    if (/^[A-Z]{2}$/.test(country)) zone = (await rest<Zone[]>(`retail_shipping_zones?select=country_code,country_name,rate_minor,free_over_minor,tax_rate_bps,estimated_days&country_code=eq.${country}&enabled=eq.true&limit=1`)).data[0] || null;
    const shippingMinor = zone ? zone.free_over_minor !== null && subtotalMinor >= zone.free_over_minor ? 0 : zone.rate_minor : null;
    const taxMinor = zone && shippingMinor !== null ? Math.round((subtotalMinor + shippingMinor) * zone.tax_rate_bps / 10000) : null;
    return NextResponse.json({ lines, subtotalMinor, shippingMinor, taxMinor, totalMinor: shippingMinor === null || taxMinor === null ? null : subtotalMinor + shippingMinor + taxMinor, currency: "USD", zone, checkoutEnabled: checkoutReady() });
  } catch { return NextResponse.json({ message: "Cart could not be priced. Please review your items." }, { status: 400 }); }
}
