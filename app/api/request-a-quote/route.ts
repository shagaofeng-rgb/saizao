import { insertLead, isSupabaseConfigured } from "@/lib/supabase-server";

function text(form: FormData, key: string, max = 2000) {
  return String(form.get(key) ?? "").trim().slice(0, max);
}

export async function POST(request: Request) {
  const form = await request.formData();
  const required = ["name", "email", "company", "brief"];
  const missing = required.some((key) => !text(form, key));
  if (missing) return Response.json({ message: "Please complete all required fields." }, { status: 400 });

  if (!isSupabaseConfigured()) {
    return Response.json({ message: "Our enquiry desk is being connected. Please call +86 137 0178 0563 while we complete this setup." }, { status: 503 });
  }

  try {
    await insertLead({
      name: text(form, "name", 160),
      email: text(form, "email", 254).toLowerCase(),
      company: text(form, "company", 220),
      application: text(form, "application", 160) || null,
      brief: text(form, "brief", 6000),
      country_code: request.headers.get("x-vercel-ip-country") ?? null,
      page_path: text(form, "pagePath", 500) || null,
      referrer: text(form, "referrer", 2048) || null,
      source: text(form, "utm_source", 160) || null,
      medium: text(form, "utm_medium", 160) || null,
      campaign: text(form, "utm_campaign", 220) || null,
      term: text(form, "utm_term", 220) || null,
      content: text(form, "utm_content", 220) || null,
      anonymous_id: text(form, "anonymousId", 100) || null,
    });
  } catch {
    return Response.json({ message: "We could not save your request right now. Please call +86 137 0178 0563." }, { status: 503 });
  }

  return Response.json({ message: "Thank you—your request has been received. Our export team will review your brief shortly." });
}
