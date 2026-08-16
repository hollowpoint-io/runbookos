# Shopify Product Listing

## Purpose

Create or refresh Shopify product listings from spreadsheet rows, supplier files, catalog exports, manual notes, or researched product facts.

The default style is prototype-like: the agent can do the messy parsing and drafting, but it must present a clear preview before any live write. Users can amend client-specific mappings in this file or in the client dashboard as they learn the store.

## Use When

- Use this skill when listing new products on a client's Shopify store from spreadsheets, supplier files, pasted tables, or manual notes.
- Use when refreshing existing listings: variants, prices, costs, metafields, images, or product SEO meta.
- Use when sparse title-only rows need public product facts researched before listing.
- Do not use for collection pages or collection metafield content — use shopify-collection-content.
- Do not use for store-wide tag/price/inventory sweeps across existing products — use shopify-bulk-operations.

## Inputs

- `client`: client slug or name
- `store`: Shopify shop domain
- product source: pasted table, CSV, supplier file, folder, URL list, or manual notes
- optional image folder
- optional launch status: default `draft`
- optional client-specific conventions: metafield map, tag rules, image rules, SEO style, approval policy

## Startup Checks (research phase — always first)

1. Read `workspace/clients/<client>/README.md`, product workstream notes, brand notes, and any product mapping files.
2. Confirm Shopify credentials are runtime-only. If not connected, run fixture/demo mode or stop with setup instructions.
3. Identify client-specific rules:
   - required tags
   - product type taxonomy
   - vendor casing
   - option names
   - metafield namespaces/keys
   - variant/image naming conventions
   - SEO title suffix behavior in the theme
4. If rules are missing, infer cautiously from existing products and mark assumptions.

## Workflow

1. Parse the input into normalized product candidates.
2. Group rows sharing the same canonical product title into variants.
3. Detect likely variant axis: colour, size, flavour, strength, resistance, bundle size, material, capacity, or another client-specific option.
4. Skip empty/admin-only columns and preserve unknown columns in notes rather than throwing them away.
5. Validate required fields: title, vendor/brand, price, SKU or variant identifier, status, inventory policy, tags, product type, and images.
6. For sparse title-only rows, research public product facts if requested. Label researched values and cite sources.
7. Draft SEO meta from product facts and search/competitor patterns where tools are available.
8. Prepare a creation preview:
   - product title
   - variant count and option values
   - vendor, product type, tags
   - price/cost/inventory fields
   - metafields to set
   - images to process/upload
   - SEO title and description
   - assumptions and skipped fields
9. Wait for approval before live creation or update unless the user gave a direct explicit instruction for draft creation.
10. Create products as `draft` by default.
11. Apply metafields only when the namespace/key/type/value are known.
12. Set cost prices through inventory item APIs where available and authorized.
13. Process/upload images when source images are supplied.
14. Save a report with admin links or planned IDs, created/updated IDs, skipped fields, image status, metafields, SEO meta, and rollback notes.
15. Update the client dashboard, product workstream, and daily memory.

## Effort & Model Tiers

- Row parsing, product scanning, image processing: `fast`.
- Standard drafting against known client mappings: `balanced`.
- SEO meta, researched product facts, mapping inference for new clients: `deep` (manifest default).
- Effort modes: quick = `fast` + smallest safe batch; standard = manifest tier; deep = `deep` + full startup checks + verification evidence in the report.

## Product Data Rules

- Treat the spreadsheet/header row as the source of truth, but do not blindly trust messy columns.
- Preserve original source rows in `workspace/clients/<client>/products/source/` when practical.
- Normalize casing only when the client conventions say so.
- Do not invent compliance, certification, age-restriction, medical, financial, or technical claims.
- If a metafield value does not match existing allowed choices, flag it before setting it.
- If a list/reference metafield is required, verify whether Shopify expects JSON array values, IDs, handles, or metaobject references.

## SEO Meta Process

1. Search or inspect competing product pages when research tools are available.
2. Extract title/H1/meta description patterns, not copyrighted body copy.
3. Write a meta title around 50-60 characters unless the client's theme adds a suffix.
4. Write a meta description around 140-155 characters.
5. Lead with the product name and buyer intent.
6. Include only facts supported by product data or cited sources.
7. Do not append the store name if the theme already appends it.

## Product Image Policy

- Prefer square 1200x1200 product images unless the client specifies another standard.
- Use white, transparent, or brand-specific background according to client rules.
- Output WebP when platform and client conventions support it.
- Preserve originals and write generated/processed assets under `workspace/clients/<client>/assets/`.
- Variant images should map to variant option values where possible.
- Ask before guessing unclear image-to-variant mappings.
- Record prompts, source files, output paths, dimensions, and upload status.

## Approval Preview

Before any live write, produce a human-readable preview containing:

- exact action type: create, update, image upload, metafield update, cost update, SEO update
- affected products/variants
- old value and new value when updating
- data source
- assumptions
- rollback plan
- expected external API calls

## Approval Boundaries

- Autonomous: startup checks, parsing, validation, research, drafting, preview preparation, fixture/demo mode, reports.
- Approval required: every live write listed in Approval Preview above. Only exception: draft creation when the user gave a direct explicit instruction for it.
- Never: the items under Safety — token storage, customer/order data exposure, invented specs or regulated claims.

## Rollback Notes

For every created or updated object, record:

- product ID/GID
- variant IDs/GIDs
- inventory item IDs
- media/image IDs
- metafields changed
- old values for updates
- how to revert or archive

## Safety

- Default status is draft.
- Never store tokens.
- Never expose customer/order data.
- Never invent specs or regulated claims.
- Mutating writes require approval unless the user explicitly gave direct instruction for the specific action.
- Prefer smaller batches when mappings are new.
- Stop on partial failure, record what changed, and ask before continuing.
