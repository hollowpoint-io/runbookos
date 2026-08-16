# Shopify Collection Content

## Purpose

Create or refresh Shopify collections and collection-page content: collection rules, SEO meta, above-grid intro, bottom content blocks, FAQs, internal buttons, images, and theme/CMS/metafield wiring.

This skill is deliberately client-configurable. Every Shopify theme can render collection content differently, so discover and document the client's collection schema before writing.

## Use When

- Use this skill when creating a new Shopify collection — manual or smart/rule-based — with page content.
- Use when refreshing collection-page content: intro, content blocks, FAQs, SEO meta, internal links, images.
- Use when wiring collection metafields or metaobjects to a theme.
- Do not use for individual product listings — use shopify-product-listing.
- Do not use for keyword research with no collection to build or refresh — use seo-research.

## Inputs

- `client`: client slug or name
- `store`: Shopify shop domain
- target collection title/handle
- collection type: manual, smart/rule-based, automated, or content-only refresh
- source products, tags, vendors, product types, or rule values
- content brief, keyword target, competitor/source notes
- optional image assets

## Startup Checks (research phase — always first)

1. Read the client dashboard, collection workstream, brand notes, SEO notes, and existing collection conventions.
2. Inspect existing collections that render correctly.
3. Identify the theme's content fields:
   - built-in collection title/description/SEO fields
   - collection metafields
   - metaobject references
   - image/file references
   - button/navigation references
   - FAQ/content block schema
4. Confirm whether rich text is Markdown, HTML, Shopify rich text JSON, or another structured format.
5. Confirm whether referenced metaobjects/content records publish as draft or active by default.
6. Record client-specific field mappings in the collection workstream or dashboard so future sessions do not rediscover them.

## Workflow

1. Confirm the collection purpose and buyer/search intent.
2. Pre-flight handle availability and naming conventions.
3. For smart/rule-based collections, verify rule fields exactly:
   - vendor casing
   - tags
   - product type
   - metafield values
   - product status/published state
4. Pull representative products to avoid writing content that does not match the actual assortment.
5. Research search intent and competitor collection structures when tools are available.
6. Draft:
   - H1/title
   - meta title
   - meta description
   - above-grid intro
   - lower-page content blocks
   - FAQs
   - internal links/buttons
   - image brief or selected assets
7. Convert content into the client's required storage format.
8. Prepare a preview with collection rules, content fields, references, and rollback plan.
9. Wait for approval before creating or updating live Shopify objects.
10. Create/update collection and supporting content records only after approval.
11. Verify admin state and storefront rendering if browser access is available.
12. Save a report under `workspace/clients/<client>/collections/` and update memory/dashboard.

## Effort & Model Tiers

- Schema discovery, rule verification, representative product pulls: `fast`.
- Format conversion and preview assembly: `balanced`.
- Content drafting, intent research, SEO meta: `deep` (manifest default).
- Effort modes: quick = `fast` + minimal scope; standard = manifest tier; deep = `deep` + full startup checks + verification evidence in the report.

## Content Placement Strategy

- Above-grid intro: short, helpful, keyword-aware, written for buyers.
- Bottom content block 1: what the collection is and who it is for.
- Bottom content block 2: comparison or buying guidance.
- Bottom content block 3: compatibility, usage, sizing, variants, materials, or decision factors.
- FAQs: real buyer/search questions, not filler.
- Buttons/internal links: only where they help navigation to related sub-collections, guides, or brands.
- Images: use only relevant, approved assets or generated assets with provenance.

## Shopify Rich Text Notes

Shopify rich text metafields often use a JSON AST, not Markdown or HTML. If the client uses rich text JSON:

- root node wraps all blocks
- paragraphs contain inline text/link nodes
- headings specify `level`
- list items usually contain inline nodes directly
- links must be valid URLs
- do not paste HTML into a rich text JSON field

If unsure, inspect an existing working field and mirror that structure.

## Common Gotchas

- The theme may read one metafield key while a similarly named legacy key is ignored.
- Metaobjects or CMS records may default to draft and not render.
- List/reference metafields may require JSON-encoded arrays or GIDs.
- Rule-based collections are sensitive to exact tag/vendor/product type casing.
- Draft products may count in admin but not show on the storefront.
- A populated admin field does not guarantee the theme renders it.
- SEO title fields can be duplicated if the theme appends the store name automatically.

## Approval Preview

Before any live write, show:

- collection title, handle, type, and rules
- fields/metafields/metaobjects to create or update
- old values and new values
- content preview
- SEO preview
- image/reference changes
- expected API calls
- rollback plan

## Approval Boundaries

- Autonomous: startup checks, schema discovery, intent research, drafting, format conversion, preview preparation.
- Approval required: every live Shopify write — collection create/update, metafield/metaobject writes, publishing content records. Gate on the Approval Preview above.
- Never: the items under Safety — token storage, overwriting content without a backup, unsupported regulatory/medical/legal/financial claims.

## Safety

- Preview content before publishing.
- Keep collection creation and content population reversible.
- Do not overwrite existing content without preserving a backup.
- Avoid unsupported regulatory, medical, legal, financial, or product claims.
- Do not store tokens.
- Stop and ask when the theme schema is unclear.
