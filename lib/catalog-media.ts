import "server-only";
import { createHash } from "node:crypto";
import sharp from "sharp";
import { rest, supabaseRequest, supabaseUrl } from "@/lib/supabase-server";
import type { ProductImage } from "@/lib/retail-types";

const sourceHosts = new Set(["s.alicdn.com", "sc01.alicdn.com", "sc02.alicdn.com", "sc03.alicdn.com", "sc04.alicdn.com", "img.alicdn.com"]);
export function validCatalogImage(value: unknown): value is ProductImage {
  if (!value || typeof value !== "object" || !("url" in value) || typeof value.url !== "string") return false;
  try { const url = new URL(value.url); return url.protocol === "https:" && sourceHosts.has(url.hostname) && !url.username && !url.password && (!url.port || url.port === "443"); } catch { return false; }
}
export function catalogImageKey(value: string) {
  const url = new URL(value);
  return url.pathname.match(/(?:H|A|S)[0-9a-f]{32}[A-Za-z0-9]?/)?.[0] || `${url.hostname}${url.pathname}`;
}

export async function copyCatalogImage(image: ProductImage, actorId: string, fallbackAlt: string): Promise<ProductImage> {
  if (!validCatalogImage(image)) throw new Error("图片来源不受支持。");
  const hash = createHash("sha256").update(catalogImageKey(image.url)).digest("hex");
  const name = `alibaba-${hash}`;
  const existing = await rest<{ public_url: string; file_name: string; deleted_at: string | null }[]>(`media_assets?select=public_url,file_name,deleted_at&file_name=like.${name}-*&limit=1`);
  const alt = String(image.alt || fallbackAlt).slice(0, 180);
  if (existing.data[0]) {
    if (existing.data[0].deleted_at) throw new Error("所需图片已被运营删除，请先确认媒体资料。");
    const dimensions = existing.data[0].file_name.match(/-(\d+)x(\d+)$/);
    return { url: existing.data[0].public_url, alt, ...(dimensions ? { width: Number(dimensions[1]), height: Number(dimensions[2]) } : {}) };
  }
  const response = await fetch(image.url, { redirect: "error", signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error("源图片暂时无法下载。");
  const limit = 4 * 1024 * 1024;
  if (Number(response.headers.get("content-length")) > limit) throw new Error("源图片超过 4MB 限制。");
  const reader = response.body?.getReader();
  if (!reader) throw new Error("源图片内容为空。");
  const chunks: Uint8Array[] = []; let size = 0;
  while (true) { const { done, value } = await reader.read(); if (done) break; size += value.byteLength; if (size > limit) { await reader.cancel(); throw new Error("源图片超过 4MB 限制。"); } chunks.push(value); }
  const bytes = Buffer.concat(chunks);
  const metadata = await sharp(bytes, { limitInputPixels: 60000000 }).metadata();
  const mime = ({ jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", heif: metadata.compression === "av1" ? "image/avif" : undefined } as Record<string, string | undefined>)[metadata.format || ""];
  if (!mime || !metadata.width || !metadata.height || metadata.width > 30000 || metadata.height > 30000) throw new Error("源图片格式或尺寸无效。");
  const storagePath = `alibaba/${name}.${metadata.format}`;
  const publicUrl = `${supabaseUrl()}/storage/v1/object/public/website-media/${storagePath}`;
  const alreadyUploaded = await fetch(publicUrl, { method: "HEAD", signal: AbortSignal.timeout(12000) });
  if (!alreadyUploaded.ok) await supabaseRequest(`storage/v1/object/website-media/${storagePath}`, { method: "POST", headers: { "Content-Type": mime, "x-upsert": "false" }, body: bytes });
  await rest("media_assets", { method: "POST", body: JSON.stringify({ file_name: `${name}-${metadata.width}x${metadata.height}`, storage_path: storagePath, public_url: publicUrl, mime_type: mime, byte_size: bytes.length, asset_kind: "image", alt_text: alt, uploaded_by: actorId }) });
  return { url: publicUrl, alt, width: metadata.width, height: metadata.height };
}
