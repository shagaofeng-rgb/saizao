// Run only inside cua_repl, passing its documented browser tab handles.
// This module reads rendered DOM; it never fetches pages or accesses hidden app state.
import fs from "node:fs/promises";

const descriptionContent = (element) => ({
  text: element.innerText,
  sections: [...element.querySelectorAll(".J_module")].map((module) => ({
    kind: module.getAttribute("module-title"),
    title: module.querySelector("[data-section-title]")?.getAttribute("data-section-title"),
    text: module.innerText,
    images: [...module.querySelectorAll("img")].map((image) => ({ url: image.src, alt: image.alt })),
    rows: [...module.querySelectorAll("tr")].map((row) => [...row.querySelectorAll("td,th")].map((cell) => cell.innerText.trim())),
  })).filter((section) => section.text || section.images.length),
  images: [...element.querySelectorAll("img")].map((image) => ({ url: image.src, alt: image.alt })),
});

export async function createCapture({ productTab, descriptionTab, directory }) {
  const catalog = JSON.parse(await fs.readFile(`${directory}/catalog.json`, "utf8"));
  const records = new Map(JSON.parse(await fs.readFile(`${directory}/details.json`, "utf8")).map((record) => [record.id, record]));
  async function read(product) {
    await productTab.playwright.locator('[data-testid="module-attribute-row"]').first().waitFor({ state: "attached", timeoutMs: 15000 }).catch(() => { throw new Error(`Attributes not ready: ${product.id}`); });
    await productTab.playwright.locator('[data-testid="media-image"] img').first().waitFor({ state: "attached", timeoutMs: 15000 }).catch(() => { throw new Error(`Gallery not ready: ${product.id}`); });
    let description;
    if (await productTab.playwright.locator('[data-testid="module-structure-description"]').count()) {
      await productTab.playwright.locator('[data-testid="module-structure-description"] img').first().getAttribute("src", { timeoutMs: 15000 });
      description = await productTab.playwright.locator('[data-testid="module-structure-description"] > div > div:last-child').evaluate(descriptionContent);
      description.sections = [{ kind: "structured", text: description.text, images: description.images, rows: [] }];
    } else {
      await productTab.playwright.locator('iframe[src*="descIframe"]').waitFor({ state: "attached", timeoutMs: 15000 }).catch(() => { throw new Error(`Description frame not ready: ${product.id}`); });
      const source = await productTab.playwright.locator('iframe[src*="descIframe"]').getAttribute("src", { timeoutMs: 15000 });
      const descriptionUrl = new URL(source, product.url).href;
      if (await descriptionTab.url() !== descriptionUrl) await descriptionTab.goto(descriptionUrl);
      await descriptionTab.playwright.locator("#J-rich-text-description").waitFor({ state: "attached", timeoutMs: 15000 }).catch(() => { throw new Error(`Description content not ready: ${product.id}`); });
      await descriptionTab.getAXState({ emit: false });
      description = await descriptionTab.playwright.locator("#J-rich-text-description").evaluate(descriptionContent);
    }
    const record = await productTab.playwright.evaluate(() => ({
      url: location.href,
      title: document.querySelector("h1")?.innerText,
      attributes: [...document.querySelectorAll('[data-testid="module-attribute-row"]')].map((row) => ({ label: row.querySelector('[data-testid="module-attribute-name"]')?.textContent.trim(), value: row.querySelector('[data-testid="module-attribute-value"]')?.textContent.trim() })),
      gallery: [...document.querySelectorAll('[data-testid="media-image"] img')].map((image) => ({ url: image.src, alt: image.alt })),
      priceTiers: [...document.querySelectorAll('[data-testid="pc-purchase-price-tier"]')].map((element) => element.innerText).filter(Boolean),
      options: [...document.querySelectorAll('[data-testid="pc-purchase-sku-option-attribute"]')].map((element) => element.innerText).filter(Boolean),
      leadTime: document.querySelector('[data-testid="module-details-lead"]')?.innerText,
      descriptionFrame: document.querySelector('iframe[src*="descIframe"]')?.src,
    }));
    if (!record.url.includes(`_${product.id}.html`) || !record.title || !record.attributes.length || !record.gallery.length || !description.images.length) throw new Error(`Incomplete product DOM: ${product.id}`);
    records.set(product.id, { ...record, id: product.id, description, capturedAt: new Date().toISOString() });
    await fs.writeFile(`${directory}/details.pending.json`, JSON.stringify([...records.values()], null, 2));
    await fs.rename(`${directory}/details.pending.json`, `${directory}/details.json`);
    return { id: product.id, completed: records.size, total: catalog.products.length };
  }
  async function capture(product) {
    if (await productTab.url() !== product.url) await productTab.goto(product.url);
    await productTab.playwright.getByRole("heading", { level: 1, name: product.title, exact: true }).waitFor({ state: "visible", timeoutMs: 15000 });
    await productTab.playwright.locator('[data-testid="module-attribute-row"]').first().waitFor({ state: "attached", timeoutMs: 15000 });
    await productTab.getAXState({ emit: false });
    const available = await productTab.playwright.evaluate(() => Boolean(document.querySelector('iframe[src*="descIframe"], [data-testid="module-structure-description"]')));
    if (!available) {
      await productTab.playwright.getByRole("tab", { name: "Description", exact: true }).waitFor({ state: "visible", timeoutMs: 15000 });
      await productTab.playwright.getByRole("tab", { name: "Description", exact: true }).click();
      await productTab.getAXState({ emit: false });
    }
    return read(product);
  }
  return {
    async readCurrent() {
      const currentUrl = await productTab.url();
      const product = catalog.products.find((item) => currentUrl.includes(`_${item.id}.html`));
      if (!product) throw new Error("Current page is not in the verified catalog");
      return read(product);
    },
    async batch(limit = 5) {
      for (const product of catalog.products.filter((item) => !records.has(item.id)).slice(0, limit)) await capture(product);
      return { completed: records.size, total: catalog.products.length };
    },
    progress: () => ({ completed: records.size, total: catalog.products.length }),
  };
}
