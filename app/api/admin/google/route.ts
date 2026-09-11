import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin-session";
import { getGoogleReporting } from "@/lib/google-reporting";

export const dynamic = "force-dynamic";

function validDate(value: string | null, fallback: Date) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return fallback.toISOString().slice(0, 10);
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) ? fallback.toISOString().slice(0, 10) : value;
}

export async function GET(request: Request) {
  if (!(await hasAdminSession())) return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
  const search = new URL(request.url).searchParams;
  const end = validDate(search.get("to"), new Date());
  const fallbackStart = new Date(`${end}T00:00:00Z`);
  fallbackStart.setUTCDate(fallbackStart.getUTCDate() - 27);
  const start = validDate(search.get("from"), fallbackStart);
  return NextResponse.json({ data: await getGoogleReporting(start, end) }, { headers: { "cache-control": "private, no-store" } });
}
