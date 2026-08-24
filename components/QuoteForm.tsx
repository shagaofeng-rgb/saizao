"use client";

import { FormEvent, useState } from "react";
import { ArrowUpRight, CheckCircle } from "@phosphor-icons/react";

function visitorId() {
  return document.cookie.split("; ").find((value) => value.startsWith("sz_visitor_id="))?.split("=")[1] ?? "";
}

export function QuoteForm() {
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("sending");
    const form = new FormData(event.currentTarget);
    const url = new URL(window.location.href);
    form.set("pagePath", url.pathname);
    form.set("referrer", document.referrer);
    form.set("anonymousId", visitorId());
    ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content"].forEach((key) => form.set(key, url.searchParams.get(key) ?? ""));
    const response = await fetch("/api/request-a-quote", { method: "POST", body: form });
    const result = await response.json();
    if (response.ok) { setStatus("sent"); setMessage(result.message); event.currentTarget.reset(); }
    else { setStatus("error"); setMessage(result.message ?? "Please try again."); }
  }

  return <form className="quote-form" onSubmit={submit}>
    <div className="form-grid"><label>Name<input required name="name" placeholder="Your name" /></label><label>Work email<input required type="email" name="email" placeholder="you@company.com" /></label><label>Company<input required name="company" placeholder="Your company" /></label><label>Application<select name="application"><option>Fine Fragrance</option><option>Candle</option><option>Home Fragrance</option><option>Home & Fabric Care</option><option>Other</option></select></label></div>
    <label>Project brief<textarea required name="brief" placeholder="Tell us about the product, target market and scent direction." rows={6} /></label>
    <button className="button" disabled={status === "sending"}>{status === "sending" ? "Sending…" : <>Share Your Brief <ArrowUpRight size={18} /></>}</button>
    {status === "sent" && <p className="form-message success"><CheckCircle size={19} weight="fill" />{message}</p>}
    {status === "error" && <p className="form-message error">{message}</p>}
  </form>;
}
