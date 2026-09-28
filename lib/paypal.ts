import "server-only";
import { siteUrl } from "@/lib/site-data";

export function checkoutReady() {
  return process.env.RETAIL_CHECKOUT_ENABLED === "true" && Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET && process.env.PAYPAL_WEBHOOK_ID) && (process.env.NODE_ENV !== "production" || process.env.PAYPAL_ENV === "live");
}
const apiBase = () => process.env.PAYPAL_ENV === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";
async function token() {
  const id = process.env.PAYPAL_CLIENT_ID, secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PayPal is not configured");
  const response = await fetch(`${apiBase()}/v1/oauth2/token`, { method: "POST", headers: { Authorization: `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`, "Content-Type": "application/x-www-form-urlencoded" }, body: "grant_type=client_credentials", cache: "no-store", signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error(`PayPal auth failed: ${response.status}`);
  const body = await response.json(); return String(body.access_token);
}
export async function paypalRequest<T>(path: string, body: Record<string, unknown>, requestId?: string): Promise<T> {
  const response = await fetch(`${apiBase()}${path}`, { method: "POST", headers: { Authorization: `Bearer ${await token()}`, "Content-Type": "application/json", Prefer: "return=representation", ...(requestId ? { "PayPal-Request-Id": requestId } : {}) }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`PayPal request failed: ${response.status}`);
  return response.json() as Promise<T>;
}
export const dollars = (minor: number) => (minor / 100).toFixed(2);
export type PayPalOrder = { id: string; status: string; links?: { href: string; rel: string }[]; purchase_units?: { payments?: { captures?: { id: string; status: string; amount: { currency_code: string; value: string } }[] } }[] };
export async function createPayPalOrder(order: { id: string; orderNumber: string; subtotalMinor: number; shippingMinor: number; taxMinor: number; totalMinor: number }) {
  const response = await paypalRequest<PayPalOrder>("/v2/checkout/orders", { intent: "CAPTURE", purchase_units: [{ reference_id: order.id, invoice_id: order.orderNumber, custom_id: order.id, amount: { currency_code: "USD", value: dollars(order.totalMinor), breakdown: { item_total: { currency_code: "USD", value: dollars(order.subtotalMinor) }, shipping: { currency_code: "USD", value: dollars(order.shippingMinor) }, tax_total: { currency_code: "USD", value: dollars(order.taxMinor) } } } }], payment_source: { paypal: { experience_context: { payment_method_preference: "IMMEDIATE_PAYMENT_REQUIRED", landing_page: "LOGIN", user_action: "PAY_NOW", shipping_preference: "NO_SHIPPING", return_url: `${siteUrl}/api/shop/paypal/return`, cancel_url: `${siteUrl}/api/shop/paypal/cancel` } } } }, order.id);
  const approveUrl = response.links?.find((link) => link.rel === "payer-action" || link.rel === "approve")?.href;
  if (!response.id || !approveUrl || !approveUrl.startsWith("https://www.paypal.com/") && !approveUrl.startsWith("https://www.sandbox.paypal.com/")) throw new Error("PayPal approval URL missing");
  return { id: response.id, approveUrl };
}
export async function capturePayPalOrder(id: string, requestId: string) {
  if (!/^[A-Z0-9]{8,30}$/.test(id)) throw new Error("Invalid PayPal order ID");
  return paypalRequest<PayPalOrder>(`/v2/checkout/orders/${id}/capture`, {}, requestId);
}
export async function verifyPayPalWebhook(headers: Headers, webhookEvent: unknown) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  const transmissionId = headers.get("paypal-transmission-id"), transmissionTime = headers.get("paypal-transmission-time"), certUrl = headers.get("paypal-cert-url"), authAlgo = headers.get("paypal-auth-algo"), transmissionSig = headers.get("paypal-transmission-sig");
  if (!webhookId || !transmissionId || !transmissionTime || !certUrl || !authAlgo || !transmissionSig) return false;
  const response = await paypalRequest<{ verification_status: string }>("/v1/notifications/verify-webhook-signature", { transmission_id: transmissionId, transmission_time: transmissionTime, cert_url: certUrl, auth_algo: authAlgo, transmission_sig: transmissionSig, webhook_id: webhookId, webhook_event: webhookEvent });
  return response.verification_status === "SUCCESS";
}
