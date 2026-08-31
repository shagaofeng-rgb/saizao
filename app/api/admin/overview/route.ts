import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-session";
import { isSupabaseConfigured, rpc } from "@/lib/supabase-server";

function iso(value: string | null, fallback: Date) {
  const date = value ? new Date(value) : fallback;
  return Number.isNaN(date.getTime()) ? fallback.toISOString() : date.toISOString();
}

export async function GET(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ configured: false }, { status: 503 });

  const params = new URL(request.url).searchParams;
  const now = new Date();
  const days = Math.min(Math.max(Number(params.get("days") ?? "7"), 1), 366);
  const startFallback = new Date(now.getTime() - (days - 1) * 86400000);
  const result = await rpc<Record<string, unknown>>("admin_dashboard", {
    p_start: iso(params.get("from"), startFallback),
    p_end: iso(params.get("to"), now),
    p_country: params.get("country") || null,
    p_source: params.get("source") || null,
    p_page: Math.max(Number(params.get("page") ?? "1"), 1),
    p_page_size: Math.min(Math.max(Number(params.get("pageSize") ?? "25"), 25), 100),
  }).catch(() => null);

  if (!result) return NextResponse.json({ message: "Unable to load analytics data." }, { status: 503 });
  return NextResponse.json({ configured: true, data: result });
}
