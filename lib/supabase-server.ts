import "server-only";

type Json = Record<string, unknown>;
const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() { return Boolean(url && serviceKey); }
export function supabaseUrl() {
  if (!url) throw new Error("Supabase is not configured.");
  return url.replace(/\/$/, "");
}

export async function supabaseRequest(path: string, init: RequestInit = {}) {
  if (!url || !serviceKey) throw new Error("Supabase is not configured.");
  const headers = new Headers(init.headers);
  headers.set("apikey", serviceKey);
  headers.set("Authorization", `Bearer ${serviceKey}`);
  if (typeof init.body === "string" && !headers.has("Content-Type")) headers.set("Content-Type", "application/json");
  const response = await fetch(`${supabaseUrl()}/${path.replace(/^\//, "")}`, {
    ...init, headers, cache: "no-store", signal: AbortSignal.timeout(12_000),
  });
  if (!response.ok) {
    const requestId = response.headers.get("x-request-id") ?? "unknown";
    throw new Error(`Supabase request failed (${response.status}, request ${requestId}).`);
  }
  return response;
}

export async function rpc<T>(functionName: string, body: Json): Promise<T> {
  if (!/^[a-z][a-z0-9_]*$/.test(functionName)) throw new Error("Invalid RPC name.");
  const response = await supabaseRequest(`rest/v1/rpc/${functionName}`, { method: "POST", body: JSON.stringify(body) });
  return response.json() as Promise<T>;
}
export async function rest<T>(path: string, init: RequestInit = {}) {
  const response = await supabaseRequest(`rest/v1/${path.replace(/^\//, "")}`, init);
  return { data: await response.json() as T, response };
}
export async function submitLead(lead: Json, fingerprint: string) {
  return rpc<{ stored: boolean; id: string; reason?: string }>("submit_lead", { p_lead: lead, p_fingerprint: fingerprint });
}
export async function recordLeadNotification(id: string, status: "sent" | "not_configured" | "failed") {
  return rpc<{ updated: boolean }>("record_lead_notification", { p_lead_id: id, p_status: status });
}
