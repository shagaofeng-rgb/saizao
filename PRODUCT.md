# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

The primary users are international brand owners, product developers, sourcing teams, and buyers evaluating a fragrance-development and manufacturing partner for fine fragrance, candles, home fragrance, or home and fabric care products.

They need to understand Sai Zhao's application fit, development process, production context, and next contact step quickly enough to decide whether to share a project brief.

## Product Purpose

The website presents Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd. as an application-led B2B fragrance-development partner and converts qualified visitors into traceable project enquiries.

Success means that visitors can identify the relevant application, understand the brief-to-sampling route, verify the real company context, and contact the team without ambiguity. Operationally, enquiry, attribution, and content data must be stored and visible rather than simulated.

## Positioning

Sai Zhao starts with the customer's real product application and desired scent experience, then keeps sampling, refinement, and production communication connected. The public site must distinguish this practical development route from a generic fragrance catalogue.

## Operating Context

- Public marketing pages explain capabilities, applications, quality, markets, company context, resources, and contact paths.
- Visitors may submit a project brief or call the named company contact directly.
- Internal staff need a Chinese-language operational view of enquiries and visitor attribution.
- The public source language is English. Additional public languages remain an implementation decision; the system must be structurally ready for them without forcing locale redirects.
- Production is hosted on Vercel and connected to the GitHub repository `shagaofeng-rgb/saizao`.

## Capabilities and Constraints

- Existing stack: Next.js 16, React 19, TypeScript, and Vercel.
- Existing public routes and factual content must remain available unless an audit proves that a route should be redirected or consolidated.
- The main branch currently has no persistent enquiry backend. An unmerged branch contains a Supabase-based enquiry, analytics, and admin foundation that must be security-reviewed before integration.
- Content, contact details, images, and analytics must have one explicit source of truth and must not rely on fake production data.
- Production changes must pass through an isolated Git branch and Vercel Preview before release.

## Brand Commitments

- Preserve the names “Sai Zhao Fragrance” and “Zhejiang Sai Zhao Flavor And Fragrance Co., Ltd.”
- Preserve the supplied logo and real factory, workshop, office, and trade-show imagery.
- Preserve the established warm off-white, dark brown, and terracotta visual world, the editorial fragrance tone, and the split-image page compositions. Redesign work should refine hierarchy, typography, spacing, responsiveness, and consistency without replacing this identity.
- Keep the voice clear, international, factual, restrained, and useful to B2B evaluators.
- Do not fabricate certifications, customers, export records, performance claims, tests, testimonials, or production statistics.

## Evidence on Hand

- Logo: `public/images/sai-zhao-logo.png`.
- Application imagery: `public/images/application-*.jpg`.
- Real company imagery: `public/images/facility/*` and `public/images/sai-zhao-factory-gate.jpg`.
- Verified public contact data is centralized in the current site copy.
- No verified certification set, customer list, case studies, technical test reports, or quantified manufacturing claims are present in the repository; future work must not invent them.

## Product Principles

1. Show the product-development route, not generic perfume imagery alone.
2. Make factual proof and real working context easier to find than marketing claims.
3. Give every core page a clear, low-friction next action.
4. Keep public content, enquiry records, attribution, and operational views consistent.
5. Design for international reading, narrow screens, long translations, and real operational states from the start.

## Accessibility & Inclusion

Target WCAG 2.2 AA for public and admin interfaces, including keyboard access, visible focus, adequate contrast, reduced-motion support, semantic forms, readable zoom, and resilient text expansion.
