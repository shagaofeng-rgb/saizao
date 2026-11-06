"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { isTestVisit, measurementConsent, measurementSession, setMeasurementConsent } from "@/lib/visitor-measurement";

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
    // gtag.js reads commands from the Arguments objects in this queue.
    // eslint-disable-next-line prefer-rest-params
    window.gtag = function () { window.dataLayer?.push(arguments); };
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
      setConsent(measurementConsent() ?? (navigator.doNotTrack === "1" ? "denied" : null));
    }, 0);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (consent !== "granted" || !pathname || pathname.startsWith("/admin")) return;
    const session = measurementSession();
    if (!session) return;
    const timeout = window.setTimeout(() => {
      fetch("/api/analytics/collect", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          anonymousId: session.anonymousId,
          sessionId: session.sessionId,
          path: pathname,
          title: document.title,
          ...session.attribution,
          isTest: session.isTest,
        }),
        keepalive: true,
      }).catch(() => undefined);
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [consent, pathname]);

  useEffect(() => {
    if (consent !== "granted" || !pathname || pathname.startsWith("/admin") || isTestVisit()) return;
    loadMetaPixel(() => setPixelReady(true));
  }, [consent, pathname]);

  useEffect(() => {
    if (consent !== "granted" || !pathname || pathname.startsWith("/admin") || isTestVisit()) return;
    loadGoogleAnalytics(() => setGoogleAnalyticsReady(true));
  }, [consent, pathname]);

  useEffect(() => {
    if (consent !== "granted" || !googleAnalyticsReady || !pathname || pathname.startsWith("/admin") || isTestVisit()) return;
    const location = new URL(pathname, window.location.origin);
    const query = new URLSearchParams(window.location.search);
    for (const key of ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "gclid", "dclid", "gbraid", "wbraid"]) {
      const value = query.get(key);
      if (value) location.searchParams.set(key, value);
    }
    window.gtag?.("event", "page_view", {
      page_path: pathname,
      page_location: location.href,
      page_title: document.title,
    });
  }, [consent, googleAnalyticsReady, pathname]);

  useEffect(() => {
    if (consent !== "granted" || !pixelReady || !pathname || pathname.startsWith("/admin") || isTestVisit()) return;
    window.fbq?.("track", "PageView");
    if (pathname.startsWith("/products/") || pathname.startsWith("/applications/")) {
      window.fbq?.("track", "ViewContent", {
        content_name: document.title,
        content_category: pathname.startsWith("/products/") ? "Product" : "Application",
      });
    }
  }, [consent, pixelReady, pathname]);

  useEffect(() => {
    if (consent !== "granted" || (!pixelReady && !googleAnalyticsReady) || pathname.startsWith("/admin")) return;
    const trackContact = (event: MouseEvent) => {
      if (isTestVisit()) return;
      const target = event.target instanceof Element ? event.target.closest<HTMLAnchorElement>("a[href]") : null;
      const href = target?.getAttribute("href")?.toLowerCase() ?? "";
      if (!href.startsWith("tel:") && !href.startsWith("mailto:") && !href.includes("wa.me") && !href.includes("whatsapp")) return;
      const channel = href.startsWith("tel:") ? "Phone" : href.startsWith("mailto:") ? "Email" : "Messaging";
      window.fbq?.("track", "Contact", { content_name: channel, content_category: "Business contact" });
      window.gtag?.("event", "contact", { contact_method: channel });
    };
    document.addEventListener("click", trackContact);
    return () => document.removeEventListener("click", trackContact);
  }, [consent, pathname, pixelReady, googleAnalyticsReady]);

  function choose(value: Exclude<Consent, null>) {
    setMeasurementConsent(value);
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
