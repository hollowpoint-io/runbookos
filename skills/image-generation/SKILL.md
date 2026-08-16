# Image Generation and Editing

## Purpose

Generate, edit, resize, or prepare visual assets for ecommerce and agency work.

## Use When

- Use this skill when the user asks to generate or edit a visual asset: product images, banners, ad or content creative.
- Use for mechanical image work: cutouts, resizes, compression, format conversion.
- Use when product listings need square-format images prepared to the ecommerce image policy.
- Do not use to write the surrounding copy, captions, or alt-text strategy — use `content-writing`.
- Do not use to create the products the images belong to — `shopify-product-listing` owns the listing flow and image-to-variant mapping; this skill supplies the assets.

## Research Phase (always first)

- Read brand context — colours, style rules, banned aesthetics — and the asset requirements before generating anything.
- Scan `workspace/clients/<client>/assets/generated/` for existing assets that already cover the request. Do not regenerate what exists.
- Verify the premise: confirm target dimensions, format, and destination (web, ad platform, Shopify) against the client's actual specs, not assumptions. Confirm source images exist and are usable before committing to an edit plan.
- If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Determine whether the task needs generation, editing, cutout, resize, compression, or format conversion.
2. Create an image handoff note in the relevant client workspace with prompt, source assets, target output path, provider/tool used, and provenance requirements.
3. Route generation by provider: Codex should use native image generation/editing when available; Claude should defer to Google/Nano Banana or a Codex handoff.
4. Produce assets under `workspace/clients/<client>/assets/generated/`.
5. Save the prompt, source image references, output paths, dimensions, and usage notes.
6. For product images, follow the ecommerce square image policy.

## Effort & Model Tiers

- `fast`: resizes, compression, format conversion, scanning for existing assets.
- `balanced` (manifest default): generation prompts, edits, handoff notes.
- `deep`: brand-sensitive creative direction, multi-asset campaign sets, client-facing selection rationale.
- Caller effort modes: quick → `fast` + single asset, no variants; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

- **Autonomous:** reads, generation and edits written to `assets/generated/`, handoff notes, previews.
- **Approval required:** overwriting any existing asset; uploading assets to a live store or external platform; publishing anywhere customer-facing.
- **Never:** overwriting original/source files — generated and processed outputs always get new paths.

## Safety

- Do not use private or copyrighted source images without permission.
- Avoid misleading edits.
- Keep generation metadata with the asset.
