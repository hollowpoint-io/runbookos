# Context7 Integration

Status: external MCP.

Context7 gives coding agents current library and framework docs. It is useful when provider training data may be stale.

## Required Account

Context7 can be used with a hosted or local MCP setup. If your Context7 plan requires a key, store it outside git and expose it as `CONTEXT7_API_KEY`.

## Workspace Config

```json
{
  "mcpServers": {
    "context7": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": ["CONTEXT7_API_KEY"]
    }
  }
}
```

## Safety Notes

- Use Context7 for documentation lookup, not as a replacement for local code inspection.
- Cite library docs or package versions when the result influences generated code.
- Keep package upgrades explicit in workspace reports.

## References

- Context7 docs: https://context7.com/docs
