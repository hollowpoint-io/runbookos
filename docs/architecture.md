# Architecture

RunbookOS is a monorepo because v1 needs one coherent installation, template, adapter, and release process.

## Layers

### Workspace

Markdown-first project state:

- `RUNBOOK.md`
- `USER.md`
- `SOUL.md`
- `MEMORY.md`
- `ACTIVE_CONTEXT.md`
- `workspace/clients/<client>/`
- `outbox/`

### Skills

Portable operational playbooks:

- `skill.json` manifest.
- `SKILL.md` instructions.
- Required tool hints.
- Write targets.
- Approval boundaries.
- Model tier hints where useful.

Agents read these files directly. A separate workflow manifest layer is no longer part of the core design.

### Adapters

The config package generates provider-native files:

- `AGENTS.md`
- `CLAUDE.md`
- `.mcp.json`
- `.codex/config.toml`
- startup hooks where supported

Generated adapter files should contain no unique business logic. They should point agents at the same runbook, memory, skills, dashboards, and MCP tools.

### Tools

MCP packages expose stable, auditable tool contracts:

- workspace
- memory
- Shopify
- Ahrefs
- Gmail

External MCPs can be configured by command and env var names when a first-party package is not justified.

### CLI

The CLI is for setup and validation:

- initialize workspaces
- run setup wizard
- create clients from templates
- generate adapters
- list and validate integrations
- show credential checklists
- run doctor/smoke/install/release checks
- run OAuth helpers that agents cannot do by themselves

The CLI should not become the execution layer for agent work.

### Execution (outside RunbookOS)

RunbookOS supplies the substrate; agents do the work in one of two places, neither of which is RunbookOS code:

- **Interactive** — Claude Code / Codex open the workspace and follow skills.
- **Autonomous** — an Anthropic Agent SDK app, tuned by a RunbookOS folder + skills, triggered by an external cron (e.g. trigger.dev). The Agent SDK executes; trigger.dev schedules. Such apps live in their own repos and consume RunbookOS skills and MCPs.

## Removed From Core

These are intentionally out of the core architecture:

- workflow JSON manifests
- scheduler package
- current gateway package
- messaging package
- provider wrapper packages
- approval MCP package
- image routing helper package

If autonomous Agent SDK apps are built later, they should live outside RunbookOS and consume RunbookOS skills and MCPs.
