import "server-only";
import { createHmac, timingSafeEqual } from "crypto";

export function requestBodyTooLarge(request: Request, limit: number) {
  const length = Number(request.headers.get("content-length") ?? "0");
  return Number.isFinite(length) && length > limit;
}

export function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return true;
  try {
    return new URL(origin).host === new URL(request.url).host;
  } catch {
    return false;
  }
}

export function clientIp(request: Request) {
  return request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || request.headers.get("x-real-ip")?.trim() || "unknown";
}

export function fingerprint(request: Request, scope: string) {
  const secret = process.env.SECURITY_FINGERPRINT_SECRET ?? process.env.ANALYTICS_IP_SALT;
  if (!secret || secret.length < 32) throw new Error("SECURITY_FINGERPRINT_SECRET must be at least 32 characters.");
  const input = `${scope}:${clientIp(request)}:${request.headers.get("user-agent") ?? "unknown"}`;
  return createHmac("sha256", secret).update(input).digest("hex");
}

export function safeEqualText(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  if (leftBuffer.length !== rightBuffer.length) return false;
  return timingSafeEqual(leftBuffer, rightBuffer);
}

export function cleanText(value: unknown, max: number) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").trim().slice(0, max);
}
