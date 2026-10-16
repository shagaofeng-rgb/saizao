# Product detail design QA — scheme 1

Final result: passed

## Reference and implementation

- Approved visual reference: `/Users/apple/.codex/generated_images/01a052a3-4406-7c31-9a2e-bed52a4a1e1d/exec-8c7332a0-677e-466a-a6b3-1526fcfcdd22.png` (1487 × 1058).
- Desktop implementation capture: `/tmp/saizhao-product-design-desktop-qa.png` (1440 × 1024).
- Mobile implementation capture: `/tmp/saizhao-product-design-mobile-qa.png` (390 × 844).
- Implementation: shared site header/footer, product breadcrumb, left image gallery, right title/facts/enquiry, followed by overview/specifications.

## Comparison and states

| Area | Result |
| --- | --- |
| Header and palette | Retains the live site's ivory, dark text, and terracotta design language; matches the reference's editorial hierarchy. |
| Gallery | Vertical desktop thumbnails and large contained image; horizontal mobile thumbnails. Product images are sourced from the actual record. Thumbnail selection updates the main image and pressed state. |
| Product facts | Reference's two-column facts and full-width action are reproduced, but values come only from the product's technical data. Missing values are omitted. |
| Retail/quote state | Quote-only products show an enquiry action, not a fabricated price, stock status, or Add to Cart. Existing checkout controls remain available only where the product and backend enable them. |
| Below fold | Overview and specifications use the same two-column composition; long specifications and description imagery are expandable. Sections with no source data are omitted. |
| Responsive/accessibility | At 390px, title and image are readable, no horizontal overflow, gallery buttons have names and pressed states, and the quote link remains reachable. |

The source mock includes decorative foliage and more marketing copy than the product record contains. Those are intentionally not invented in the implementation. The gallery includes source-provided data sheet images rather than generated stand-ins. The desktop capture includes the Next.js development badge, which is not part of the production UI.

## Verification

- Desktop visual comparison: passed.
- Mobile visual and overflow check: passed (`scrollWidth === innerWidth === 390`).
- Gallery selection and quote destination: passed.
- ESLint on changed TS/TSX files: passed.
- Next.js production build and TypeScript: passed.
- Impeccable mechanical detector: no findings.

## Revision history

1. Initial implementation followed the reference's main grid and card placement.
2. Moved source-backed key facts into the reference's two-column order and adjusted desktop/mobile spacing after screenshot review.
3. Rechecked images, mobile overflow, and interactive gallery; final result passed.
