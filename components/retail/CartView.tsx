"use client";
import { FormEvent, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { readCart, writeCart, type CartLine } from "@/lib/retail-cart";
import { formatMoney } from "@/lib/retail-types";

type Quote = { lines: { variantId: string; title: string; slug: string; label: string; image: string | null; quantity: number; unitPriceMinor: number; lineTotalMinor: number; available: number }[]; subtotalMinor: number; shippingMinor: number | null; taxMinor: number | null; totalMinor: number | null; zone: { country_name: string } | null; checkoutEnabled: boolean };
export function CartView({ checkout = false, initialCountry = "", payment }: { checkout?: boolean; initialCountry?: string; payment?: string }) {
  const [lines, setLines] = useState<CartLine[] | null>(null);
  const [quote, setQuote] = useState<Quote | null>(null);
  const [message, setMessage] = useState("");
  const [country, setCountry] = useState(initialCountry);
  const [countries, setCountries] = useState<{ country_code: string; country_name: string }[]>([]);
  useEffect(() => { const timer = window.setTimeout(() => setLines(readCart()), 0); fetch("/api/shop/countries").then((r) => r.json()).then((v) => setCountries(v.data || [])).catch(() => undefined); return () => window.clearTimeout(timer); }, []);
  useEffect(() => {
    if (!lines?.length) return;
    const controller = new AbortController();
    fetch("/api/shop/quote", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items: lines.map((l) => ({ variantId: l.variantId, quantity: l.quantity })), country }), signal: controller.signal }).then(async (r) => { const v = await r.json(); if (!r.ok) throw new Error(v.message); setQuote(v); setMessage(""); }).catch((error) => { if (error.name !== "AbortError") { setQuote(null); setMessage(error.message); } });
    return () => controller.abort();
  }, [lines, country]);
  function change(id: string, quantity: number) {
    if (!lines) return;
    const next = lines.map((line) => line.variantId === id ? { ...line, quantity } : line).filter((line) => line.quantity > 0);
    if (!writeCart(next)) { setMessage("We could not update your cart. Please try again."); return; }
    setQuote(null);
    setLines(next);
  }
  const paymentMessage = payment === "cancelled" ? "Payment was cancelled. Your items are still in the cart."
    : payment === "review" ? "We could not confirm payment. If PayPal shows a charge, contact our team before trying again." : "";
  const hasStock = quote?.lines.every((line) => line.available >= line.quantity);
  return <div className="retail-cart-layout">
    <div>
      <h1>{checkout ? "Checkout" : "Your Cart"}</h1>
      {paymentMessage && <p role="status">{paymentMessage}</p>}
      {lines === null ? <p role="status">Loading your cart…</p>
        : !lines.length ? <div className="retail-cart-empty"><p>Your cart is empty.</p><Link className="retail-solid" href="/products">Explore products</Link></div>
        : <div className="retail-cart-items">{lines.map((line) => {
          const fresh = quote?.lines.find((item) => item.variantId === line.variantId);
          return <article key={line.variantId}>
            <div className="retail-cart-image">{line.image && <Image src={line.image} alt={line.title} fill sizes="90px" />}</div>
            <div><Link href={`/products/${line.slug}`}><strong>{fresh?.title || line.title}</strong></Link><p>{fresh?.label || line.label}</p><button type="button" onClick={() => change(line.variantId, 0)}>Remove</button></div>
            <div className="retail-cart-controls">
              <label>Qty <input aria-label={`Quantity for ${line.title}`} type="number" min="1" max="20" value={line.quantity} onChange={(event) => change(line.variantId, Math.min(20, Math.max(1, Math.trunc(Number(event.target.value)) || 1)))} /></label>
              <strong>{fresh ? formatMoney(fresh.lineTotalMinor) : "—"}</strong>
              {fresh && fresh.available < line.quantity && <small>Insufficient stock</small>}
            </div>
          </article>;
        })}</div>}
      {message && <p role="alert">{message}</p>}
    </div>
    {Boolean(lines?.length) && <aside className="retail-cart-summary">
      <h2>Order summary</h2>
      <label>Delivery country
        <select value={country} onChange={(event) => { setQuote(null); setCountry(event.target.value); }}>
          <option value="">Select your country</option>{countries.map((item) => <option value={item.country_code} key={item.country_code}>{item.country_name}</option>)}
        </select>
      </label>
      <dl>
        <div><dt>Subtotal</dt><dd>{quote ? formatMoney(quote.subtotalMinor) : "—"}</dd></div>
        <div><dt>Shipping</dt><dd>{quote?.shippingMinor != null ? formatMoney(quote.shippingMinor) : "—"}</dd></div>
        <div><dt>Estimated tax</dt><dd>{quote?.taxMinor != null ? formatMoney(quote.taxMinor) : "—"}</dd></div>
        <div className="retail-cart-total"><dt>Total</dt><dd>{quote?.totalMinor != null ? formatMoney(quote.totalMinor) : "—"}</dd></div>
      </dl>
      {quote && !quote.checkoutEnabled && <p className="retail-checkout-notice">Online ordering is unavailable. <Link href="/request-a-quote">Contact our team</Link>.</p>}
      {country && quote && !quote.zone && <p role="status">Online delivery is unavailable for the selected country.</p>}
      {!checkout && quote?.checkoutEnabled && hasStock && <Link className="retail-solid" href={country ? `/checkout?country=${encodeURIComponent(country)}` : "/checkout"}>Continue to checkout</Link>}
      {checkout && quote?.checkoutEnabled && <CheckoutForm country={country} lines={lines ?? []} quote={quote} />}
    </aside>}
  </div>;
}
function CheckoutForm({ country, lines, quote }: { country: string; lines: CartLine[]; quote: Quote | null }) {
  const [buyer, setBuyer] = useState({ name: "", email: "", phone: "", address1: "", address2: "", city: "", region: "", postalCode: "" });
  const [busy, setBusy] = useState(false); const [message, setMessage] = useState("");
  const ready = Boolean(quote?.checkoutEnabled && quote.zone && quote.totalMinor !== null && lines.length && quote.lines.every((line) => line.available >= line.quantity));
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!ready) return; setBusy(true); setMessage("");
    try {
      const response = await fetch("/api/shop/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ country, buyer, items: lines.map((line) => ({ variantId: line.variantId, quantity: line.quantity })) }) });
      const result = await response.json(); if (!response.ok) throw new Error(result.message || "Unable to start payment");
      if (typeof result.approvalUrl !== "string" || !result.approvalUrl.startsWith("https://")) throw new Error("Invalid payment response");
      window.location.assign(result.approvalUrl);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Unable to start payment"); setBusy(false); }
  }
  return <><h3>Delivery details</h3><form onSubmit={submit}><fieldset disabled={!ready || busy}><label>Full name<input required autoComplete="name" value={buyer.name} onChange={(e) => setBuyer({ ...buyer, name: e.target.value })} /></label><label>Email<input required type="email" autoComplete="email" value={buyer.email} onChange={(e) => setBuyer({ ...buyer, email: e.target.value })} /></label><label>Phone<input autoComplete="tel" value={buyer.phone} onChange={(e) => setBuyer({ ...buyer, phone: e.target.value })} /></label><label>Address line 1<input required autoComplete="address-line1" value={buyer.address1} onChange={(e) => setBuyer({ ...buyer, address1: e.target.value })} /></label><label>Address line 2<input autoComplete="address-line2" value={buyer.address2} onChange={(e) => setBuyer({ ...buyer, address2: e.target.value })} /></label><label>City<input required autoComplete="address-level2" value={buyer.city} onChange={(e) => setBuyer({ ...buyer, city: e.target.value })} /></label><label>State / region<input autoComplete="address-level1" value={buyer.region} onChange={(e) => setBuyer({ ...buyer, region: e.target.value })} /></label><label>Postal code<input required autoComplete="postal-code" value={buyer.postalCode} onChange={(e) => setBuyer({ ...buyer, postalCode: e.target.value })} /></label><button type="submit">{busy ? "Connecting to PayPal…" : "Pay securely with PayPal"}</button></fieldset></form>{message && <p role="alert">{message}</p>}<p><Link href="/request-a-quote">Need a custom order? Contact our team</Link></p></>;
}
