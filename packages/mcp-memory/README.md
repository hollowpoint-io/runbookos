# @runbookos/mcp-memory

Memory MCP server package.

## Purpose

Expose RunbookOS markdown memory as stable MCP resources and tools:

- long-term memory from `MEMORY.md`
- daily memory index from the configured memory directory
- memory search
- daily memory append
- dry-run consolidation proposals

## Safety

- Markdown memory is the source of truth.
- Structured memory should reference files, not replace them.
- Avoid storing secrets or private personal data.
- Consolidation is dry-run only until approval handling exists.

## Local Run

```bash
pnpm --filter @runbookos/mcp-memory build
node packages/mcp-memory/dist/index.js --workspace /path/to/workspace
```

The server also exposes a package binary:

```bash
runbookos-mcp-memory --workspace /path/to/workspace
```
