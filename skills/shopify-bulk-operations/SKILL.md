# Shopify Bulk Operations

## Purpose

Plan, preview, apply, and roll back bulk Shopify changes such as price updates, tags, redirects, metafields, clearance actions, and product status changes.

## Use When

- Use this skill when changing many products, variants, or collections at once: prices, tags, metafields, redirects, status changes, clearance actions.
- Use when an audit or report produced an action list that now needs applying to the live store.
- Use when a change needs a rollback file — anything touching live prices, availability, or URLs.
- Do not use for creating or refreshing individual product listings — use `shopify-product-listing`.
- Do not use for collection rules or collection-page content — use `shopify-collection-content`.

## Research Phase (always first)

- Read the client dashboard, operations README, and the source reports behind the request.
- Pull fresh live data for every object in scope. Never build an action list from a stale export — prices, tags, and stock change daily, and a stale list applies wrong changes to the wrong objects.
- Verify the premise before building anything: confirm the actual rule conditions, product counts, and blast radius yourself. A request's claim about what a collection or tag contains is often wrong — count it, do not trust it.
- If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Build a dry-run action list from the verified data.
2. Save preview CSV/JSON and a human-readable summary.
3. Submit the action list for approval.
4. Apply only approved actions.
5. Save an action log and rollback file.
6. Update the operations workstream.

## Effort & Model Tiers

- `fast`: data pulls, export parsing, action-list generation from confirmed rules.
- `balanced`: dry-run summaries, preview CSV/JSON assembly.
- `deep` (manifest default): blast-radius and risk assessment, edge-case review of the action list, partial-failure handling.
- Caller effort modes: quick → `fast` + reduced scope, but the dry-run and approval gates still apply in full; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

This is the highest-risk skill in the set. The gates are not negotiable.

- **Autonomous:** reads, fresh data pulls, dry-run action lists, preview CSV/JSON, rollback-file preparation.
- **Approval required:**
  - Every apply step after the dry-run. No exceptions, no "small" batches applied unasked.
  - Each batch separately when applying in batches — approval for batch 1 is not approval for batch 2.
  - Any change to the action list after approval — re-approve the diff, not the original.
- **Never:**
  - Apply without a saved dry-run preview. There is no path to apply that skips it.
  - Write before the rollback file with old values exists on disk.
  - Continue past a partial failure — stop, record exactly what changed, and report. Do not retry or proceed without instruction.

## Safety

- Avoid whole-product changes when variant-level action is safer.
- Rate limit writes.
- Never expose customer/order data in previews, logs, or rollback files.
