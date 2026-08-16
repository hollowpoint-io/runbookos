# Notion Integration

Status: recommended external MCP.

Notion is useful for client knowledge bases, lightweight CMS work, and shared operating docs.

## Required Account

- Notion workspace access.
- OAuth through Notion's hosted MCP server.

## Workspace Config

For stdio-only MCP clients, Notion documents `mcp-remote` against its hosted server:

```json
{
  "mcpServers": {
    "notion": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.notion.com/mcp"],
      "env": []
    }
  }
}
```

Clients with remote MCP support can use `https://mcp.notion.com/mcp` directly.

## Safety Notes

- Notion MCP can read and write pages according to the connected user's access. Treat it as a mutating integration.
- Require approval before changing client-facing pages or databases.
- Export or summarize Notion evidence into the client workspace before using it in reports.

## References

- Notion MCP overview: https://developers.notion.com/guides/mcp/overview
- Notion MCP setup: https://developers.notion.com/guides/mcp/get-started-with-mcp
