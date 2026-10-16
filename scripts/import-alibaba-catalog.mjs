// Import only the rendered, verified records produced with cua_repl.
// No page scraping, checkout activation, invented prices, stock, reviews or sales.
import fs from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { createRequire } from "node:module";
import { parseArgs } from "node:util";
import { mapSource, slug, sourceImageKey } from "../lib/alibaba-source.mjs";

const { values } = parseArgs({ options: {
  "source-dir": { type: "string" }, apply: { type: "boolean" }, publish: { type: "boolean" },
  "allow-partial": { type: "boolean" }, "categories-only": { type: "boolean" },
} });
if (!values["source-dir"]) throw new Error("Provide --source-dir with the verified capture directory");
const directory = path.resolve(values["source-dir"]);
const catalog = JSON.parse(await fs.readFile(path.join(directory, "catalog.json"), "utf8"));
const records = JSON.parse(await fs.readFile(path.join(directory, "details.json"), "utf8"));
const products = new Map(catalog.products.map((product) => [product.id, product]));
const details = new Map(records.map((record) => [record.id, record]));
const pending = [...products.keys()].filter((id) => !details.has(id));
if (products.size !== catalog.products.length || details.size !== records.length) throw new Error("Duplicate source IDs in capture");
if (pending.length && !values["allow-partial"] && !values["categories-only"]) throw new Error(`${pending.length} product details still require verification. Use --allow-partial only for an explicit staged import.`);


const mapped = [...details.values()].filter((record) => products.has(record.id)).map((record) => ({ record, source: products.get(record.id), mapped: mapSource(record, products.get(record.id)) }));
const summary = { sourceProducts: products.size, verifiedDetails: mapped.length, pendingDetails: pending.length, sourceCategories: catalog.categories.length, mode: values.apply ? "apply" : "dry-run", publication: Boolean(values.publish) };
console.log(JSON.stringify(summary));
if (!values.apply) process.exit(0);

const supabase = (process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || "").replace(/\/$/, "");
if (supabase !== "https://pohsefmowgthjskmbkyg.supabase.co" || !process.env.SUPABASE_SERVICE_ROLE_KEY) throw new Error("The intended Sai Zhao Supabase project and server credential are required");
const sharp = createRequire(path.resolve("node_modules/next/package.json"))("sharp");
async function request(resource, options = {}) {
  const headers = new Headers(options.headers);
  headers.set("apikey", process.env.SUPABASE_SERVICE_ROLE_KEY);
  headers.set("Authorization", `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`);
  if (typeof options.body === "string") headers.set("Content-Type", "application/json");
  const response = await fetch(`${supabase}/${resource}`, { ...options, headers, signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Database/storage operation failed (${response.status}) for ${resource.split("?")[0]}`);
  const body = await response.text();
  return body ? JSON.parse(body) : null;
}
const categoryIds = new Map();
for (const category of [...catalog.categories].sort((a, b) => Number(a.parentId !== "products") - Number(b.parentId !== "products"))) {
  const found = await request(`rest/v1/content_categories?select=id,deleted_at&source_provider=eq.alibaba&source_id=eq.${category.id}&limit=1`);
  if (found[0]) {
    if (found[0].deleted_at) throw new Error(`Source category ${category.id} was deleted by an operator; it will not be recreated`);
    categoryIds.set(category.id, found[0].id); continue;
  }
  const parent_id = category.parentId === "products" ? null : categoryIds.get(category.parentId);
  if (category.parentId !== "products" && !parent_id) throw new Error(`Missing verified parent for ${category.id}`);
  const saved = await request("rest/v1/content_categories", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({ content_kind: "product", name: category.name, slug: slug(category.name), parent_id, description: null, sort_order: catalog.categories.findIndex((item) => item.id === category.id) * 10, is_enabled: true, show_in_nav: true, source_provider: "alibaba", source_id: category.id, source_url: category.url }) });
  categoryIds.set(category.id, saved[0].id);
}
if (values["categories-only"]) { console.log(JSON.stringify({ categoriesSaved: categoryIds.size })); process.exit(0); }

let assetCache;
try { assetCache = JSON.parse(await fs.readFile(path.join(directory, "media-cache.json"), "utf8")); } catch { assetCache = {}; }
const imageHosts = new Set(["s.alicdn.com", "sc01.alicdn.com", "sc02.alicdn.com", "sc03.alicdn.com", "sc04.alicdn.com", "img.alicdn.com"]);
async function copyImage(image, alt) {
  const sourceUrl = new URL(image.url);
  if (sourceUrl.protocol !== "https:" || !imageHosts.has(sourceUrl.hostname)) throw new Error("Unsupported source image host");
  const key = sourceImageKey(image.url);
  if (assetCache[key]) return { ...assetCache[key], alt: image.alt || alt };
  const name = `alibaba-${createHash("sha256").update(key).digest("hex")}`;
  const found = await request(`rest/v1/media_assets?select=public_url,storage_path,deleted_at&file_name=eq.${name}&limit=1`);
  if (found[0]?.deleted_at) throw new Error("An operator archived a required image; it will not be restored automatically");
  const response = await fetch(sourceUrl, { redirect: "error", signal: AbortSignal.timeout(30000) });
  if (!response.ok) throw new Error(`Source image download failed (${response.status})`);
  if (Number(response.headers.get("content-length")) > 4 * 1024 * 1024) throw new Error("Source image exceeds the 4MB media limit");
  const bytes = Buffer.from(await response.arrayBuffer());
  if (bytes.length > 4 * 1024 * 1024) throw new Error("Source image exceeds the 4MB media limit");
  const metadata = await sharp(bytes).metadata();
  const mime = { jpeg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif" }[metadata.format];
  if (!mime || !metadata.width || !metadata.height) throw new Error("Unsupported or invalid image content");
  const storagePath = found[0]?.storage_path || `alibaba/${name}.${metadata.format}`;
  const publicUrl = found[0]?.public_url || `${supabase}/storage/v1/object/public/website-media/${storagePath}`;
  if (!found[0]) {
    await request(`storage/v1/object/website-media/${storagePath}`, { method: "POST", headers: { "Content-Type": mime, "x-upsert": "false" }, body: bytes });
    await request("rest/v1/media_assets", { method: "POST", body: JSON.stringify({ file_name: name, storage_path: storagePath, public_url: publicUrl, mime_type: mime, byte_size: bytes.length, asset_kind: "image", alt_text: alt.slice(0, 180) }) });
  }
  assetCache[key] = { url: publicUrl, width: metadata.width, height: metadata.height };
  await fs.writeFile(path.join(directory, "media-cache.json"), JSON.stringify(assetCache, null, 2));
  return { ...assetCache[key], alt: image.alt || alt };
}

const result = { categories: categoryIds.size, created: 0, skippedExisting: 0, failed: [], pendingDetails: pending.length };
for (const { record, source, mapped: product } of mapped) {
  try {
    const exists = await request(`rest/v1/products?select=id&source_provider=eq.alibaba&source_id=eq.${source.id}&limit=1`);
    if (exists.length) { result.skippedExisting++; continue; }
    const leaf = source.categoryIds.find((id) => catalog.categories.find((category) => category.id === id)?.parentId !== "products") || source.categoryIds[0];
    const category_id = categoryIds.get(leaf);
    if (!category_id) throw new Error("Verified category mapping is missing");
    const gallery = [];
    for (const image of product.gallery.slice(0, 12)) gallery.push(await copyImage(image, product.title));
    const descriptionImages = [];
    for (const [index, image] of product.detail.descriptionImages.entries()) descriptionImages.push(await copyImage(image, `${product.title} — product information ${index + 1}`));
    const saved = await request("rest/v1/products", { method: "POST", headers: { Prefer: "return=representation" }, body: JSON.stringify({
      ...product, category_id, cover_url: gallery[0].url, hero_url: gallery[0].url, gallery,
      detail: { ...product.detail, descriptionImages }, status: values.publish ? "published" : "draft", published_at: values.publish ? new Date().toISOString() : null,
      is_demo: false, retail_enabled: false, source_provider: "alibaba", source_id: source.id, source_url: record.url, source_synced_at: record.capturedAt,
      source_snapshot: { ...record, categoryIds: source.categoryIds, sourceListing: source, excludedFromSiteMetrics: ["Alibaba reviews", "Alibaba sold count", "Alibaba order protection"], wholesaleOnly: true },
    }) });
    await request("rest/v1/rpc/admin_log_audit", { method: "POST", body: JSON.stringify({ p_actor_id: null, p_action: "catalog_imported", p_entity_type: "products", p_entity_id: saved[0].id, p_metadata: { provider: "alibaba", sourceId: source.id, sourceUrl: record.url, status: values.publish ? "published" : "draft" } }) });
    result.created++; console.log(JSON.stringify({ sourceId: source.id, created: result.created, skippedExisting: result.skippedExisting }));
  } catch (error) {
    result.failed.push({ sourceId: source.id, message: error.message });
    console.log(JSON.stringify({ sourceId: source.id, error: error.message }));
  }
  await fs.writeFile(path.join(directory, "import-result.json"), JSON.stringify(result, null, 2));
}
console.log(JSON.stringify(result));
if (result.failed.length) process.exitCode = 1;
