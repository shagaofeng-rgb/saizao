import { after } from "next/server";
import { company } from "@/lib/site-data";
import { cleanText, fingerprint, isSameOrigin, requestBodyTooLarge } from "@/lib/request-security";
import { isSupabaseConfigured, recordLeadNotification, submitLead } from "@/lib/supabase-server";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

function field(form: FormData, key: string, max: number) {
  return cleanText(form.get(key), max);
}

async function notifyTeam(lead: Record<string, string | null>) {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_NOTIFICATION_TO;
  const from = process.env.ENQUIRY_NOTIFICATION_FROM;
  if (!apiKey || !to || !from) return "not_configured" as const;

  const lines = [
    `Name: ${lead.name}`,
    `Company: ${lead.company}`,
    `Email: ${lead.email}`,
    `Phone: ${lead.phone || "Not supplied"}`,
    `Country / region: ${lead.country_name || lead.country_code || "Not supplied"}`,
    `Application: ${lead.application || "Not supplied"}`,
    `Page: ${lead.page_path || "Unknown"}`,
    "",
    "Project brief:",
    lead.brief || "",
  ];
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `New Sai Zhao enquiry — ${lead.company}`, text: lines.join("\n"), reply_to: lead.email }),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok ? "sent" as const : "failed" as const;
  } catch {
    return "failed" as const;
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return Response.json({ message: "This request could not be verified." }, { status: 403 });
  if (requestBodyTooLarge(request, 80_000)) return Response.json({ message: "The submitted brief is too large." }, { status: 413 });
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("multipart/form-data")) return Response.json({ message: "Please submit the website form." }, { status: 415 });

  const form = await request.formData().catch(() => null);
  if (!form) return Response.json({ message: "We could not read the submitted form." }, { status: 400 });
  if (field(form, "website", 200)) return Response.json({ message: "Thank you—your request has been received." });

  const lead = {
    name: field(form, "name", 160),
    email: field(form, "email", 254).toLowerCase(),
    company: field(form, "company", 220),
    phone: field(form, "phone", 80) || null,
    country_name: field(form, "country", 120) || null,
    application: field(form, "application", 160) || null,
    brief: field(form, "brief", 6000),
    country_code: cleanText(request.headers.get("x-vercel-ip-country"), 8) || null,
    page_path: field(form, "pagePath", 500) || null,
    referrer: field(form, "referrer", 2048) || null,
    source: field(form, "utm_source", 160) || null,
    medium: field(form, "utm_medium", 160) || null,
    campaign: field(form, "utm_campaign", 220) || null,
    term: field(form, "utm_term", 220) || null,
    content: field(form, "utm_content", 220) || null,
    anonymous_id: field(form, "anonymousId", 100) || null,
    privacy_accepted_at: field(form, "privacyAccepted", 10) === "yes" ? new Date().toISOString() : null,
  };

  if (!lead.name || !lead.company || !lead.brief || !lead.privacy_accepted_at) return Response.json({ message: "Please complete all required fields and accept the privacy notice." }, { status: 400 });
  if (!emailPattern.test(lead.email)) return Response.json({ message: "Please enter a valid work email address." }, { status: 400 });
  if (lead.brief.length < 20) return Response.json({ message: "Please add a little more detail about your project." }, { status: 400 });
  if (!isSupabaseConfigured()) return Response.json({ message: `Our enquiry desk is being connected. Please call ${company.telephone} while setup is completed.` }, { status: 503 });

  try {
    const result = await submitLead(lead, fingerprint(request, "lead"));
    if (!result.stored) {
      if (result.reason === "rate_limited") return Response.json({ message: "Too many requests were submitted from this connection. Please wait and try again." }, { status: 429 });
      throw new Error("Lead was not stored.");
    }
    after(async () => {
      const notification = await notifyTeam(lead);
      await recordLeadNotification(result.id, notification).catch(() => undefined);
    });
  } catch {
    return Response.json({ message: `We could not save your request right now. Please call ${company.telephone}.` }, { status: 503 });
  }

  return Response.json({ message: "Thank you—your project brief is safely recorded. Our team will review it and contact you using the details provided." });
}
