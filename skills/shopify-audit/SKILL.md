# Shopify Audit

## Purpose

Run a structured health check on a Shopify store covering products, collections, SEO, theme, and operational risk.

## Use When

- Use this skill when the user asks for a store audit, store health check, or "what's wrong with this store".
- Use when onboarding a new Shopify client and a baseline risk picture is needed.
- Use when one area — products, collections, SEO, or operations — needs a structured pass with categorized findings.
- Do not use for Liquid/theme code questions — use `shopify-theme-audit`.
- Do not use for sales, stock, or margin reporting — use `shopify-merchandising`.

## Inputs

- `client`: client slug or name
- `store`: Shopify store domain
- `scope`: `full`, `products`, `collections`, `seo`, `theme`, or `operations`

## Research Phase (always first)

- Read `workspace/clients/<client>/README.md`, ecommerce context, and prior audits in `reports/shopify/` — note what was already flagged and what changed since.
- Pull fresh store state via the API: theme, product/collection counts, published status. Never audit from a stale export — stale data invalidates findings.
- Verify the requested scope against actual store state. A "collections audit" on a store whose content lives in metafields needs metafield reads, not description reads.
- If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Verify credentials are available through the runtime, not stored in files.
2. Start read-only unless the user explicitly authorizes a write.
3. Collect store facts: theme, product counts, collections, metafields, SEO fields, redirects, and obvious schema gaps.
4. If the user asks specifically about Liquid/theme code, switch to the `shopify-theme-audit` skill.
5. Categorize issues as `critical`, `warning`, or `info`.
6. Write the audit to `workspace/clients/<client>/reports/shopify/`.
7. Add clear next actions to the client dashboard if appropriate.

## Audit Areas

- products: missing SEO, incomplete media, variant issues, product type/tag drift, inventory risk
- collections: missing content, weak SEO, broken rules, empty/near-empty collections
- merchandising: stock, pricing, discount, dead-stock, and low-stock signals where data is available
- theme/storefront: obvious SEO/rendering/schema/performance issues
- operations: risky manual processes, missing rollback paths, missing approval boundaries

## Effort & Model Tiers

- `fast`: bulk data pulls, export parsing, counting products/collections/redirects.
- `balanced` (manifest default): standard audit checks and report assembly.
- `deep`: root-cause analysis of critical findings, risk prioritisation, client-facing summary.
- Caller effort modes: quick → `fast` + headline checks only; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

- **Autonomous:** reads, API data pulls, writing audit reports and dashboard notes to the workspace.
- **Approval required:** any fix to the live store — including issues found during the audit. The audit mandate does not include repair. Preview and approval request first for every mutation.
- **Never:** bulk mutations from within an audit session; publishing a theme.

## Safety

- Default to read-only.
- Never expose customer data in reports.
- Never persist access tokens.
