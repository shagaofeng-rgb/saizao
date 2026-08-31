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

## Interaction

- Buttons have a minimum 48 px height; mobile navigation targets are at least 44 px.
- Keyboard focus uses a visible terracotta outline.
- The mobile menu locks background scroll, exposes correct expanded state and closes with Escape.
- Primary buttons darken and move up `1px` on hover; navigation indicates active and hover states with an underline. Interactive cards may move up `9px` while their image scales to `1.05`. FAQ icons rotate only to communicate expanded state.
- Focus treatment uses a `3px` semi-transparent terracotta outline with a `3px` offset.
- Motion is limited to the first-view/page fade, mega-panel entrance, purposeful scroll/sticky reveals, loading spinner and restrained image hover movement.
- `prefers-reduced-motion` removes non-essential motion.

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

The public breakpoint map is `1050 / 780 / 560 / 460 / 390 / 360px`: navigation condenses first, primary split grids stack at 780px, and the smaller breakpoints tighten gutters, card internals, forms and floating safe-area spacing. The admin breakpoint map is `1050 / 760 / 420px`: metrics and content grids reduce, the sidebar becomes a compact top navigation, and controls/pagination stack where necessary.

## Admin mode

The Chinese operations console uses paper `#f4ede4`, panel `#fffaf3`, muted text `#705f55`, deep sidebar `#2c201a`, and the shared `#a34b2b/#74311e` action pair. It keeps the public typography foundations with denser spacing and tabular hierarchy. It must show setup, loading, empty, error and unauthorized states honestly; it never displays mock business metrics as real data.
