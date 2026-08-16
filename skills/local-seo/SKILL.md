# Local SEO

## Purpose

Plan and produce local SEO assets: service area pages, GBP audits, local competitor analysis, and structured data recommendations.

## Use When

- Use this skill when planning or briefing service-area and location pages.
- Use this skill when auditing a Google Business Profile or local pack presence.
- Use this skill when comparing local pack competitors on categories, reviews, photos, and schema.
- Use this skill when local structured data (LocalBusiness, service schema) needs recommendations.
- Do not use for national or ecommerce keyword research — use seo-research.
- Do not use when the business has no physical or service-area presence — use seo-research or content-writing.

## Research Phase (always first)

1. Read the client dashboard, brand context, and the service/location list — confirm coverage against client-provided data, not assumption.
2. Verify NAP facts (name, address, phone, service areas) against the client's own records before they appear in any draft.
3. Pull live local pack results for sample service+location queries — pack composition determines what wins, and it varies by location.
4. Check the client's existing location/service pages before proposing new ones — reoptimise before building.

If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Complete the research phase above.
2. Build a keyword map by service and location.
3. Audit local pack competitors.
4. Compare categories, reviews, photos, service pages, schema, and internal links.
5. Produce page briefs or drafts.
6. Save outputs under `workspace/clients/<client>/local-seo/`.

## Effort & Model Tiers

- Keyword map assembly, local pack data collection → `fast`
- Competitor comparison tables and page briefs → `balanced`
- Page drafts, strategy, client-facing recommendations → `deep` (manifest default)

Manifest `modelTier` is the default for the skill's core work. Caller effort modes map: quick → `fast` + minimal scope; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

**Autonomous (no approval needed):**
- Local pack and competitor research, keyword maps
- Briefs and drafts under `workspace/clients/<client>/local-seo/`
- Dashboard and daily memory updates

**Approval required before execution:**
- Publishing location or service pages to a live site
- Editing a GBP listing
- Directory or citation submissions

**Never:**
- Create or edit a GBP listing without explicit instruction
- Publish pages for locations the client has not confirmed they serve

## Safety

- Do not fabricate addresses, certifications, or service coverage.
- Verify local facts before using them in copy.
- Separate strategy from ready-to-publish content.
