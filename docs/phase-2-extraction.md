# Phase 2 Extraction Notes

This document is historical. The old Phase 2 plan expanded RunbookOS into workflow manifests, scheduler, messaging, and image-routing helpers. The 2026-05-26 course correction removed those from the core product.

## What Survives

- Shopify skills split by operating lane.
- Agency/FDE defaults in `AGENCY.md`.
- Provider parity through generated adapter files.
- MCP tools for stable read/write boundaries.
- Image, messaging, and scheduled work as future skill/tool surfaces, not current core packages.

## Current Rule

If an agent can do the work by reading `SKILL.md` and using configured tools, keep the procedure in Markdown. Add TypeScript only for setup, adapters, doctors, OAuth helpers, validation, or proven MCP tool contracts.
