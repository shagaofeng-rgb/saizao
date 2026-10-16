# Sai Zhao Design System

## Direction

Sai Zhao uses a warm, editorial fragrance world: quiet off-white space, dark brown type, restrained terracotta actions, real product/facility photography and asymmetric image curves. The system should feel considered and tactile without becoming ornamental or fashion-first.

## Foundations

- Paper: `#f7f1e8`
- Cream surface: `#fffaf3`
- Deep paper: `#eadfce`
- Ink: `#2c201a`
- Muted text: `#6c5a50`
- Terracotta action: `#a34b2b`
- Dark action: `#74311e`
- Success: `#537548`
- Error: `#a4432c`
- Divider: `#d9cbbb`
- Display type: Newsreader variable through `next/font`
- Body and interface type: Manrope variable through `next/font`
- Content maximum: 90rem
- Display tracking never tighter than `-0.04em`

Public body copy starts at `1rem/1.6`; long reading copy is constrained to roughly `68ch` at `.98rem/1.7`. Primary H1s use `clamp(3.5rem, 6.1vw, 6rem)` at `.96` line-height and `-.04em` tracking. Labels and compact interface copy sit around `.72–.78rem`, usually at weight 700.

Public section rhythm uses `clamp(76px, 8vw, 116px)` vertically and approximately `5–8vw` horizontally on desktop. Mobile gutters are normally `22–27px`. Admin content uses `clamp(22px, 4vw, 70px)` with a common internal gap of `12px`.

## Composition

- Public heroes pair a direct B2B message with one strong, real image.
- Curved image crops are reserved for heroes and process transitions; ordinary content uses 4–8 px corners.
- Sections use generous vertical rhythm and a consistent content width.
- Terracotta is used for decisions and navigation emphasis, not as a decorative wash.
- Capability, resource and contact groups use bordered surfaces only where the items are independently actionable.

Public buttons and inputs use a `4px` radius; cards, galleries, forms and menu panels use `8px`. Admin controls, tabs and navigation use `3px`, and admin panels use `5px`. Structural image or section curves may use `64–72px` or an elliptical radius; pill shapes are reserved for compact floating controls.

Static cards remain flat. Shadows are reserved for layering, hover feedback and the login panel: mega panel `0 24px 55px rgba(71,40,25,.16)`, card hover `0 20px 42px rgba(77,41,23,.12)`, sticky contact `0 14px 30px rgba(38,24,18,.18)`, consent panel `0 16px 40px rgba(46,33,27,.2)`, and admin login `0 18px 50px rgba(68,40,27,.08)`.

**Product catalog.** Treat the catalog as a factual collection surface, not a decorative product mosaic. Cards use the existing flat cream surface, divider, editorial heading and terracotta action language, and render only real published, non-demo products. Category navigation is derived from categories represented by those products; missing imagery, an empty collection and unavailable data each receive an explicit honest state rather than a fabricated placeholder product.

**Product detail — editorial product sheet.** The built product page uses the same paper, ink and terracotta identity as the shared header and footer. A quiet breadcrumb leads into a wide product image stage with a narrow vertical thumbnail rail on desktop; the factual title, application subtitle, two-column key-fact grid and primary action occupy the adjacent column. Product imagery is contained on a cream stage so labels and packaging remain legible rather than being cropped for effect. Below, a lightly divided overview and specification pair reads like an editorial product sheet. Additional profile, application, dosage, logistics, downloads, FAQ and related-product sections appear only when corresponding product data exists. Catalog cards follow the same restrained image-and-type rhythm with a bottom divider instead of a boxed mosaic.

**The Product Evidence Rule.** Gallery images, facts, specifications, prices and availability come from the imported product record. Missing imagery receives an explicit unavailable state; absent fields do not acquire decorative stand-ins. The prominent terracotta enquiry action identifies the product in the brief form. Retail controls appear only under the checkout and stock conditions in Interaction.

## Interaction

- Buttons have a minimum 48 px height; mobile navigation targets are at least 44 px.
- Keyboard focus uses a visible terracotta outline.
- The mobile menu locks background scroll, exposes correct expanded state and closes with Escape.
- Primary buttons darken and move up `1px` on hover; navigation indicates active and hover states with an underline. Interactive cards may move up `9px` while their image scales to `1.05`. FAQ icons rotate only to communicate expanded state.
- Focus treatment uses a `3px` semi-transparent terracotta outline with a `3px` offset.
- Motion is limited to the first-view/page fade, mega-panel entrance, purposeful scroll/sticky reveals, loading spinner and restrained image hover movement.
- `prefers-reduced-motion` removes non-essential motion.
- Product search, category selection and pagination preserve one visible URL-backed result state. The primary navigation may expose published product categories dynamically, but must always retain direct routes to **All Products** and **Custom Fragrance** when category data is absent.
- Product-gallery thumbnails indicate the selected image with a terracotta border and `aria-pressed`, support keyboard focus, and show the current image count. Supplementary specifications and description images expand on demand when the imported record is long.
- Show purchase controls only when checkout is configured and the published, non-demo product has retail enabled with an active in-stock variant. Otherwise use one product-linked enquiry action that carries the product into the brief form; never imply that an unavailable item can be bought online.

Disabled public actions use `.58` opacity, `not-allowed` cursor and no transform. Admin actions use `.52`; disabled pagination uses `.45` and suppresses hover. Loading uses the documented spinner or skeleton state, empty states remain explicit and neutral, errors use the error color without destructive visual drama, and unauthorized admin routes return the login/401 state. A dedicated disabled-input visual is not yet established and must not be invented ad hoc.

## Content and imagery

- Use real facility, office and trade-show imagery for company proof.
- Use the existing application images to explain product routes, not as unsupported product claims.
- Photographic sources are compressed JPEGs; Next Image generates responsive AVIF/WebP variants.
- Alt text describes the visible business context; decorative logo images use empty alt text when a text wordmark is adjacent.

## Responsive behavior

- Desktop split compositions stack to one column below 780 px.
- Application cards become single-column on narrow phones.
- Forms collapse from two columns to one and retain 16 px input text to avoid mobile zoom.
- Copy must tolerate long translations and addresses without fixed heights or horizontal scrolling.
- Product catalog cards move from three columns to two below `900px` and one below `650px`; category filters become a horizontally scrollable control row on narrow screens. Product detail split layouts also stack below `900px`, with supporting grids simplified below `650px`.
- On product detail pages, the stacked order below `900px` is title and introduction, gallery, then facts and action. Below `650px`, the gallery thumbnail rail becomes a horizontally scrollable row beneath the main image; overview/specifications and supporting panels become one column. Long imported names and specification values wrap without horizontal page scrolling.

The public navigation condenses at `1190px`; the product catalog/detail use `900 / 650px`, while general public sections use `1050 / 780 / 560 / 460 / 390 / 360px`. Primary split grids stack at 780px, and narrower breakpoints tighten gutters, card internals, forms and floating safe-area spacing. The admin breakpoint map is `1120 / 860 / 600 / 390px`: metrics and content grids reduce, the sidebar becomes a mobile drawer, and controls/pagination stack where necessary.

## Admin mode

The user selected visual scheme 1; the approved concept image is preserved at `docs/admin-scheme-1-reference.png`. It defines the warm ivory, botanical-green, terracotta and jasmine direction. It is a visual reference, not a source of business metrics or feature promises.

The Chinese operations console is an Operate surface: calm, dense enough for daily work and unmistakably part of Sai Zhao without borrowing the public site's expressive page compositions. Its canvas is warm ivory (`#f7f1e9`), panels are near-white (`#fffdf9`), primary ink is dark brown (`#2c211b`), secondary copy is muted brown (`#6c5b50`), and decisions use the terracotta pair `#a34b2b/#74311e`. The deep botanical green sidebar (`#263427`) anchors navigation and is not a second general-purpose action color.

Chinese display headings, metric figures and the wordmark use the self-hosted, weight-600 subset of Noto Serif SC at `public/fonts/admin-noto-serif-sc.woff2`; the font is distributed under the OFL. Body copy, controls and tables continue to use the shared sans-serif interface stack. The serif supplies fragrance character at high-value moments while compact sans-serif labels preserve scan speed.

The dashboard hero uses the real jasmine image at `public/images/admin-jasmine-banner.jpg`, composed as a quiet full-width band behind the page title. It is a signature overview treatment, not a generic background for every admin page. Panels remain flat, lightly bordered and mostly square-cornered; the sidebar, ivory canvas and measured whitespace provide hierarchy instead of decorative shadows or nested cards.

All analytics and order surfaces share the same five Beijing-time presets: **Today**, **This week**, **This month**, **90 days**, and **Custom** (`今天 / 本周 / 本月 / 90天 / 自定义`). Preset controls use pressed state semantics, custom dates expose explicit start and end fields, and the currently resolved date range remains visible. Filters and summaries must retain one consistent range rather than implying that each module is reporting a different period.

Responsive behavior follows `1120 / 860 / 600 / 390px`. At 1120px, metric grids reduce and multi-column summaries stack. At 860px, the fixed sidebar becomes an off-canvas navigation drawer beneath the 72px top bar. At 600px, forms, filters, headers and panel controls stack while metric cards remain two-up where space permits. At 390px, metrics become a single column. Touch navigation targets remain at least 44px and the layout never relies on horizontal page scrolling; wide data tables may scroll within their own panel.

Operational truth outranks visual fullness. Loading states announce progress without substituting invented values. Empty cards and tables name the missing dataset and preserve their surrounding structure. Errors use the established danger treatment and state the recovery path. Unauthorized sessions route to the authentication surface rather than exposing a partial dashboard. Setup or unavailable integrations are labelled explicitly, and no placeholder metric, chart, visitor record, enquiry or order may be presented as real business data.
