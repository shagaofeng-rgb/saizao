type Consent = "granted" | "denied";
const consentKey = "sz_measurement_consent_v2";
const sessionKey = "sz_measurement_session";
const visitorCookie = "sz_visitor_id";
const idleTimeout = 30 * 60_000;

type Attribution = {
  referrer: string;
  utmSource: string;
  utmMedium: string;
  utmCampaign: string;
  utmTerm: string;
  utmContent: string;
};

type MeasurementSession = {
  anonymousId: string;
  sessionId: string;
  lastActivity: number;
  isTest: boolean;
  attribution: Attribution;
};

let consentInMemory: Consent | null = null;
let sessionInMemory: MeasurementSession | null = null;

export function measurementConsent(): Consent | null {
  try {
    const value = window.localStorage.getItem(consentKey);
    if (value === "granted" || value === "denied") return value;
  } catch {}
  return consentInMemory;
}

export function setMeasurementConsent(value: Consent) {
  consentInMemory = value;
  try { window.localStorage.setItem(consentKey, value); } catch {}
}

export function pageAttribution(url: URL, referrer: string): Attribution {
  let externalReferrer = "";
  try {
    const source = new URL(referrer);
    if (["https:", "http:"].includes(source.protocol) && source.hostname !== url.hostname) {
      externalReferrer = `${source.origin}${source.pathname}`.slice(0, 2048);
    }
  } catch {}
  const query = url.searchParams;
  return {
    referrer: externalReferrer,
    utmSource: query.get("utm_source")?.slice(0, 160) || "",
    utmMedium: query.get("utm_medium")?.slice(0, 160) || "",
    utmCampaign: query.get("utm_campaign")?.slice(0, 220) || "",
    utmTerm: query.get("utm_term")?.slice(0, 220) || "",
    utmContent: query.get("utm_content")?.slice(0, 220) || "",
  };
}

function storedSession() {
  if (sessionInMemory) return sessionInMemory;
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(sessionKey) || "null") as MeasurementSession | null;
    if (stored && /^s_[a-f0-9-]{30,}$/i.test(stored.sessionId)
      && /^v_[a-f0-9-]{30,}$/i.test(stored.anonymousId) && Number.isFinite(stored.lastActivity)
      && stored.attribution && typeof stored.attribution.utmSource === "string") return stored;
  } catch {}
  return null;
}

function visitorId(previous?: string) {
  const saved = document.cookie.split("; ").find((value) => value.startsWith(`${visitorCookie}=`))?.split("=")[1];
  if (saved && /^v_[a-f0-9-]{30,}$/i.test(saved)) return saved;
  const id = previous || `v_${crypto.randomUUID()}`;
  const secure = window.location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${visitorCookie}=${id}; Path=/; Max-Age=34128000; SameSite=Lax${secure}`;
  return id;
}

export function measurementSession(url = new URL(window.location.href)): MeasurementSession | null {
  if (measurementConsent() !== "granted") return null;
  try {
    const now = Date.now();
    const previous = storedSession();
    const page = pageAttribution(url, document.referrer);
    const isTest = url.searchParams.get("traffic_mode") === "test" || previous?.isTest === true;
    const continueSession = previous && now - previous.lastActivity < idleTimeout && previous.isTest === isTest;
    const session = continueSession ? { ...previous, lastActivity: now } : {
      anonymousId: visitorId(previous?.anonymousId),
      sessionId: `s_${crypto.randomUUID()}`,
      lastActivity: now,
      isTest,
      attribution: {
        ...page,
        referrer: previous?.attribution.referrer === page.referrer && !page.utmSource ? "" : page.referrer,
      },
    };
    sessionInMemory = session;
    try { window.sessionStorage.setItem(sessionKey, JSON.stringify(session)); } catch {}
    return session;
  } catch { return null; }
}

export function isTestVisit() {
  return new URLSearchParams(window.location.search).get("traffic_mode") === "test" || storedSession()?.isTest === true;
}
