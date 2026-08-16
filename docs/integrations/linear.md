# Linear Integration

Status: recommended external MCP.

Linear is useful for agency operations, implementation queues, issue triage, and client-facing delivery tracking.

## Required Account

- Linear account with workspace access.
- OAuth through Linear's hosted MCP server, or API key/bearer token where your MCP client supports it.

## Workspace Config

For stdio-only MCP clients, Linear documents `mcp-remote` against its hosted server:

```json
{
  "mcpServers": {
    "linear": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "mcp-remote", "https://mcp.linear.app/mcp"],
      "env": []
    }
  }
}
```

Clients with remote MCP support can use `https://mcp.linear.app/mcp` directly.

## Safety Notes

- Prefer read-only issue and project lookup for research work.
- Require approval before creating or updating issues, comments, labels, or project state.
- Keep RunbookOS reports as the source artifact before syncing summaries to Linear.

## References

- Linear MCP docs: https://linear.app/docs/mcp
