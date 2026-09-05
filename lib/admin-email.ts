import "server-only";

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (character) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character] ?? character);
}

export function isAdminRecoveryEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY && (process.env.ADMIN_RECOVERY_FROM || process.env.ENQUIRY_NOTIFICATION_FROM));
}

export async function sendAdminPasswordResetEmail({ to, username, resetUrl }: { to: string; username: string; resetUrl: string }) {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.ADMIN_RECOVERY_FROM || process.env.ENQUIRY_NOTIFICATION_FROM;
  if (!apiKey || !from) throw new Error("Admin recovery email is not configured.");
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Sai Zhao 后台密码重置",
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#2c201a"><h1 style="font-size:26px">重置后台密码</h1><p>管理员 ${escapeHtml(username)}，您好：</p><p>请点击下面的按钮设置新密码。链接将在 30 分钟后失效，并且只能使用一次。</p><p style="margin:28px 0"><a href="${escapeHtml(resetUrl)}" style="display:inline-block;background:#a34b2b;color:#fff;text-decoration:none;padding:12px 20px;border-radius:4px">设置新密码</a></p><p style="color:#705f55;font-size:13px">如果这不是您的操作，请忽略本邮件，原密码不会改变。</p></div>`,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!response.ok) throw new Error(`Resend request failed (${response.status}).`);
}
