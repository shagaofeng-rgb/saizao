import "server-only";

type Json = Record<string, unknown>;

const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && serviceKey);
}

async function request(path: string, init: RequestInit = {}) {
  if (!url || !serviceKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url.replace(/\/$/, "")}/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
    signal: AbortSignal.timeout(8_000),
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") ?? "unknown";
    throw new Error(`Supabase request failed (${response.status}, request ${requestId}).`);
  }
  return response;
}

export async function rpc<T>(functionName: string, body: Json): Promise<T> {
  if (!/^[a-z][a-z0-9_]*$/.test(functionName)) throw new Error("Invalid RPC name.");
  const response = await request(`rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}

export async function submitLead(lead: Json, fingerprint: string) {
  return rpc<{ stored: boolean; id: string; reason?: string }>("submit_lead", {
    p_lead: lead,
    p_fingerprint: fingerprint,
  });
}

export async function recordLeadNotification(id: string, status: "sent" | "not_configured" | "failed") {
  return rpc<{ updated: boolean }>("record_lead_notification", {
    p_lead_id: id,
    p_status: status,
  });
}
