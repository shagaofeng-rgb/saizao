"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const visitorCookie = "sz_visitor_id";
const sessionKey = "sz_session_id";
const consentKey = "sz_analytics_consent_v1";
type Consent = "granted" | "denied" | null;

function id(prefix: string) {
  return `${prefix}_${crypto.randomUUID()}`;
}

function readCookie(name: string) {
  return document.cookie.split("; ").find((value) => value.startsWith(`${name}=`))?.split("=")[1];
}

function visitorId() {
  const current = readCookie(visitorCookie);
  if (current) return current;
  const next = id("v");
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${visitorCookie}=${next}; Path=/; Max-Age=34128000; SameSite=Lax${secure}`;
  return next;
}

function sessionId() {
  const current = sessionStorage.getItem(sessionKey);
  if (current) return current;
  const next = id("s");
  sessionStorage.setItem(sessionKey, next);
  return next;
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | undefined>(undefined);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      const saved = localStorage.getItem(consentKey);
      setConsent(saved === "granted" || saved === "denied" ? saved : navigator.doNotTrack === "1" ? "denied" : null);
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (consent !== "granted" || !pathname || pathname.startsWith("/admin")) return;
    const timeout = window.setTimeout(() => {
      const query = new URLSearchParams(window.location.search);
      fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId: visitorId(),
          sessionId: sessionId(),
          path: pathname,
          title: document.title,
          referrer: document.referrer || null,
          utmSource: query.get("utm_source"),
          utmMedium: query.get("utm_medium"),
          utmCampaign: query.get("utm_campaign"),
          utmTerm: query.get("utm_term"),
          utmContent: query.get("utm_content"),
          isTest: query.get("traffic_mode") === "test",
        }),
        keepalive: true,
      }).catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [consent, pathname]);

  function choose(value: Exclude<Consent, null>) {
    localStorage.setItem(consentKey, value);
    setConsent(value);
  }

  if (consent !== null || pathname.startsWith("/admin")) return null;
  return (
    <aside className="consent-banner" aria-label="Analytics choices">
      <p>We use optional, first-party analytics to understand which pages help business visitors. No advertising cookies are used. <Link href="/privacy">Privacy notice</Link></p>
      <div><button type="button" className="consent-secondary" onClick={() => choose("denied")}>Essential only</button><button type="button" className="consent-primary" onClick={() => choose("granted")}>Allow analytics</button></div>
    </aside>
  );
}
