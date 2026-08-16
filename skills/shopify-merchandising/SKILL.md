# Shopify Merchandising Report

## Purpose

Generate product and trading reports from Shopify data.

## Use When

- Use this skill when the user asks for a merch report, weekly trading report, or product performance report.
- Use for stock-risk passes: dead stock, low stock, reorder alerts.
- Use for margin, COGS, or discount-performance analysis across products and vendors.
- Do not use for store health, SEO, or data-quality audits — use `shopify-audit`.
- Do not use to apply the price or stock changes a report recommends — use `shopify-bulk-operations`.

## Research Phase (always first)

- Read the client dashboard, reporting conventions, and the previous report — keep period boundaries and metric definitions consistent between reports.
- Pull fresh order and product data for the exact period. Never reuse a prior export — refunds and order edits land after the order date, and stale data corrupts period comparisons.
- Verify the premise before computing: confirm the requested period has data, check cost coverage, and surface known data quirks (missing costs, untracked inventory) up front.
- If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Pull order-level financials for the requested period.
2. Pull active/published/in-stock product and variant data.
3. Calculate revenue, discounts, refunds, COGS, gross profit, margin, velocity, stock days, low stock, dead stock, and negative-margin products.
4. Verify top-level KPIs from order-level fields, not line-item approximations.
5. Write raw exports under `data/shopify/`.
6. Write the report under `reports/merchandising/`.
7. Update operations or product workstreams if the report creates follow-up actions.

## Report Sections

- trading summary
- revenue, refunds, discounts, tax, shipping, and net sales
- product performance
- vendor/category performance
- dead stock
- low stock/reorder alerts
- negative-margin or uncertain-margin products
- discount code performance
- data quality issues, especially missing costs
- recommended actions

## Accuracy Rules

- Top-level financial totals should use order-level fields where available.
- Product-level reporting can use line-item aggregation, but note discounts/refunds assumptions.
- Treat margin as uncertain when cost coverage is incomplete.
- Flag missing cost SKUs instead of hiding them.
- Do not expose customer personal data in reports.

## Effort & Model Tiers

- `fast`: order/product exports, line-item aggregation, cost-coverage counts.
- `balanced` (manifest default): KPI calculation and report section assembly.
- `deep`: anomaly root-cause (margin swings, refund spikes), recommended actions, client-facing summary.
- Caller effort modes: quick → `fast` + trading summary only; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

- **Autonomous:** reads, data pulls, raw exports to `data/shopify/`, report writes to `reports/merchandising/`.
- **Approval required:** deploying or sharing a report outside the workspace; any store change a report recommends; external sends.
- **Never:** applying price, stock, or status changes from within a report session — route recommended actions through `shopify-bulk-operations`.

## Safety

- Redact customer data.
- Treat margin data as uncertain when cost coverage is incomplete.
- Flag assumptions and missing cost data.
