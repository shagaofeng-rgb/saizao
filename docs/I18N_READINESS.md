# Internationalization Readiness

## Current language policy

- The verified public source language is English (`html lang="en"`).
- The private operations console is Chinese and marks its interface subtree with `lang="zh-CN"`.
- No unverified machine-translated public locale is published.
- The site does not redirect visitors by IP or browser language; a future locale choice should remain explicit and reversible.

## Implementation rules for a future locale

1. Add locale routing as one controlled project (`/[locale]/...`) and keep canonical and `hreflang` output consistent.
2. Move public copy into typed locale dictionaries before adding a language switcher.
3. Translate metadata, structured data, form validation, consent text, API messages and email notifications together with page copy.
4. Keep company names, contact details and legal claims in one shared source of truth.
5. Test every locale at 320, 390, 768, 1024 and 1440 CSS pixels, including 30–50% text expansion.
6. Use language-specific review for claims and industry terminology; do not publish raw machine output.

## Layout readiness already in place

- Fluid type and grid breakpoints; no fixed text containers.
- `overflow-wrap` protection for paragraphs, list items and addresses.
- Form controls and navigation remain usable on narrow screens.
- Public and admin language boundaries are declared for assistive technology.
- URL metadata and sitemap generation are centralized for future locale expansion.

