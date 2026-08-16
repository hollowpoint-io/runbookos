# Exa Integration

Status: recommended external MCP.

Exa is useful for web search, code search, and page fetch work where source context matters.

## Required Account

- Optional Exa API key for higher limits or production use.

## Workspace Config

RunbookOS adapter generation currently emits stdio MCP configs, so use the npm package form:

```json
{
  "mcpServers": {
    "exa": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "exa-mcp-server"],
      "env": ["EXA_API_KEY"]
    }
  }
}
```

Clients that support remote MCP directly can use Exa's hosted URL instead of the stdio bridge.

## Safety Notes

- Keep citation URLs with each research claim.
- Record query, timestamp, result limit, and any domain filters.
- Avoid treating search results as verified facts without cross-checking primary sources.

## References

- Exa MCP docs: https://exa.ai/docs/reference/exa-mcp
