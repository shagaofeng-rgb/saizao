import "server-only";
import { createHash } from "crypto";

type LeadEvent = { name: string; email: string; phone: string | null; application: string | null; pagePath: string | null; userAgent: string | null; ipAddress: string | null; fbp: string | null; fbc: string | null; eventId: string | null };

const normalize = (value: string) => value.trim().toLowerCase().replace(/\s+/g, " ");
const hash = (value: string) => createHash("sha256").update(normalize(value), "utf8").digest("hex");

export async function sendMetaLeadEvent(lead: LeadEvent) {
  const token = process.env.META_CAPI_ACCESS_TOKEN;
  const datasetId = process.env.META_CAPI_DATASET_ID;
  if (!token || !datasetId || !/^\d{8,30}$/.test(datasetId)) return false;

  const userData: Record<string, string | string[]> = { em: [hash(lead.email)] };
  if (lead.phone) userData.ph = [hash(lead.phone.replace(/[^0-9+]/g, ""))];
  if (lead.ipAddress) userData.client_ip_address = lead.ipAddress;
  if (lead.userAgent) userData.client_user_agent = lead.userAgent;
  if (lead.fbp) userData.fbp = lead.fbp;
  if (lead.fbc) userData.fbc = lead.fbc;

  const pagePath = lead.pagePath?.startsWith("/") ? lead.pagePath : "/request-a-quote";
  const response = await fetch(`https://graph.facebook.com/v23.0/${datasetId}/events`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ data: [{ event_name: "Lead", event_time: Math.floor(Date.now() / 1000), event_id: lead.eventId || undefined, action_source: "website", event_source_url: `https://www.szxj6899.com${pagePath}`, user_data: userData, custom_data: { content_name: lead.application || "Fragrance enquiry", content_category: "B2B enquiry" } }], access_token: token }),
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  return Boolean(response?.ok);
}

export function metaCookie(header: string | null, name: string) {
  const match = header?.match(new RegExp(`(?:^|;\\s*)${name.replace(/[.*+?^${}()|[\\]\\]/g, "\\$&")}=([^;]+)`));
  return match ? decodeURIComponent(match[1]).slice(0, 500) : null;
}
