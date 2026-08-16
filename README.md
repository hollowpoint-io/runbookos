# RunbookOS

Model-agnostic AI operating workspace for ecommerce operators, agencies, and fractional digital engineers.

RunbookOS gives Claude Code, Codex, and similar coding agents a durable workspace: context files, client folders, reusable skills, adapter generation, credential boundaries, and MCP tool wiring.

RunbookOS is not an agent runtime. It does not replace Claude Code or Codex, and it should not duplicate their orchestration, planning, approval, or reasoning behavior.
This repository is public-safe: private client work belongs in ignored workspaces and local environment stores, not committed files.

Authored by Billy Mahmood. Maintained by [Hollowpoint](https://hollowpoint.io). MIT licensed.

## What It Is

- **Workspace memory**: `RUNBOOK.md`, `USER.md`, `SOUL.md`, `MEMORY.md`, `ACTIVE_CONTEXT.md`, daily notes, and session wrap-up rules.
- **Client structure**: dashboards, context, workstreams, campaigns, reports, data, operations, and archive folders.
- **Skills**: Markdown playbooks that agents read directly for Shopify, SEO, content, lead generation, email, image, and client operations work.
- **Adapter generation**: one config emits `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, `.codex/config.toml`, and startup hooks.
- **Tool surface**: MCP servers and external MCP setup for workspace, memory, Shopify, Ahrefs, Gmail, and other integrations.
- **Onboarding CLI**: commands for init, setup, client creation, adapters, doctor checks, smoke checks, integrations, credentials, and Gmail auth.

## What It Is Not

- Not a workflow runner.
- Not a scheduler.
- Not a gateway or messaging control plane.
- Not a provider wrapper around Claude or Codex.
- Not an approval engine.
- Not a place to encode business workflows in TypeScript when a skill file can do the job.

Execution, orchestration, sequencing, and scheduling belong to the **agent layer** — Claude Code/Codex interactively, or an Anthropic Agent SDK app triggered by an external cron (e.g. trigger.dev) for autonomous work. RunbookOS supplies the substrate those agents read; it does not run them.

## Scope & Delivery

Every vertical and tool stays in scope. What changed in the course correction is *delivery mechanism*, not capability. A first-party MCP exists only where auth/safety friction earns it (workspace, memory, Shopify, Ahrefs, Gmail); everything else is **skill + local credentials** (image generation, GA4, GSC, Drive/Docs/Sheets) or an **external bring-your-own MCP** (Bright Data, Context7, GitHub, Linear, Notion, Firecrawl, Exa/Perplexity, browser). Deleting a premature package never means dropping the vertical. Full catalogue: [docs/integration-catalog.md](docs/integration-catalog.md).

## Build Rule

Before writing new TypeScript, ask:

1. Can the agent already do this by reading a skill file?
2. Can this be a Markdown instruction in `SKILL.md`?
3. Does this duplicate what Claude Code or Codex already does?
4. Is this orchestration, workflow running, approval logic, or provider execution?

If the answer is yes, do not code it. Improve the skill, workspace template, adapter text, or MCP setup instead.

The CLI exists for workspace setup and validation: init, setup, adapters, doctor, integrations, credentials, Gmail auth, release checks, and install checks.

## Status

The agent-runtime overbuild has been removed; RunbookOS is back to its actual product surface. **[docs/STATUS.md](docs/STATUS.md) is the single source of truth** for current state and remaining work. Supporting docs:

- [docs/product-direction.md](docs/product-direction.md) — build doctrine
- [docs/agent-sdk-integration-plan.md](docs/agent-sdk-integration-plan.md) — the course correction + Agent SDK seam
- [docs/roadmap.md](docs/roadmap.md) — forward batches
- [docs/ship-readiness.md](docs/ship-readiness.md) — release checklist

Current surface:

| Area | Surface |
| --- | --- |
| CLI | `init`, `setup wizard`, `setup`, `client create`, `adapters`, `doctor`, `smoke`, `skills list`, `skillsets list`, `integrations list/setup/doctor`, `credentials checklist`, `gmail auth`, `release check`, `install check` |
| Packages (9) | `config`, `core`, `memory`, `skills`, `mcp-workspace`, `mcp-memory`, `mcp-shopify`, `mcp-ahrefs`, `mcp-gmail` |
| Product content | skills, skillsets, workspace templates, client templates, docs, examples |

The workflow runner, scheduler, provider wrappers, messaging package, approval MCP, image-routing package, and gateway were removed because they duplicated agent behaviour — **not** because their capabilities left scope. Scheduling moves to external cron (trigger.dev); orchestration to the agent; image generation to a skill + local credentials.

## Install

```bash
npm install -g @runbookos/cli
runbook init ./my-workspace
```

Or from this source checkout:

```bash
pnpm bootstrap:source
pnpm runbook install check
pnpm user:start
pnpm runbook init ./my-workspace
pnpm runbook setup wizard ./my-workspace
pnpm runbook client create demo-client ./my-workspace --name "Demo Client" --website demo-commerce.example --platform Shopify
pnpm runbook adapters ./my-workspace
pnpm runbook doctor ./my-workspace
pnpm runbook smoke ./my-workspace
```

Optional integration setup:

```bash
pnpm runbook integrations list ./my-workspace
pnpm runbook integrations setup shopify ./my-workspace --mode fixture
pnpm runbook integrations setup ahrefs ./my-workspace --mode fixture
pnpm runbook integrations setup gmail ./my-workspace
pnpm runbook gmail auth ./my-workspace
pnpm runbook credentials checklist ./my-workspace --write-local-env
pnpm runbook adapters ./my-workspace
```

Then open the generated workspace with Claude Code or Codex:

```bash
cd ./my-workspace
codex
# or
claude
```

The agent should read the generated runbook, active context, user notes, client dashboard, skills, and MCP config.

## Verification

Post-cleanup verification should focus on the retained surface:

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
pnpm verify:ahrefs-live # skipped unless RUNBOOKOS_ENABLE_LIVE_AHREFS_SMOKE=1
pnpm verify:shopify-live # skipped unless RUNBOOKOS_ENABLE_LIVE_SHOPIFY_SMOKE=1
```

## Repository Shape

Current shape:

```text
apps/
  cli/                 Workspace setup, adapters, doctors, and onboarding
packages/
  core/                Shared workspace contracts
  config/              Config schema and adapter generation
  memory/              Memory helpers
  skills/              Skill and skillset manifest validation
  mcp-workspace/       Workspace MCP server
  mcp-memory/          Memory MCP server
  mcp-shopify/         Shopify MCP server
  mcp-ahrefs/          Ahrefs MCP server
  mcp-gmail/           Gmail MCP server
skills/                Public skill packs
skillsets/             Skill group manifests
templates/             Workspace, client, and skill templates
docs/                  Product and implementation docs
examples/              Demo workspaces and fixtures
```

Secret values stay local: shell env, `.runbookos/local.env` inside generated workspaces, OS keychain, secret manager, or provider OAuth stores. RunbookOS should write placeholders and env var names, never secrets.

## Design Principle

The agent is replaceable. The runbook, memory, client structure, skills, adapters, and tool contracts are the durable product.
