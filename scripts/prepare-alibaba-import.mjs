import fs from "node:fs/promises";
import path from "node:path";
import { parseArgs } from "node:util";
import { mapSource } from "../lib/alibaba-source.mjs";

const { values } = parseArgs({ options: { "source-dir": { type: "string" } } });
if (!values["source-dir"]) throw new Error("Provide --source-dir");
const directory = path.resolve(values["source-dir"]);
const catalog = JSON.parse(await fs.readFile(path.join(directory, "catalog.json"), "utf8"));
const records = JSON.parse(await fs.readFile(path.join(directory, "details.json"), "utf8"));
const index = new Map(catalog.products.map((product) => [product.id, product]));
const prepared = { format: "saizhao-alibaba-v1", capturedAt: catalog.capturedAt, sourceTotal: index.size, categories: catalog.categories, products: records.map((record) => {
  const source = index.get(record.id);
  if (!source) throw new Error(`Product ${record.id} is not in the catalog`);
  const categorySourceId = source.categoryIds.find((id) => catalog.categories.find((category) => category.id === id)?.parentId !== "products") || source.categoryIds[0];
  return { sourceId: record.id, sourceUrl: record.url, categorySourceId, capturedAt: record.capturedAt, data: mapSource(record, source), sourceSnapshot: { ...record, categoryIds: source.categoryIds, sourceListing: source, wholesaleOnly: true } };
}) };
await fs.writeFile(path.join(directory, "prepared-import.json"), JSON.stringify(prepared));
console.log(JSON.stringify({ file: path.join(directory, "prepared-import.json"), categories: prepared.categories.length, verified: prepared.products.length, total: prepared.sourceTotal }));
