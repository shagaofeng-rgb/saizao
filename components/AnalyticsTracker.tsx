"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const visitorCookie = "sz_visitor_id";
const sessionKey = "sz_session_id";

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
  document.cookie = `${visitorCookie}=${next}; Path=/; Max-Age=34128000; SameSite=Lax`;
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

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    const query = new URLSearchParams(window.location.search);
    const payload = {
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
    };

    fetch("/api/analytics/collect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
    }).catch(() => undefined);
  }, [pathname]);

  return null;
}
