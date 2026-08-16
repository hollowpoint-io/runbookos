# Bright Data Integration

Status: external MCP first, future wrapper optional.

Bright Data is useful for public web research, ecommerce pages, local listings, and SERP-like extraction. RunbookOS should prefer the official external MCP until there is a clear reason to wrap selected tools behind stable RunbookOS contracts.

## Required Account

- Bright Data account.
- API token stored outside git.

Bright Data's MCP expects `API_TOKEN`, so the example config uses that vendor-specific env name.

## Workspace Config

```json
{
  "mcpServers": {
    "brightdata": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "@brightdata/mcp"],
      "env": ["API_TOKEN"]
    }
  }
}
```

After enabling, regenerate adapters:

```bash
pnpm runbook adapters ./my-workspace
```

## Safety Notes

- Use public pages and lawful data sources only.
- Do not scrape authenticated, private, or personal data without a lawful basis.
- Keep raw outputs under `workspace/clients/<client>/data/web/` or `workspace/clients/<client>/data/serp/`.
- Capture source URL, retrieval timestamp, tool, limit, and uncertainty notes in downstream reports.

## References

- Bright Data MCP docs: https://docs.brightdata.com/mcp-server/overview
- Bright Data MCP repository: https://github.com/brightdata/brightdata-mcp
