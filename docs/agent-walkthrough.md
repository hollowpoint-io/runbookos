# Agent Walkthrough

RunbookOS keeps one workspace shape and generates provider-specific adapter files from `runbookos.config.json`. Claude and Codex should see the same runbook, memory, client folders, skills, and MCP servers.

## Create The Workspace

```bash
pnpm bootstrap:source
pnpm runbook init ./workspaces/demo-agency
pnpm runbook setup wizard ./workspaces/demo-agency
pnpm runbook client create demo-client ./workspaces/demo-agency --name "Demo Client" --website demo-commerce.example --platform Shopify
pnpm runbook adapters ./workspaces/demo-agency
pnpm runbook doctor ./workspaces/demo-agency
```

`runbook init` copies the workspace template and public skills, then generates:

- `AGENTS.md`
- `CLAUDE.md`
- `.mcp.json`
- `.codex/config.toml`
- `.agents/skills/<skill-id>/SKILL.md`
- `.claude/hooks/load-context.sh`

## Verify The Shared Surface

```bash
pnpm runbook skills list ./workspaces/demo-agency
pnpm runbook skillsets list ./workspaces/demo-agency
pnpm runbook integrations list ./workspaces/demo-agency
pnpm runbook smoke ./workspaces/demo-agency
```

Enabled MCPs should be safe local tools unless intentionally configured otherwise.

For published-package style MCP commands:

```bash
pnpm runbook adapters ./workspaces/demo-agency --published-mcp
```

## Open With Codex

```bash
cd ./workspaces/demo-agency
codex
```

Codex reads `AGENTS.md`, `.codex/config.toml`, and generated skills under `.agents/skills`.

## Open With Claude

```bash
cd ./workspaces/demo-agency
claude
```

Claude reads `CLAUDE.md`, `.mcp.json`, and `.claude/hooks/load-context.sh`.

## What To Check

Ask either agent to:

- Summarize `ACTIVE_CONTEXT.md`.
- Summarize `workspace/clients/demo-client/README.md`.
- List the relevant skills for a Shopify or SEO task.
- Explain which MCP servers are enabled.
- Produce a small report or draft under the client folder.

Both agents should rely on the same files and write only inside configured workspace roots.

For a repo-side smoke check:

```bash
pnpm verify:adapters
pnpm verify:mcp
pnpm verify:smoke
```
