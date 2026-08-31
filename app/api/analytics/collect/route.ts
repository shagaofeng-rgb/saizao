import { createHmac } from "crypto";
import { cleanText, clientIp, fingerprint, isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";

const automatedTraffic = /(bot|crawler|spider|scrapy|headless|lighthouse|uptime|monitor|collect|axios|curl|wget|python-requests)/i;

function maskIp(value: string) {
  if (!value || value === "unknown") return null;
  if (value.includes(".")) return value.replace(/\.\d+$/, ".*");
  return value.replace(/:[^:]+$/, ":*");
}

function ipHash(value: string) {
  const salt = process.env.ANALYTICS_IP_SALT;
  if (!salt || salt.length < 32) throw new Error("ANALYTICS_IP_SALT must be at least 32 characters.");
  return createHmac("sha256", salt).update(value).digest("hex");
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ stored: false, reason: "origin" }, { status: 403 });
  if (requestBodyTooLarge(request, 20_000)) return Response.json({ stored: false, reason: "payload" }, { status: 413 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json")) return Response.json({ stored: false, reason: "content_type" }, { status: 415 });
  if (!isSupabaseConfigured()) return Response.json({ stored: false, reason: "not_configured" }, { status: 202 });

  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body) return Response.json({ stored: false, reason: "invalid_json" }, { status: 400 });

  const anonymousId = cleanText(body.anonymousId, 100);
  const sessionId = cleanText(body.sessionId, 100);
  const path = cleanText(body.path, 500);
  if (!/^v_[a-f0-9-]{30,}$/i.test(anonymousId) || !/^s_[a-f0-9-]{30,}$/i.test(sessionId) || !path.startsWith("/") || path.startsWith("/api") || path.startsWith("/admin")) {
    return Response.json({ stored: false, reason: "invalid_event" }, { status: 400 });
  }

  const forwarded = clientIp(request);
  const userAgent = cleanText(request.headers.get("user-agent"), 512);
  const internalIps = (process.env.INTERNAL_IPS ?? "").split(",").map((value) => value.trim()).filter(Boolean);
  const deploymentEnvironment = process.env.VERCEL_ENV ?? process.env.NODE_ENV;
  const reasons: string[] = [];
  if (body.isTest === true || deploymentEnvironment === "preview" || deploymentEnvironment === "development") reasons.push("test_environment");
  if (forwarded !== "unknown" && internalIps.includes(forwarded)) reasons.push("internal_ip");
  if (automatedTraffic.test(userAgent)) reasons.push("automation_or_collector");

  try {
    const limit = await rpc<{ allowed: boolean }>("check_request_limit", { p_scope: "analytics", p_fingerprint: fingerprint(request, "analytics"), p_limit: 120, p_window_seconds: 60 });
    if (!limit.allowed) return Response.json({ stored: false, reason: "rate_limited" }, { status: 429 });
    await rpc("track_analytics_event", {
      p_event: {
        anonymous_id: anonymousId,
        session_key: sessionId,
        event_name: "page_view",
        page_path: path,
        page_title: cleanText(body.title, 180),
        referrer: cleanText(body.referrer, 2048) || null,
        source: cleanText(body.utmSource, 160) || null,
        medium: cleanText(body.utmMedium, 160) || null,
        campaign: cleanText(body.utmCampaign, 220) || null,
        term: cleanText(body.utmTerm, 220) || null,
        content: cleanText(body.utmContent, 220) || null,
        country_code: cleanText(request.headers.get("x-vercel-ip-country"), 8) || null,
        region: cleanText(request.headers.get("x-vercel-ip-country-region"), 80) || null,
        ip_masked: maskIp(forwarded),
        ip_hash: forwarded === "unknown" ? null : ipHash(forwarded),
        user_agent: userAgent,
        is_excluded: reasons.length > 0,
        exclusion_reason: reasons.join(",") || null,
      },
    });
  } catch {
    return Response.json({ stored: false, reason: "storage_error" }, { status: 503 });
  }

  return Response.json({ stored: true, excluded: reasons.length > 0 });
}
