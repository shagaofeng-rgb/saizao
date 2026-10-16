import assert from "node:assert/strict";
import { mapSource } from "../lib/alibaba-source.mjs";

// Pure, offline fixture. This test does not connect to a database or publish products.
const image = (id, size = 960) => ({ url: `https://s.alicdn.com/@sc04/kf/H${id.repeat(32)}a.jpg_${size}x${size}.jpg`, alt: "Source product image" });
const source = { id: "1600000000000", text: "US$ 40.00 - 45.00" };
const record = {
  url: `https://www.alibaba.com/product-detail/Offline-fixture_${source.id}.html`, title: "Offline source fixture",
  attributes: [{ label: "Product Name", value: "Test Fragrance" }, { label: "Storage", value: "Keep cool" }, { label: "Custom parameter", value: "Unmodified source value" }],
  gallery: [image("1"), image("1", 720), image("2")], options: ["Scent\nFloral\nCitrus"], priceTiers: [],
  description: { images: [image("3")], sections: [
    { kind: "detailImage", images: [image("4")] },
    { kind: "detailNavigation", title: "Product Description" },
    { kind: "detailText", text: "Original source product description", rows: [] },
    { kind: "detailTable", rows: [["Packaging", "25kg drum"]] },
    { kind: "detailImage", images: [image("3")] },
    { kind: "detailNavigation", title: "Hot Sale" },
    { kind: "detailSellerRecommend", images: [image("5")] },
    { kind: "detailNavigation", title: "Company Profile" },
    { kind: "detailImage", images: [image("6")] },
    { kind: "detailNavigation", title: "FAQ" },
    { kind: "detailText", text: "1. Do you offer samples?\nContact us for samples." },
  ] },
};
const mapped = mapSource(record, source);
assert.equal(mapped.gallery.length, 2);
assert.equal(mapped.gallery[0].url, image("1").url, "keep the first, larger gallery source");
assert.deepEqual(mapped.detail.descriptionImages, [image("3")], "exclude shop header and recommendation/company images");
for (const attribute of record.attributes) assert.ok(mapped.detail.technical.some((row) => row.label === attribute.label && row.value === attribute.value));
assert.ok(mapped.detail.technical.some((row) => row.label === "Packaging" && row.value === "25kg drum"));
assert.ok(mapped.detail.technical.some((row) => row.label === "Scent" && row.value === "Floral, Citrus"));
assert.ok(mapped.detail.technical.some((row) => row.label === "Wholesale reference price (USD)" && row.value === "US$ 40.00 - 45.00"));
assert.equal(mapped.detail.faqs[0].answer, "Contact us for samples.");
assert.equal(mapped.summary, "Original source product description");
assert.equal(mapped.detail.topNotes, "");
assert.equal(mapped.detail.applications.length, 0);
assert.equal(mapped.variants, undefined);
assert.throws(() => mapSource({ ...record, attributes: [] }, source), /Incomplete verification/);
console.log("Source parameters, wholesale-price labeling, image deduplication and non-fabrication verified offline.");
