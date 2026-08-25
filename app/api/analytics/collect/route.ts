import { createHash } from "crypto";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";

const automatedTraffic = /(bot|crawler|spider|scrapy|headless|lighthouse|uptime|monitor|collect|axios|curl|wget|python-requests)/i;

function maskIp(value: string) {
  if (value.includes(".")) return value.replace(/\.\d+$/, ".*");
  return value.replace(/:[^:]+$/, ":*");
}

function ipHash(value: string) {
  const salt = process.env.ANALYTICS_IP_SALT ?? "replace-me-before-production";
  return createHash("sha256").update(`${salt}:${value}`).digest("hex");
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return Response.json({ stored: false, reason: "not_configured" }, { status: 202 });

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return Response.json({ message: "Invalid analytics payload." }, { status: 400 });
  }

  const anonymousId = String(body.anonymousId ?? "");
  const sessionId = String(body.sessionId ?? "");
  const path = String(body.path ?? "");
  if (!/^v_[a-z0-9-]+$/i.test(anonymousId) || !/^s_[a-z0-9-]+$/i.test(sessionId) || !path.startsWith("/")) {
    return Response.json({ message: "Invalid analytics event." }, { status: 400 });
  }

  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const userAgent = request.headers.get("user-agent") ?? "";
  const internalIps = (process.env.INTERNAL_IPS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const deploymentEnvironment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const reasons: string[] = [];

  if (body.isTest === true || deploymentEnvironment === "preview" || deploymentEnvironment === "development") reasons.push("test_environment");
  if (forwarded && internalIps.includes(forwarded)) reasons.push("internal_ip");
  if (automatedTraffic.test(userAgent)) reasons.push("automation_or_collector");

  try {
    await rpc("track_analytics_event", {
      p_event: {
        anonymous_id: anonymousId,
        session_key: sessionId,
        event_name: "page_view",
        page_path: path,
        page_title: String(body.title ?? "").slice(0, 180),
        referrer: String(body.referrer ?? "").slice(0, 2048) || null,
        source: String(body.utmSource ?? "").slice(0, 160) || null,
        medium: String(body.utmMedium ?? "").slice(0, 160) || null,
        campaign: String(body.utmCampaign ?? "").slice(0, 220) || null,
        term: String(body.utmTerm ?? "").slice(0, 220) || null,
        content: String(body.utmContent ?? "").slice(0, 220) || null,
        country_code: request.headers.get("x-vercel-ip-country") ?? null,
        region: request.headers.get("x-vercel-ip-country-region") ?? null,
        ip_masked: forwarded ? maskIp(forwarded) : null,
        ip_hash: forwarded ? ipHash(forwarded) : null,
        user_agent: userAgent.slice(0, 512),
        is_excluded: reasons.length > 0,
        exclusion_reason: reasons.join(",") || null,
      },
    });
  } catch {
    return Response.json({ stored: false, reason: "storage_error" }, { status: 503 });
  }

  return Response.json({ stored: true, excluded: reasons.length > 0 });
}
