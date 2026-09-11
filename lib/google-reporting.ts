import "server-only";
import { createSign } from "crypto";

type ServiceAccount = { client_email: string; private_key: string; token_uri?: string; type?: string };
type SearchRow = { keys?: string[]; clicks?: number; impressions?: number; ctr?: number; position?: number };
type GoogleSection<T> = { state: "ready"; data: T } | { state: "not_configured" | "not_authorized" | "unavailable" };

export type GoogleReporting = {
  searchConsole: GoogleSection<{
    siteUrl: string;
    queries: SearchRow[];
    pages: SearchRow[];
    totals: { clicks: number; impressions: number; ctr: number; position: number };
  }>;
  analytics: GoogleSection<{ users: number; sessions: number; pageViews: number; keyEvents: number }>;
};

function base64Url(value: string) {
  return Buffer.from(value).toString("base64url");
}

function credential() {
  const value = process.env.GOOGLE_SERVICE_ACCOUNT_JSON;
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as ServiceAccount;
    if (parsed.type !== "service_account" || !parsed.client_email || !parsed.private_key) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function accessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000);
  const header = base64Url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const claim = base64Url(JSON.stringify({
    iss: account.client_email,
    scope: "https://www.googleapis.com/auth/webmasters.readonly https://www.googleapis.com/auth/analytics.readonly",
    aud: account.token_uri ?? "https://oauth2.googleapis.com/token",
    iat: now,
    exp: now + 3600,
  }));
  const signer = createSign("RSA-SHA256");
  signer.update(`${header}.${claim}`);
  const assertion = `${header}.${claim}.${signer.sign(account.private_key, "base64url")}`;
  const response = await fetch(account.token_uri ?? "https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
    cache: "no-store",
  });
  const body = await response.json().catch(() => null) as { access_token?: string } | null;
  if (!response.ok || !body?.access_token) throw new Error("Google token unavailable");
  return body.access_token;
}

async function googleJson<T>(url: string, token: string, init: RequestInit = {}) {
  const response = await fetch(url, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...init.headers },
    cache: "no-store",
  });
  if (!response.ok) {
    const error = new Error("Google API unavailable") as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return response.json() as Promise<T>;
}

function normalizedSite(value: string) {
  try {
    const url = new URL(value.replace(/^sc-domain:/, "https://"));
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return value.replace(/^sc-domain:/, "").replace(/^www\./, "").replace(/\/$/, "").toLowerCase();
  }
}

async function searchConsoleReport(token: string, startDate: string, endDate: string): Promise<GoogleReporting["searchConsole"]> {
  try {
    const requestedSite = process.env.GOOGLE_SEARCH_CONSOLE_SITE_URL ?? "https://www.szxj6899.com/";
    const sites = await googleJson<{ siteEntry?: { siteUrl: string; permissionLevel?: string }[] }>("https://www.googleapis.com/webmasters/v3/sites", token);
    const candidates = sites.siteEntry ?? [];
    const site = candidates.find((item) => item.siteUrl === requestedSite)
      ?? candidates.find((item) => normalizedSite(item.siteUrl) === normalizedSite(requestedSite));
    if (!site) return { state: "not_authorized" };
    const query = async (dimensions: string[]) => googleJson<{ rows?: SearchRow[] }>(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site.siteUrl)}/searchAnalytics/query`,
      token,
      { method: "POST", body: JSON.stringify({ startDate, endDate, dimensions, rowLimit: 10, type: "web" }) },
    );
    const [queries, pages, totals] = await Promise.all([query(["query"]), query(["page"]), query([])]);
    const total = totals.rows?.[0] ?? {};
    return { state: "ready", data: {
      siteUrl: site.siteUrl,
      queries: queries.rows ?? [],
      pages: pages.rows ?? [],
      totals: { clicks: total.clicks ?? 0, impressions: total.impressions ?? 0, ctr: total.ctr ?? 0, position: total.position ?? 0 },
    } };
  } catch (error) {
    return { state: (error as { status?: number }).status === 401 || (error as { status?: number }).status === 403 ? "not_authorized" : "unavailable" };
  }
}

async function analytics(token: string, startDate: string, endDate: string): Promise<GoogleReporting["analytics"]> {
  const propertyId = process.env.GOOGLE_ANALYTICS_PROPERTY_ID?.replace(/^properties\//, "");
  if (!propertyId) return { state: "not_configured" };
  try {
    const result = await googleJson<{ rows?: { metricValues?: { value?: string }[] }[] }>(
      `https://analyticsdata.googleapis.com/v1beta/properties/${encodeURIComponent(propertyId)}:runReport`,
      token,
      { method: "POST", body: JSON.stringify({ dateRanges: [{ startDate, endDate }], metrics: [{ name: "activeUsers" }, { name: "sessions" }, { name: "screenPageViews" }, { name: "keyEvents" }] }) },
    );
    const values = result.rows?.[0]?.metricValues ?? [];
    return { state: "ready", data: { users: Number(values[0]?.value ?? 0), sessions: Number(values[1]?.value ?? 0), pageViews: Number(values[2]?.value ?? 0), keyEvents: Number(values[3]?.value ?? 0) } };
  } catch (error) {
    return { state: (error as { status?: number }).status === 401 || (error as { status?: number }).status === 403 ? "not_authorized" : "unavailable" };
  }
}

export async function getGoogleReporting(startDate: string, endDate: string): Promise<GoogleReporting> {
  const account = credential();
  if (!account) return { searchConsole: { state: "not_configured" }, analytics: { state: "not_configured" } };
  try {
    const token = await accessToken(account);
    const [searchConsole, analyticsData] = await Promise.all([searchConsoleReport(token, startDate, endDate), analytics(token, startDate, endDate)]);
    return { searchConsole, analytics: analyticsData };
  } catch {
    return { searchConsole: { state: "unavailable" }, analytics: { state: "unavailable" } };
  }
}
