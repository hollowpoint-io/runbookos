# Shopify Theme Audit

## Purpose

Audit a Shopify theme for SEO, structured data, performance, Liquid/code quality, accessibility, and ecommerce UX risk.

## Use When

- Use this skill when the user asks for a theme audit, technical Shopify audit, or Liquid/theme quality pass.
- Use for SEO template reviews: meta fallbacks, canonicals, robots handling, JSON-LD validity.
- Use for Core Web Vitals or storefront performance reviews.
- Use for accessibility or ecommerce UX passes across theme templates.
- Do not use for store-data issues — products, collections, redirects, metafield content — use `shopify-audit`.
- Do not use to write or wire collection-page content — use `shopify-collection-content`.

## Inputs

- `client`: client slug or name
- `theme_path`: optional local theme path
- `store`: optional Shopify domain
- `scope`: `full`, `seo`, `performance`, `schema`, `accessibility`, `code-quality`, or `ux`

## Research Phase (always first)

- Read the client dashboard, theme notes, ecommerce context, and existing audit reports — do not re-flag risks the client has already accepted.
- Confirm which theme you are auditing: live theme ID versus dev copies. Auditing the wrong lineage wastes the session.
- Pull a fresh copy of the theme. Local theme directories go stale the moment someone edits in the admin — a stale pull invalidates the audit.
- Verify the premise against the live storefront. If the task says "product schema is broken", fetch a live product page and confirm before auditing the snippet.
- If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Identify whether the theme is local, pulled from Shopify, or only available through storefront/browser inspection.
2. Default to read-only. Do not publish or push theme changes during an audit.
3. If a local theme exists, inspect:
   - `layout/theme.liquid`
   - product, collection, page, blog, and article templates/sections
   - SEO/meta snippets
   - schema/JSON-LD snippets
   - product card and image snippets
   - app embeds and third-party scripts
4. Run available validators when possible:
   - `shopify theme check`
   - JSON parse for every JSON-LD block
   - browser/Lighthouse-style checks if the browser tool is connected
5. Categorize findings as `critical`, `warning`, or `info`.
6. Write the audit under `workspace/clients/<client>/reports/shopify/` or `workspace/clients/<client>/theme/`.
7. Add fix tickets or implementation notes only after the audit is complete.
8. Update daily memory and the client dashboard with the top risks and next action.

## Audit Checklist

### SEO And Structured Data

- One H1 per major template.
- Meta title/description fallbacks exist and avoid duplicate brand suffixes.
- Canonicals are absolute and sensible for collections, filtered URLs, search pages, and pagination.
- Search pages and low-value filtered pages have appropriate robots handling.
- Product JSON-LD uses real product data, image, SKU, brand, offer, price, currency, URL, and availability.
- Do not fabricate ratings or review counts.
- Collection, breadcrumb, article, FAQ, and organization schema are valid JSON.
- JSON-LD has no Liquid comma/trailing-comma errors.

### Performance

- Critical CSS and render-blocking CSS are understood.
- Scripts use `defer`, `async`, or delayed loading unless genuinely critical.
- App embeds and third-party scripts are listed with impact notes.
- Above-the-fold images use suitable priority and dimensions.
- Below-the-fold images lazy-load.
- Images use modern Shopify image filters and responsive widths.
- Repeated Liquid loops and expensive template patterns are flagged.

### Accessibility And UX

- Links/buttons have accessible names.
- Images have correct alt text or decorative empty alt.
- Color contrast issues are noted.
- Product cards, filters, menus, modals, drawers, and variant selectors are keyboard-aware where inspectable.
- Search, cart, checkout handoff, and collection navigation are checked for obvious friction.

### Code Quality

- Theme Check errors and warnings are categorized.
- Dynamic tags that can break HTML validity are flagged.
- Deprecated filters and remote assets are noted.
- CSS duplication, excessive inline styles, and global selector leakage are flagged.

## Output

- Summary
- Top risks
- Evidence table
- Fix plan
- Files/templates inspected
- Tests/checks run
- Unknowns and assumptions

## Effort & Model Tiers

- `fast`: theme pulls, file scanning, `shopify theme check` runs, JSON-LD parse checks.
- `balanced`: checklist passes and evidence-table assembly.
- `deep` (manifest default): root-cause analysis of render/schema/performance failures, fix-plan and risk synthesis.
- Caller effort modes: quick → `fast` + critical checklist items only; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

- **Autonomous:** reads, theme pulls, validator runs, local audit reports, fix tickets.
- **Approval required:** any theme code push to Shopify — live or dev theme; any other store mutation. For fixes, create a preview, backup/rollback note, and approval request before pushing.
- **Never:** publishing a theme during an audit; pushing fixes without a backup/rollback note.

## Safety

- Audit first, change second.
- Do not expose customer/order data.
- Do not store access tokens.
