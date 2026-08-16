# Perplexity Integration

Status: recommended external MCP.

Perplexity is useful for cited research augmentation. Use it as a research helper, not as a sole source of truth for high-stakes claims.

## Required Account

- Perplexity API key stored outside git.

## Workspace Config

```json
{
  "mcpServers": {
    "perplexity": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "@perplexity-ai/mcp-server"],
      "env": ["PERPLEXITY_API_KEY"]
    }
  }
}
```

## Safety Notes

- Keep citations and retrieval timestamps with every claim.
- Cross-check material facts against primary sources.
- Use report uncertainty notes when sources disagree or when a result is generated rather than directly observed.

## References

- Perplexity MCP docs: https://docs.perplexity.ai/docs/getting-started/integrations/mcp-server
