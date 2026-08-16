# @runbookos/mcp-workspace

Workspace MCP server package.

## Purpose

Expose the RunbookOS workspace as stable MCP resources and tools:

- workspace runbook
- active context
- client dashboards
- skill registry
- safe report writes
- approval previews

## Safety

The workspace server must only write inside configured allowed roots. Any action that could publish, mutate a third-party system, or send a message belongs behind an approval preview.

## Local Run

```bash
pnpm --filter @runbookos/mcp-workspace build
node packages/mcp-workspace/dist/index.js --workspace /path/to/workspace
```

The server also exposes a package binary:

```bash
runbookos-mcp-workspace --workspace /path/to/workspace
```
