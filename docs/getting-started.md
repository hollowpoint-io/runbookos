# Getting Started

## 1. Install

From npm:

```bash
npm install -g @runbookos/cli
runbook --help
```

Or from source:

```bash
pnpm bootstrap:source
pnpm runbook install check
```

The bootstrap path installs dependencies, builds packages, and checks the source checkout. It writes no secrets.

## 2. Create A Workspace

```bash
pnpm runbook init ./workspaces/my-agency
```

## 3. Configure The Workspace

```bash
pnpm runbook setup wizard ./workspaces/my-agency
```

The wizard personalizes the generated workspace and writes adapter files. It records env var names and setup choices, not secret values.

For scripted setup:

```bash
pnpm runbook setup ./workspaces/my-agency --user "Your Name" --role "Agency operator" --agency "My Agency" --timezone "Europe/London"
pnpm runbook adapters ./workspaces/my-agency
```

Generated files include:

- `AGENTS.md`
- `CLAUDE.md`
- `.mcp.json`
- `.codex/config.toml`
- `.claude/hooks/load-context.sh`

## 4. Add A Client

```bash
pnpm runbook client create demo-client ./workspaces/my-agency --name "Demo Client" --website demo-commerce.example --platform Shopify
```

This creates `workspace/clients/demo-client/`, fills the dashboard shell, and updates `ACTIVE_CONTEXT.md`.

## 5. Set Up Integrations

Start with fixture or read-only tools:

```bash
pnpm runbook integrations list ./workspaces/my-agency
pnpm runbook integrations setup shopify ./workspaces/my-agency --mode fixture
pnpm runbook integrations setup ahrefs ./workspaces/my-agency --mode fixture
pnpm runbook integrations setup gmail ./workspaces/my-agency
pnpm runbook gmail auth ./workspaces/my-agency
pnpm runbook credentials checklist ./workspaces/my-agency --write-local-env
pnpm runbook adapters ./workspaces/my-agency
```

For customer-owned live reads, keep values in runtime env:

```bash
export RUNBOOKOS_SHOPIFY_AUTH_MODE=customer_custom_app
export SHOPIFY_SHOP_DOMAIN=<customer-owned-shop-domain>
export SHOPIFY_ADMIN_TOKEN=<customer-owned-admin-token>
export SHOPIFY_API_VERSION=2026-04

pnpm runbook integrations doctor shopify ./workspaces/my-agency
```

## 6. Validate

```bash
pnpm runbook doctor ./workspaces/my-agency
pnpm runbook smoke ./workspaces/my-agency
pnpm runbook skills list ./workspaces/my-agency
pnpm runbook skillsets list ./workspaces/my-agency
pnpm runbook integrations list ./workspaces/my-agency --enabled
```

## 7. Open With An Agent

```bash
cd ./workspaces/my-agency
codex
```

or:

```bash
cd ./workspaces/my-agency
claude
```

Ask the agent to read the active context, summarize the client dashboard, list relevant skills, and perform a small read-only task. The agent should use the workspace files and MCP config generated from the same `runbookos.config.json`.

## 8. Run Repo Verification

The retained verification surface is:

```bash
pnpm -w typecheck
pnpm -w build
pnpm verify:json
pnpm verify:adapters
pnpm verify:setup
pnpm verify:client
pnpm verify:skillsets
pnpm verify:smoke
pnpm verify:install
pnpm verify:release
pnpm verify:integrations
pnpm verify:gmail
pnpm verify:mcp
pnpm verify:shopify
pnpm verify:ahrefs
```

Live checks remain opt-in and must use customer-owned credentials:

```bash
RUNBOOKOS_ENABLE_LIVE_AHREFS_SMOKE=1 pnpm verify:ahrefs-live
RUNBOOKOS_ENABLE_LIVE_SHOPIFY_SMOKE=1 pnpm verify:shopify-live
```

## 9. Approval Boundary

For external actions, publishing, credential use, destructive changes, or ecommerce mutations, the agent should write a preview under `outbox/` and wait for explicit approval. RunbookOS does not silently execute external actions.
