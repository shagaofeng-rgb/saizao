import "server-only";
import nodemailer from "nodemailer";

type Mail = { from: string; to: string; subject: string; text?: string; html?: string; replyTo?: string };
type Transport = { kind: "smtp"; host: string; port: number; user: string; pass: string } | { kind: "resend"; apiKey: string };
export type MailCheck = "ready" | "configured" | "not_configured" | "authentication_failed" | "unavailable";

function configuration(): Transport | null {
  const host = process.env.SMTP_HOST?.trim(), user = process.env.SMTP_USER?.trim(), pass = process.env.SMTP_PASSWORD;
  const port = Number(process.env.SMTP_PORT || 465);
  if (host && user && pass && Number.isInteger(port) && port > 0 && port <= 65535) return { kind: "smtp", host, port, user, pass };
  const apiKey = process.env.RESEND_API_KEY?.trim();
  return apiKey ? { kind: "resend", apiKey } : null;
}

function smtpClient(transport: Extract<Transport, { kind: "smtp" }>) {
  return nodemailer.createTransport({
    host: transport.host, port: transport.port, secure: transport.port === 465, requireTLS: transport.port !== 465,
    auth: { user: transport.user, pass: transport.pass },
    connectionTimeout: 7000, greetingTimeout: 7000, socketTimeout: 10000,
    tls: { minVersion: "TLSv1.2", rejectUnauthorized: true },
  });
}

export function isEmailTransportConfigured() { return Boolean(configuration()); }

export async function sendSiteEmail(message: Mail) {
  const transport = configuration();
  if (!transport) throw new Error("Email transport unavailable");
  if (transport.kind === "smtp") {
    const info = await smtpClient(transport).sendMail(message);
    if (!info.accepted.length) throw new Error("Email not accepted");
    return;
  }
  const { replyTo, ...body } = message;
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${transport.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ ...body, to: [message.to], ...(replyTo ? { reply_to: replyTo } : {}) }),
    signal: AbortSignal.timeout(8000),
  });
  if (!response.ok) throw new Error("Email not accepted");
}

export async function checkEnquiryMail(): Promise<MailCheck> {
  const transport = configuration();
  if (!transport || !process.env.ENQUIRY_NOTIFICATION_FROM || !process.env.ENQUIRY_NOTIFICATION_TO) return "not_configured";
  if (transport.kind === "resend") return "configured";
  try {
    await smtpClient(transport).verify();
    return "ready";
  } catch (error) {
    return error && typeof error === "object" && "code" in error && error.code === "EAUTH" ? "authentication_failed" : "unavailable";
  }
}
