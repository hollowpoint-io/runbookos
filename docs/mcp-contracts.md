# MCP Contracts

RunbookOS skills should not depend directly on vendor-specific MCP names when a stable RunbookOS tool contract exists.

## Goal

Expose stable tool contracts for agents and skills:

- `workspace.client_read`
- `workspace.report_write`
- `workspace.approval_preview`
- `memory.search`
- `memory.append_daily`
- `shopify.product_search`
- `shopify.collection_search`
- `shopify.theme_inspect`
- `ahrefs.site_overview`
- `ahrefs.site_top_pages`
- `ahrefs.site_organic_keywords`
- `gmail.search`
- `gmail.message_metadata`
- `gmail.draft_create`

External MCPs can be configured by command/env name until a first-party package is justified.

## Safety

Every mutating path should produce:

- human-readable preview
- exact target resources
- rollback notes where possible
- explicit approval point

Every data tool should return:

- source
- retrieval timestamp
- limits applied
- uncertainty notes

## Built-In MCP Targets

- Workspace: read context/client files and write safe reports or approval previews.
- Memory: search memory and append daily notes.
- Shopify: fixture-backed and customer-custom-app read-only server works today for overview, product search, collection search, and theme inspection.
- Ahrefs: fixture-backed server works today for site overview, keyword overview, matching terms, organic keywords, top pages, and competitor gaps; opt-in live read-only mode works for selected API v3 site and keyword tools.
- Gmail: OAuth status, metadata-only search/read, and draft creation work today. Sending is not implemented.

See [Integration Catalog](integration-catalog.md) for optional external MCPs and power tools such as Context7, Bright Data hosted MCP, Google Search Console, GA4, Firecrawl, Exa/Perplexity, GitHub, Linear, Notion, and browser automation.
