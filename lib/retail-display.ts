import type { RetailProduct } from "@/lib/retail-types";

const genericNameWords = new Set([
  "aroma", "branded", "bulk", "custom", "daily", "essential", "fragrance",
  "high", "luxury", "normal", "oil", "perfume", "product", "quality", "scent",
]);

function words(value: string) {
  return value.toLowerCase().match(/[\p{L}\p{N}]+/gu) || [];
}

export function productDisplayTitle(product: RetailProduct) {
  const sourceName = product.detail.technical.find((row) => /^product name$/i.test(row.label.trim()))?.value.trim();
  if (!sourceName || sourceName.length > 100) return product.title;

  const nameWords = [...new Set(words(sourceName))];
  const distinctiveWords = nameWords.filter((word) => word.length > 1 && !genericNameWords.has(word));
  if (!distinctiveWords.length) return product.title;

  const categoryWords = new Set(words(product.content_categories?.name || ""));
  const categoryOverlap = categoryWords.size ? nameWords.filter((word) => categoryWords.has(word)).length / nameWords.length : 0;
  return categoryOverlap >= .75 ? product.title : sourceName;
}
