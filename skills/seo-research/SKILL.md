# SEO Research

## Purpose

Research keywords, competitors, ranking gaps, and content opportunities for an ecommerce or service business.

## Use When

- Use this skill when mapping keyword opportunities for a domain, category, or seed term.
- Use this skill when comparing the client's rankings against competing domains.
- Use this skill when a content plan or brief list needs keyword evidence behind it.
- Use this skill when collection/page opportunities need search data to justify them.
- Do not use for a full competitor teardown (positioning, offers, pricing) — use competitor-analysis.
- Do not use for location or service-area keyword work — use local-seo.

## Inputs

- `client`: client slug or name
- `domain`: target domain
- `market`: country/region, default `gb`
- `mode`: `keywords`, `competitors`, `gap`, or `full`
- `seed`: optional seed keyword or category

## Research Phase (always first)

1. Read `workspace/clients/<client>/README.md` and context files (brand, market, taxonomy).
2. Check `data/` and `reports/seo/` for prior exports — extend recent work, do not re-pull keyword sets that already exist.
3. Confirm the SEO tool connection is live. If running on fixture/demo data, say so before any numbers appear.
4. Spot-check the live SERP for 2-3 seed terms before trusting volume/difficulty figures — tool estimates and SERP reality diverge.
5. Verify the task's premise against actual data. If asked to explain a ranking drop, confirm the drop exists in GSC/rank data first.

If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Complete the research phase above.
2. Confirm target domain, market, and mode.
3. Pull vendor documentation for the SEO data tool if required.
4. Collect only the minimum data needed for the mode.
5. Save raw exports under `workspace/clients/<client>/data/ahrefs/`, `data/gsc/`, `data/ga4/`, or `data/serp/` depending on source.
6. Separate live tool data, fixture/demo data, manual inputs, and inference.
7. Write the final report under `workspace/clients/<client>/reports/seo/`.
8. Update the client dashboard with the next action if the work changes current priorities.
9. Append a daily memory note with report path, data source, and top recommendation.

## Output

A markdown report with:

- Executive summary
- Keyword opportunities
- Competitor comparison
- Prioritized actions
- Source/tool notes

## Useful Modes

- `keywords`: seed expansion, matching terms, questions, difficulty/volume notes, intent grouping.
- `competitors`: competing domains, top pages, keyword overlap, gaps.
- `gap`: what competitors rank for that the client does not.
- `collections`: ecommerce collection/page opportunities, internal link targets, SERP notes.
- `content-plan`: prioritized briefs or titles based on evidence.
- `technical-context`: source notes for theme audits, indexation, and structured data work.

## Effort & Model Tiers

- API pulls, export parsing, keyword list deduping → `fast`
- Intent grouping, gap tables, structured analysis → `balanced` (manifest default)
- Prioritized actions and executive summary → `deep`

Manifest `modelTier` is the default for the skill's core work. Caller effort modes map: quick → `fast` + minimal scope; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

**Autonomous (no approval needed):**
- Tool reads (Ahrefs, GSC, SERP scrapes)
- Saving exports under `data/` and reports under `reports/seo/`
- Dashboard and daily memory updates

**Approval required before execution:**
- Any write to a live platform — this skill recommends; implementation belongs to other skills
- Sharing findings outside the workspace
- Bulk API pulls well beyond the mode's minimum when usage limits are tight

**Never:**
- Implement site changes from inside this skill — hand off the report instead
- Run paid tool operations the client has not authorized

## Safety

- Do not invent volumes, rankings, or traffic estimates.
- Distinguish live data from inference.
- Do not store API keys or private credentials in reports.
