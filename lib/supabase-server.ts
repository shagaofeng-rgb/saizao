type Json = Record<string, unknown>;

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export function isSupabaseConfigured() {
  return Boolean(url && serviceKey);
}

async function request(path: string, init: RequestInit = {}) {
  if (!url || !serviceKey) throw new Error("Supabase is not configured.");
  const response = await fetch(`${url}/${path}`, {
    ...init,
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });
  if (!response.ok) throw new Error(`Supabase request failed: ${response.status}`);
  return response;
}

export async function rpc<T>(functionName: string, body: Json): Promise<T> {
  const response = await request(`rest/v1/rpc/${functionName}`, {
    method: "POST",
    body: JSON.stringify(body),
  });
  return response.json() as Promise<T>;
}

export async function insertLead(lead: Json) {
  const response = await request("rest/v1/leads", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(lead),
  });
  return response.json() as Promise<Json[]>;
}
