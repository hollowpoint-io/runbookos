# Competitor Analysis

## Purpose

Research competitors using public data, SEO tools, and storefront/content inspection. Produce actionable intelligence, not scraped page dumps.

Use this for ecommerce competitors, service competitors, marketplace positioning, SEO gaps, pricing ranges, content strategy, and offer comparison.

## Use When

- Use this skill when a full competitor teardown is needed: positioning, offers, pricing, content strategy.
- Use this skill when comparing the client's SEO footprint against one or more named competitors.
- Use this skill when inspecting a competitor's category architecture, product range, or trust signals.
- Use this skill when a strategy decision hinges on what a competitor is actually doing, not assumptions.
- Do not use for keyword research on the client's own domain — use seo-research.
- Do not use for local pack or GBP competitor checks — use local-seo.

## Inputs

- `client`: client slug or name
- `competitor_url`: competitor domain or URL
- `our_domain`: optional comparison domain
- `focus`: `full`, `seo`, `products`, `content`, `pricing`, or `technical`
- `market`: country/region if search intent matters

## Research Phase (always first)

1. Read the client dashboard, active context, brand notes, and any existing files under `research/competitors/` — extend prior work, do not restart it.
2. Verify the named competitor actually competes: check keyword overlap or SERP co-occurrence before deep-diving. A "competitor" the client names is sometimes not one in search.
3. Visit the competitor's live pages before relying on tool snapshots — sites change faster than indexes.
4. Pull the tool data for the focus (organic keywords, top pages, backlinks) before drafting any observation.

If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Complete the research phase above.
2. Confirm the competitor URL, focus, market, and whether the user wants a single competitor or a comparison set.
3. Collect only the data needed for the focus:
   - SEO: organic keywords, top pages, backlink/referring-domain summary, ranking overlaps, and gaps.
   - Content: landing page structure, headings, content types, collection/category hubs, FAQs, and publishing patterns.
   - Products: category architecture, product count estimates, pricing ranges, variants, review/trust signals, shipping/returns promises.
   - Technical: platform signals, structured data, page speed signals, indexation controls, and obvious UX friction.
4. Save raw exports or extracted notes under `workspace/clients/<client>/research/competitors/`.
5. Distinguish fact, inference, and uncertainty. Do not present scraped observations as verified financial truth.
6. Write a concise report under `workspace/clients/<client>/reports/research/`.
7. Update the client dashboard if the research changes current priorities.
8. Append a daily memory note with report path, competitor names, data sources, and recommended next action.

## Report Shape

- Executive summary
- Competitor scorecard
- SEO opportunity table
- Content gap list
- Product/offer positioning notes
- Pricing and promotion observations
- Technical/UX observations
- Recommended actions, ranked by impact and effort
- Source and uncertainty notes

## Source Rules

- Use live tool data when available.
- If using fixture/demo/manual inputs, label them clearly.
- Save source URLs for claims based on public pages.
- Do not retain raw scraped HTML unless the user explicitly asks and it is within policy/legal boundaries.

## Effort & Model Tiers

- Page scraping, export pulls, scorecard data collection → `fast`
- Structured comparison tables and gap lists → `balanced`
- Synthesis, scorecard judgement, ranked recommendations → `deep` (manifest default)

Manifest `modelTier` is the default for the skill's core work. Caller effort modes map: quick → `fast` + minimal scope; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

**Autonomous (no approval needed):**
- Reading public competitor pages and pulling tool data
- Saving notes under `research/competitors/` and reports under `reports/research/`
- Dashboard and daily memory updates

**Approval required before execution:**
- Anything that touches the competitor directly — contacting them, creating accounts or trials on their systems
- Sharing findings outside the workspace
- Retaining raw scraped HTML

**Never:**
- Attempt admin/API/private access to competitor systems
- Bypass robots.txt or rate limits

## Safety

- Use only public pages, customer-owned properties, or authorized tools.
- Do not store credentials or private tokens in research files.
- Avoid defamatory claims; phrase uncertain findings as observations.
