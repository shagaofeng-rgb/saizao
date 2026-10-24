/** Classify only what the recorded referrer proves; a referral is not necessarily organic. */
export function inferTrafficSource(referrer: string, utmSource: string): string | null {
  const explicit = utmSource.trim();
  if (explicit) return explicit;

  try {
    const url = new URL(referrer);
    if (url.protocol !== "https:" && url.protocol !== "http:") return null;
    const host = url.hostname.toLowerCase();
    if (host === "szxj6899.com" || host === "www.szxj6899.com") return null;
    if (/^(www\.)?google\.[a-z]{2,3}(?:\.[a-z]{2})?$/.test(host)) return "google-referral";
    if (host === "bing.com" || host === "www.bing.com") return "bing-referral";
    if (host === "facebook.com" || host.endsWith(".facebook.com") || host === "instagram.com" || host.endsWith(".instagram.com")) return "meta-referral";
    if (host === "linkedin.com" || host.endsWith(".linkedin.com")) return "linkedin-referral";
    return host || null;
  } catch {
    return null;
  }
}
