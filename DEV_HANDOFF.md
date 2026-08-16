# RunbookOS Dev Handoff

Date: 2026-05-26 (cleanup landed 2026-05-28)

> **For current state, always read [docs/STATUS.md](docs/STATUS.md) first.** Public `main` is the 2026-08-16 single-commit release. Packages are down to 9; gateway/scheduler/workflow/provider/messaging/approval/image-tools code is not in this repo.

## Current Snapshot

Repo:

```text
github.com/hollowpoint-io/runbookos
```

Current work is a course correction away from overbuilt agent orchestration and back to the actual product:

```text
skill files + project folders + adapter generation + MCP tools + onboarding CLI
```

## Product Boundary

RunbookOS is not Claude Code, Codex, or an Agent SDK app. It supplements those agents.

RunbookOS owns:

- workspace templates
- client folder structure
- memory conventions
- skill files and skillsets
- adapter generation
- MCP setup and validation
- onboarding CLI
- credential boundary docs

The agent owns:

- execution
- reasoning
- sequencing work
- tool use
- approvals
- writing artifacts from skills

## Guardrail

Before writing new TypeScript, ask:

1. Can the agent already do this by reading `SKILL.md`?
2. Can this be a Markdown instruction?
3. Does this duplicate Claude Code or Codex?
4. Is this orchestration, workflow running, approval logic, provider execution, scheduling, messaging, or image routing?

If yes, do not code it. Improve the skill, template, docs, adapter generation, or MCP setup instead.

New CLI commands and new packages require Billy's explicit approval.

## Keep

Packages:

```text
packages/config
packages/core
packages/memory
packages/skills
packages/mcp-workspace
packages/mcp-memory
packages/mcp-shopify
packages/mcp-ahrefs
packages/mcp-gmail
```

CLI surface:

```text
runbook init <dir>
runbook setup wizard <dir>
runbook setup <dir> [--user --role ...]
runbook client create <slug> <dir>
runbook adapters <dir>
runbook doctor <dir>
runbook smoke <dir>
runbook skills list <dir>
runbook skillsets list <dir>
runbook integrations list <dir>
runbook integrations setup <id> <dir>
runbook integrations doctor <id> <dir>
runbook credentials checklist <dir>
runbook gmail auth <dir>
runbook release check
runbook install check
```

## Remove Or Deprecate

- workflow JSON manifests and CLI workflow commands
- scheduler package and schedule commands
- provider wrapper packages
- messaging package
- current gateway app
- approval MCP package and approval CLI commands
- image routing helper package and image plan command
- verification scripts for removed features

The full analysis is in `docs/agent-sdk-integration-plan.md`. The actionable cleanup checklist is in `docs/roadmap.md`.

## Docs Updated This Session

The public docs now describe the corrected direction:

- `README.md`
- `docs/overview.md`
- `docs/architecture.md`
- `docs/getting-started.md`
- `docs/agent-walkthrough.md`
- `docs/ship-readiness.md`
- `docs/dogfood-test-plan.md`
- `docs/private-porting.md`
- `docs/shopify-audit-demo.md`
- `docs/shopify-auth.md`
- `docs/shopify-live-read-test.md`
- `docs/integrations/gmail.md`
- `docs/integrations/image.md`
- generated workspace template docs under `templates/workspace/`

## Implementation Status

The cleanup build removes the deprecated code paths rather than adding new orchestration:

1. Deprecated packages, gateway app, root workflow manifests, and removed-feature smoke scripts are deleted.
2. The CLI surface is trimmed to setup, adapters, clients, doctor/smoke, integrations, credentials, Gmail auth, and release/install checks.
3. Skillsets no longer reference workflow manifests or an approval MCP.
4. Workspace MCP exposes runbook, active context, clients, skills, report writes, and approval preview writes.
5. Remaining work is verification and any fixes found by the retained smoke suite.

## Verification Target

After cleanup:

```bash
pnpm install
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

Live checks remain opt-in.
