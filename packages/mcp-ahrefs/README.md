# @runbookos/mcp-ahrefs

Public-safe Ahrefs MCP package.

## Goal

Provide stable RunbookOS tool names over Ahrefs endpoints so skills do not depend on vendor-specific schemas.

Working today:

- `keyword_overview`
- `keyword_matching_terms`
- `site_overview`
- `site_organic_keywords`
- `site_top_pages`
- `competitor_gap`
- `runbook://ahrefs/status`
- `runbook://ahrefs/fixture-data`

Default mode is fixture-backed. `api_token` mode can perform explicit read-only live reads when a customer supplies their own Ahrefs API token through runtime env.

`ahrefs.competitor_gap` is fixture-only for now. Live competitor-gap mapping should be added only after the API endpoint contract is pinned.

## Safety Model

- Every skill should request only the minimum data needed.
- Expensive/bulk calls should support limits and explain expected usage.
- Raw exports go under `workspace/clients/<client>/data/ahrefs/`.
- No paid API units are consumed in fixture mode.
- Live mode applies `RUNBOOKOS_AHREFS_MAX_ROWS` before calling Ahrefs.

## Environment

```text
RUNBOOKOS_AHREFS_AUTH_MODE=fixture
AHREFS_API_TOKEN=
RUNBOOKOS_AHREFS_FIXTURE=
RUNBOOKOS_AHREFS_MAX_ROWS=25
RUNBOOKOS_AHREFS_DATE=
```

`RUNBOOKOS_AHREFS_FIXTURE` can point to a public-safe fixture JSON file. If omitted in local repo development, the server falls back to `examples/fixtures/ahrefs-demo-seo.json`.

Set `RUNBOOKOS_AHREFS_AUTH_MODE=api_token` to use live read-only Ahrefs API v3 calls. Credentials come from env only and are not written to workspace files.

## Local Run

```bash
pnpm --filter @runbookos/mcp-ahrefs build
node packages/mcp-ahrefs/dist/index.js --workspace /path/to/workspace
```
