import "server-only";
import { isEmailTransportConfigured, sendSiteEmail } from "@/lib/email-delivery";

type LeadNotification = Record<string, string | null>;
export async function notifyTeam(lead: LeadNotification): Promise<"sent" | "failed" | "not_configured"> {
  const to = process.env.ENQUIRY_NOTIFICATION_TO;
  const from = process.env.ENQUIRY_NOTIFICATION_FROM;
  if (!to || !from || !isEmailTransportConfigured()) return "not_configured";
  const lines = [
    `Name: ${lead.name || ""}`, `Company: ${lead.company || ""}`, `Email: ${lead.email || ""}`,
    `Phone: ${lead.phone || "Not supplied"}`,
    `Country / region: ${lead.country_name || lead.country_code || "Not supplied"}`,
    `Application: ${lead.application || "Not supplied"}`,
    `Page: ${lead.page_path || "Unknown"}`, "", "Project brief:", lead.brief || "",
  ];
  try {
    await sendSiteEmail({ from, to, subject: `New Sai Zhao enquiry — ${lead.company || "Website"}`, text: lines.join("\n"), replyTo: lead.email ?? undefined });
    return "sent";
  } catch { return "failed"; }
}
