import type { RetailProduct } from "@/lib/retail-types";

const genericNameWords = new Set([
  "aroma", "branded", "bulk", "custom", "daily", "essential", "fragrance",
  "high", "luxury", "normal", "oil", "perfume", "product", "quality", "scent",
]);

function words(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}

export function productDisplayTitle(product: RetailProduct) {
  const title = product.source_provider === "alibaba"
    ? product.title.replace(/^(?:(?:factory supply|manufacturer bulk sale|wholesale|hot selling|bulk sale)\s+)+/i, "").trim() || product.title
    : product.title;
  const sourceName = product.detail.technical.find((row) => /^product name$/i.test(row.label.trim()))?.value.trim();
  if (!sourceName || sourceName.length > 100) return title;

  const nameWords = [...new Set(words(sourceName))];
  const distinctiveWords = nameWords.filter((word) => word.length > 1 && !genericNameWords.has(word));
  if (!distinctiveWords.length) return title;

  const categoryWords = new Set(words(product.content_categories?.name || ""));
  const categoryOverlap = categoryWords.size ? nameWords.filter((word) => categoryWords.has(word)).length / nameWords.length : 0;
  return categoryOverlap >= .75 ? title : sourceName;
}

function fitWords(value: string, length: number) {
  if (value.length <= length) return value;
  const lastSpace = value.lastIndexOf(" ", length);
  return `${value.slice(0, lastSpace > 0 ? lastSpace : length).trimEnd()}…`;
}

export function productSearchDescription(product: RetailProduct) {
  if (product.seo_description?.trim()) return product.seo_description.trim();

  const title = productDisplayTitle(product);
  const overview = [product.detail.overview, product.summary, product.content]
    .map((value) => value?.replace(/\s+/g, " ").trim() ?? "")
    .find((value) => value.length >= 45
      && !value.toLowerCase().startsWith("to better ensure the safety of your goods")
      && value !== title && value !== product.title);
  const name = fitWords(title, 76);
  return overview
    ? fitWords(`${name} · ${overview}`, 158)
    : fitWords(`${name} from Sai Zhao Fragrance. View product details and enquire about samples or bulk supply.`, 158);
}
