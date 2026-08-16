# Ahrefs Integration

Status: working fixture-backed MCP with opt-in live read-only API mode.

RunbookOS ships `@runbookos/mcp-ahrefs` with public fixture data so SEO skills can depend on stable tool contracts instead of raw vendor response shapes. `api_token` mode can perform explicit read-only Ahrefs API v3 reads when customer-owned env vars are supplied.

## Required Account

- Ahrefs account with API access.
- Ahrefs API token with the minimum scope needed for keyword, site, backlink, or competitor reports.

## Workspace Config

Enable fixture mode with the CLI:

```bash
pnpm runbook integrations setup ahrefs ./my-workspace --mode fixture
pnpm runbook integrations doctor ahrefs ./my-workspace
```

Use `--mode api_token` only for customer-owned live read-only API access. The CLI enables adapter wiring but never writes credentials.

```json
{
  "mcpServers": {
    "ahrefs": {
      "enabled": false,
      "env": [
        "RUNBOOKOS_AHREFS_AUTH_MODE",
        "AHREFS_API_TOKEN",
        "RUNBOOKOS_AHREFS_FIXTURE",
        "RUNBOOKOS_AHREFS_MAX_ROWS",
        "RUNBOOKOS_AHREFS_DATE"
      ]
    }
  }
}
```

Local repo adapter generation can run this package from `packages/mcp-ahrefs/dist/index.js` when enabled. Published-package configs will use `@runbookos/mcp-ahrefs`.

## Working Tools

- `ahrefs.keyword_overview`
- `ahrefs.keyword_matching_terms`
- `ahrefs.site_overview`
- `ahrefs.site_organic_keywords`
- `ahrefs.site_top_pages`
- `ahrefs.competitor_gap`

`ahrefs.competitor_gap` is fixture-only until a clean live endpoint mapping is added.

## Live Read Mode

```bash
RUNBOOKOS_AHREFS_AUTH_MODE=api_token
AHREFS_API_TOKEN=...
RUNBOOKOS_AHREFS_MAX_ROWS=25
```

The live mode currently calls selected Ahrefs API v3 Site Explorer and Keywords Explorer endpoints with explicit selected fields and row limits. It returns source endpoint, retrieval timestamp, requested domain/country, and an API-unit boundary note.

Run the skipped-by-default live smoke only against your own Ahrefs account:

```bash
RUNBOOKOS_ENABLE_LIVE_AHREFS_SMOKE=1 \
AHREFS_API_TOKEN=... \
AHREFS_LIVE_TEST_DOMAIN=example.com \
pnpm verify:ahrefs-live
```

## Safety Notes

- Treat API units as paid spend.
- Use explicit row and export limits.
- Store raw exports under `workspace/clients/<client>/data/ahrefs/`.
- Include source URL, API endpoint, query, timestamp, and limit metadata in reports.
- Fixture mode consumes no paid Ahrefs API units and ignores `AHREFS_API_TOKEN`.
- Live mode never logs or writes `AHREFS_API_TOKEN`.

## References

- Ahrefs API docs: https://docs.ahrefs.com/docs/api/reference/introduction
- Ahrefs limits and API units: https://docs.ahrefs.com/docs/api/reference/limits-consumption
