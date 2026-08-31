# Sai Zhao Website Audit — 31 August 2026

## Outcome

The public website, private admin foundation and data capture layer have been reviewed and rebuilt on the isolated `codex/full-site-audit-redesign` branch. Production has not been changed.

## Audit matrix

| Area | Initial finding | Implemented status |
| --- | --- | --- |
| Public routes | Core pages loaded, but metadata and URL defaults were inconsistent | 15 public routes plus privacy, error, loading and 404 states; one H1 per route |
| Responsive UI | Narrow-card fixes existed, but menu and text expansion were not fully verified | 390 px and desktop route audits pass without horizontal overflow; keyboard menu close and body scroll lock verified |
| Visual system | Warm editorial direction was inconsistent in type, radius and spacing | Existing palette and image compositions retained; typography, hierarchy, controls, cards and admin surfaces unified |
| Enquiry API | Basic validation; no persistence on main; malformed requests could return 500 | Content-type/body/origin validation, honeypot, privacy acceptance, rate-limit fingerprinting, persistent RPC and optional notification flow |
| Analytics | Insecure fallback hash salt and no consent gate | Explicit first-party consent, required secrets, preview/bot/internal exclusion, request limits and no advertising cookies |
| Admin security | Plain password comparison and no login throttling | Timing-safe comparison, minimum secret requirements, strict signed cookie and database-backed attempt limits |
| Database security | Public security-definer functions used a broad search path | Empty search paths, qualified tables, explicit grants/revokes, RLS, private rate-limit table and service-role-only RPC |
| SEO | Wrong fallback domain, no canonicals, duplicate “Fragrance” titles | Production domain centralized, canonicals per route, corrected titles, robots, sitemap, OG/Twitter metadata and FAQ schema |
| Images | 13 photographic PNGs used about 18.7 MB | JPEG source set about 4.1 MB plus responsive AVIF/WebP delivery |
| Language | Public English and Chinese admin were not explicitly separated | Public `en`, admin `zh-CN`, no forced redirects, documented locale expansion workflow |
| Failure states | Form and route errors were incomplete | Loading, 404, runtime error, form sending/success/error, admin setup/error/empty and disabled states added |

## Verification completed

- `pnpm lint`
- `pnpm build` (25 generated routes)
- Desktop and 390 px browser route sweeps
- Canonical, H1, broken-image and horizontal-overflow checks
- Mobile menu, submenu and Escape-key behavior
- API negative-path checks for content type, required fields, unconfigured storage and unauthorized admin access
- Security response headers, robots and sitemap checks

## External dependency status

The connected Supabase project reports `ACTIVE_HEALTHY` but its connector still returns a temporary restore/authentication failure. No production database migration has been applied. The hardened schema is ready for an isolated database branch or a controlled production migration after the connector becomes available.

