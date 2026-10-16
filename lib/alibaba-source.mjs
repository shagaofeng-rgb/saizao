export const slug = (value) => value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
const clean = (value) => String(value ?? "").trim();
export const sourceImageKey = (value) => {
  const url = new URL(value);
  return url.pathname.match(/(?:H|A|S)[0-9a-f]{32}[A-Za-z0-9]?/)?.[0] || `${url.hostname}${url.pathname}`;
};
const uniqueImages = (images) => {
  const unique = new Map();
  for (const image of images) if (image?.url?.startsWith("https://") && !unique.has(sourceImageKey(image.url))) unique.set(sourceImageKey(image.url), image);
  return [...unique.values()];
};

export function mapSource(record, source) {
  if (!record.url?.includes(`_${source.id}.html`) || !record.title || !record.attributes?.length || !record.gallery?.length || !record.description?.images?.length && !record.description?.sections?.some((section) => section.images?.length)) throw new Error(`Incomplete verification: ${source.id}`);
  const rows = record.attributes.filter((row) => row.label && row.value).map((row) => ({ label: clean(row.label), value: clean(row.value) }));
  const descriptionRows = [];
  const descriptionImages = [];
  const content = [];
  const faqContent = [];
  let sectionName = "";
  let ownProduct = true;
  for (const section of record.description.sections || []) {
    if (section.title) {
      sectionName = section.title;
      ownProduct = !/hot sale|recommend|company profile|faq/i.test(sectionName);
    }
    if (section.kind === "detailSellerRecommend" || !section.kind) continue;
    if (/faq/i.test(sectionName) && section.text && !section.title) faqContent.push(section.text);
    if (!ownProduct) continue;
    if (!section.title && section.images) descriptionImages.push(...section.images);
    for (const row of section.rows || []) if (row.length === 2 && row[0] && row[1]) descriptionRows.push({ label: clean(row[0]), value: clean(row[1]) });
    if (!section.title && section.text && !section.rows?.length) content.push(section.text);
  }
  // A shop header preceding the actual Product Description is not a product detail.
  const firstNavigation = record.description.sections?.findIndex((section) => /product description/i.test(section.title || "")) ?? -1;
  if (firstNavigation > 0) {
    const headerKeys = new Set(record.description.sections.slice(0, firstNavigation).flatMap((section) => section.images || []).map((image) => sourceImageKey(image.url)));
    for (let index = descriptionImages.length - 1; index >= 0; index--) if (headerKeys.has(sourceImageKey(descriptionImages[index].url))) descriptionImages.splice(index, 1);
  }
  const technical = [...rows, ...descriptionRows];
  for (const option of [...new Set(record.options || [])]) {
    const [label, ...rest] = option.split("\n").map(clean).filter(Boolean);
    if (label && rest.length && !technical.some((row) => row.label === label && row.value === rest.join(", "))) technical.push({ label, value: rest.join(", ") });
  }
  const priceTiers = [...new Set(record.priceTiers || [])];
  if (!priceTiers.length) {
    const listingPrice = source.text?.match(/(?:US)?\$\s*[\d,.]+(?:\s*[-–]\s*[\d,.]+)?/)?.[0];
    if (listingPrice) priceTiers.push(listingPrice);
  }
  for (const tier of priceTiers) technical.push({ label: "Wholesale reference price (USD)", value: tier.split("\n").map(clean).filter(Boolean).join(" · ") });
  const attribute = (expression) => rows.filter((row) => expression.test(row.label)).map((row) => row.value);
  const packaging = [...attribute(/^packing$|^package$|^packaging$/i), ...descriptionRows.filter((row) => /^pack/i.test(row.label)).map((row) => row.value)];
  const shipping = [...attribute(/delivery time/i), ...descriptionRows.filter((row) => /lead time|delivery time/i.test(row.label)).map((row) => row.value)];
  const introduction = content.join("\n\n") || rows.find((row) => /product name/i.test(row.label))?.value || record.title;
  const faqs = faqContent.join("\n\n").split(/\n\s*\n(?=\d+[.、])/).map((block) => {
    const [question, ...answer] = block.trim().split("\n");
    return { question: (question || "").replace(/^\d+[.、]\s*/, ""), answer: answer.join("\n").trim() };
  }).filter((faq) => faq.question && faq.answer);
  return {
    title: record.title.slice(0, 180), slug: `${slug(rows.find((row) => /product name/i.test(row.label))?.value || record.title).slice(0, 100).replace(/-+$/, "") || "fragrance"}-${source.id}`,
    summary: introduction.slice(0, 600), content: introduction.slice(0, 30000), application: attribute(/^application$/i).join(", ").slice(0, 160) || null,
    detail: { heroLine: "", heroDescription: "", defaultVariantSku: "", overview: introduction.slice(0, 10000), topNotes: "", heartNotes: "", baseNotes: "", technical,
      applications: [], dosage: [], storage: attribute(/^storage$/i), shipping, retailBenefits: [], customBenefits: [], packagingIntro: [...new Set(packaging)].join(" · "), packagingImage: "", downloads: [], faqs, relatedSlugs: [], descriptionImages: uniqueImages(descriptionImages) },
    gallery: uniqueImages(record.gallery),
  };
}
