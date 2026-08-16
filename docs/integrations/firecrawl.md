# Firecrawl Integration

Status: recommended external MCP.

Firecrawl is a lighter website crawl and scrape option for public pages when Bright Data is too broad or too expensive.

## Required Account

- Firecrawl account.
- `FIRECRAWL_API_KEY` stored outside git.

## Workspace Config

```json
{
  "mcpServers": {
    "firecrawl": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "firecrawl-mcp"],
      "env": ["FIRECRAWL_API_KEY"]
    }
  }
}
```

## Safety Notes

- Crawl public pages only.
- Use URL and depth limits.
- Store raw crawl outputs under `workspace/clients/<client>/data/web/`.
- Include crawl time, requested URL, response status, and extraction limits in generated reports.

## References

- Firecrawl MCP docs: https://docs.firecrawl.dev/mcp
