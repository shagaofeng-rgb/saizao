import { NextResponse } from "next/server";
import { rest } from "@/lib/supabase-server";
export async function GET() {
  try {
    const { data } = await rest<{ country_code: string; country_name: string; estimated_days: string | null }[]>("retail_shipping_zones?select=country_code,country_name,estimated_days&enabled=eq.true&order=country_name.asc");
    return NextResponse.json({ data });
  } catch { return NextResponse.json({ data: [] }); }
}
