import "server-only";

type LeadNotification = Record<string, string | null>;
export async function notifyTeam(lead: LeadNotification): Promise<"sent" | "failed" | "not_configured"> {
  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.ENQUIRY_NOTIFICATION_TO;
  const from = process.env.ENQUIRY_NOTIFICATION_FROM;
  if (!apiKey || !to || !from) return "not_configured";
  const lines = [
    `Name: ${lead.name || ""}`, `Company: ${lead.company || ""}`, `Email: ${lead.email || ""}`,
    `Phone: ${lead.phone || "Not supplied"}`,
    `Country / region: ${lead.country_name || lead.country_code || "Not supplied"}`,
    `Application: ${lead.application || "Not supplied"}`,
    `Page: ${lead.page_path || "Unknown"}`, "", "Project brief:", lead.brief || "",
  ];
  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({ from, to: [to], subject: `New Sai Zhao enquiry — ${lead.company || "Website"}`, text: lines.join("\n"), reply_to: lead.email }),
      signal: AbortSignal.timeout(8_000),
    });
    return response.ok ? "sent" : "failed";
  } catch { return "failed"; }
}
