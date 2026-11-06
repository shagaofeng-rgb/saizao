"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle, WarningCircle } from "@phosphor-icons/react";
import { isTestVisit, measurementConsent, measurementSession, pageAttribution } from "@/lib/visitor-measurement";

export function QuoteForm({ product }: { product?: { slug: string; title: string } }) {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;
    const formElement = event.currentTarget;
    setStatus("sending");
    setMessage("");

    try {
      const form = new FormData(formElement);
      if (product) form.set("brief", `Product of interest: ${product.title}\n\n${String(form.get("brief") ?? "")}`);
      const url = new URL(window.location.href);
      const session = measurementSession(url);
      const attribution = session?.attribution ?? pageAttribution(url, document.referrer);
      const measurementAllowed = measurementConsent() === "granted" && !isTestVisit();
      const metaEventId = measurementAllowed ? crypto.randomUUID?.() ?? "" : "";
      const application = String(form.get("application") ?? "");
      form.set("pagePath", product ? `${url.pathname}?${new URLSearchParams({ product: product.slug })}` : url.pathname);
      form.set("referrer", attribution.referrer);
      form.set("anonymousId", session?.anonymousId ?? "");
      form.set("metaEventId", metaEventId);
      form.set("metaTrackingAllowed", measurementAllowed && metaEventId ? "yes" : "no");
      form.set("utm_source", attribution.utmSource);
      form.set("utm_medium", attribution.utmMedium);
      form.set("utm_campaign", attribution.utmCampaign);
      form.set("utm_term", attribution.utmTerm);
      form.set("utm_content", attribution.utmContent);

      const response = await fetch("/api/request-a-quote", { method: "POST", body: form });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.message ?? "We could not submit your brief. Please try again.");
      setStatus("sent");
      setMessage(result.message || "Your enquiry has been received.");
      formElement.reset();
      if (measurementAllowed) {
        try { window.gtag?.("event", "generate_lead"); } catch {}
        try {
          if (metaEventId) window.fbq?.("track", "Lead", { content_name: application || "Fragrance enquiry", content_category: "B2B enquiry" }, { eventID: metaEventId });
        } catch {}
      }
    } catch (error) {
      setStatus("error");
      setMessage(error instanceof Error ? error.message : "We could not submit your brief. Please try again.");
    }
  }

  return (
    <form className="quote-form" onSubmit={submit} aria-busy={status === "sending"}>
      {product && <p className="quote-product-context">Product of interest: <strong>{product.title}</strong></p>}
      <div className="form-grid">
        <label>Name <span aria-hidden="true">*</span><input required name="name" autoComplete="name" maxLength={160} placeholder="Your name" /></label>
        <label>Work email <span aria-hidden="true">*</span><input required type="email" name="email" autoComplete="email" maxLength={254} placeholder="you@company.com" /></label>
        <label>Company <span aria-hidden="true">*</span><input required name="company" autoComplete="organization" maxLength={220} placeholder="Your company" /></label>
        <label>Phone / messaging app<input name="phone" autoComplete="tel" maxLength={80} placeholder="Country code + number" /></label>
        <label>Country or region<input name="country" autoComplete="country-name" maxLength={120} placeholder="Where is the project for?" /></label>
        <label>Application<select name="application" defaultValue=""><option value="">Select an application</option><option>Fine Fragrance</option><option>Candle</option><option>Home Fragrance</option><option>Home & Fabric Care</option><option>Other</option></select></label>
      </div>
      <label>Project brief <span aria-hidden="true">*</span><textarea required name="brief" minLength={20} maxLength={6000} placeholder="Tell us about the product, target market, scent direction and timing." rows={7} /></label>
      <div className="form-trap" aria-hidden="true"><label>Website<input name="website" tabIndex={-1} autoComplete="off" /></label></div>
      <label className="consent-field"><input required type="checkbox" name="privacyAccepted" value="yes" /> <span>I agree that Sai Zhao may use these details to respond to this project enquiry. See the <Link href="/privacy">privacy notice</Link>.</span></label>
      <div className="form-actions">
        <button className="button" type="submit" disabled={status === "sending"}>{status === "sending" ? "Sending your enquiry…" : <>Send enquiry <ArrowUpRight size={18} /></>}</button>
        <p>Required fields are marked with an asterisk.</p>
      </div>
      <div aria-live="polite" aria-atomic="true">
        {status === "sent" && <p className="form-message success"><CheckCircle size={19} weight="fill" />{message}</p>}
        {status === "error" && <p className="form-message error"><WarningCircle size={19} weight="fill" />{message}</p>}
      </div>
    </form>
  );
}
