"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

const visitorCookie = "sz_visitor_id";
const sessionKey = "sz_session_id";
const consentKey = "sz_measurement_consent_v2";
type Consent = "granted" | "denied" | null;
const metaPixelId = process.env.NEXT_PUBLIC_META_PIXEL_ID?.trim();
const googleAnalyticsId = process.env.NEXT_PUBLIC_GA_MEASUREMENT_ID?.trim();

type MetaPixel = ((...args: unknown[]) => void) & {
  callMethod?: (...args: unknown[]) => void;
  queue?: unknown[][];
  loaded?: boolean;
  version?: string;
};

type GoogleTag = (...args: unknown[]) => void;

declare global {
  interface Window {
    fbq?: MetaPixel;
    _fbq?: MetaPixel;
    dataLayer?: unknown[];
    gtag?: GoogleTag;
  }
}

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

function loadMetaPixel(onReady: () => void) {
  if (!metaPixelId) return;
  if (document.documentElement.dataset.metaPixelReady === "true") {
    onReady();
    return;
  }

  const initialize = () => {
    if (document.documentElement.dataset.metaPixelReady === "true") return;
    window.fbq?.("init", metaPixelId);
    document.documentElement.dataset.metaPixelReady = "true";
    onReady();
  };

  if (window.fbq?.loaded) {
    initialize();
    return;
  }

  const queuedPixel = ((...args: unknown[]) => {
    if (queuedPixel.callMethod) queuedPixel.callMethod(...args);
    else queuedPixel.queue?.push(args);
  }) as MetaPixel;
  queuedPixel.queue = [];
  queuedPixel.loaded = true;
  queuedPixel.version = "2.0";
  window.fbq = queuedPixel;
  window._fbq = queuedPixel;

  const script = document.createElement("script");
  script.id = "meta-pixel-script";
  script.async = true;
  script.src = "https://connect.facebook.net/en_US/fbevents.js";
  script.addEventListener("load", initialize, { once: true });
  document.head.appendChild(script);
}

function loadGoogleAnalytics(onReady: () => void) {
  if (!googleAnalyticsId) return;
  if (document.documentElement.dataset.googleAnalyticsReady === "true") {
    onReady();
    return;
  }

  const initialize = () => {
    if (document.documentElement.dataset.googleAnalyticsReady === "true") return;
    window.dataLayer = window.dataLayer || [];
    window.gtag = (...args: unknown[]) => window.dataLayer?.push(args);
    window.gtag("js", new Date());
    window.gtag("config", googleAnalyticsId, { send_page_view: false });
    document.documentElement.dataset.googleAnalyticsReady = "true";
    onReady();
  };

  const existing = document.getElementById("google-analytics-script");
  if (existing) {
    existing.addEventListener("load", initialize, { once: true });
    return;
  }

  const script = document.createElement("script");
  script.id = "google-analytics-script";
  script.async = true;
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(googleAnalyticsId)}`;
  script.addEventListener("load", initialize, { once: true });
  document.head.appendChild(script);
}

export function AnalyticsTracker() {
  const pathname = usePathname();
  const [consent, setConsent] = useState<Consent | undefined>(undefined);
  const [pixelReady, setPixelReady] = useState(false);
  const [googleAnalyticsReady, setGoogleAnalyticsReady] = useState(false);

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

  useEffect(() => {
    if (consent !== "granted" || !pathname || pathname.startsWith("/admin")) return;
    loadMetaPixel(() => setPixelReady(true));
  }, [consent, pathname]);

  useEffect(() => {
    if (consent !== "granted" || !pathname || pathname.startsWith("/admin")) return;
    loadGoogleAnalytics(() => setGoogleAnalyticsReady(true));
  }, [consent, pathname]);

  useEffect(() => {
    if (!googleAnalyticsReady || !pathname || pathname.startsWith("/admin")) return;
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: window.location.href,
      page_title: document.title,
    });
  }, [googleAnalyticsReady, pathname]);

  useEffect(() => {
    if (!pixelReady || !pathname || pathname.startsWith("/admin")) return;
    window.fbq?.("track", "PageView");
    if (pathname.startsWith("/products/") || pathname.startsWith("/applications/")) {
      window.fbq?.("track", "ViewContent", {
        content_name: document.title,
        content_category: pathname.startsWith("/products/") ? "Product" : "Application",
      });
    }
  }, [pixelReady, pathname]);

  useEffect(() => {
    if (!pixelReady && !googleAnalyticsReady) return;
    const trackContact = (event: MouseEvent) => {
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      const href = target?.getAttribute("href")?.toLowerCase() ?? "";
      if (!href.startsWith("tel:") && !href.startsWith("mailto:") && !href.includes("wa.me") && !href.includes("whatsapp")) return;
      const channel = href.startsWith("tel:") ? "Phone" : href.startsWith("mailto:") ? "Email" : "Messaging";
      window.fbq?.("track", "Contact", { content_name: channel, content_category: "Business contact" });
      window.gtag?.("event", "contact", { contact_method: channel });
    };
    document.addEventListener("click", trackContact);
    return () => document.removeEventListener("click", trackContact);
  }, [pixelReady, googleAnalyticsReady]);

  function choose(value: Exclude<Consent, null>) {
    localStorage.setItem(consentKey, value);
    setConsent(value);
  }

  if (consent !== null || pathname.startsWith("/admin")) return null;
  return (
    <aside className="consent-banner" aria-label="Analytics choices">
      <p>We use optional analytics and advertising measurement cookies to understand which pages help business visitors and measure campaign enquiries. <Link href="/privacy">Privacy notice</Link></p>
      <div><button type="button" className="consent-secondary" onClick={() => choose("denied")}>Essential only</button><button type="button" className="consent-primary" onClick={() => choose("granted")}>Allow optional cookies</button></div>
    </aside>
  );
}
