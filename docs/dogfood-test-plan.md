# Dogfood Test Plan

Use this plan to test whether RunbookOS can package the private prototype into a shareable workspace that another operator can initialize, customize, activate tools for, and use with Claude or Codex.

The goal is to test the corrected product shape: skill files, workspace folders, adapters, and MCP tools. Do not test deprecated workflow runners, gateway commands, scheduler commands, provider wrappers, or approval MCP behavior as core product.

## Test Rules

- Use a fresh generated workspace under `workspaces/`; that folder is ignored by git.
- Use only customer-owned or personal test credentials.
- Do not paste secrets into workspace Markdown, docs, dashboards, or memory files.
- Do not enable live mutations.
- Record confusing setup steps, missing instructions, provider mismatch, and tool gaps.

## 1. Baseline Repo Check

```bash
pnpm install
pnpm -w build
pnpm -w typecheck
pnpm verify:json
pnpm verify:adapters
pnpm verify:mcp
pnpm verify:smoke
pnpm verify:integrations
```

Expected result: retained checks pass. Live smoke checks require explicit opt-in env vars.

## 2. Fresh Workspace Setup

```bash
pnpm runbook init ./workspaces/dogfood-agency
pnpm runbook setup wizard ./workspaces/dogfood-agency
pnpm runbook client create dogfood-client ./workspaces/dogfood-agency --name "Dogfood Client" --website dogfood.example --platform Shopify
pnpm runbook doctor ./workspaces/dogfood-agency
pnpm runbook smoke ./workspaces/dogfood-agency
pnpm runbook integrations list ./workspaces/dogfood-agency
pnpm runbook skills list ./workspaces/dogfood-agency
```

Check:

- Generated `AGENTS.md`, `CLAUDE.md`, `.mcp.json`, and `.codex/config.toml` exist.
- Enabled MCPs are safe defaults unless intentionally changed.
- Workspace files explain what the agent should read first.
- The workspace passes doctor/smoke before live credentials are added.

## 3. Customize Context

Edit these files in `./workspaces/dogfood-agency`:

```text
USER.md
SOUL.md
RUNBOOK.md
ACTIVE_CONTEXT.md
MEMORY.md
workspace/clients/dogfood-client/README.md
```

Check:

- The instructions are enough for a fresh Claude or Codex session.
- Client context answers what is active, blocked, shipped, and next.
- No private prototype assumptions are required.

## 4. Activate One Read-Only Tool

Choose one:

- Shopify fixture mode.
- Ahrefs fixture mode.
- Gmail OAuth.
- External docs/search MCP with a user-supplied command.

Then regenerate adapters:

```bash
pnpm runbook adapters ./workspaces/dogfood-agency
pnpm runbook integrations list ./workspaces/dogfood-agency --enabled
pnpm runbook doctor ./workspaces/dogfood-agency
```

Check:

- Env var names are clear.
- Env values are not printed or written.
- Failure messages are actionable when credentials are missing.

## 5. Open With Codex

```bash
cd ./workspaces/dogfood-agency
codex
```

Ask Codex to:

- Summarize `ACTIVE_CONTEXT.md`.
- Summarize the client dashboard.
- List relevant skills for one task.
- Explain enabled MCP tools.
- Produce a small read-only report or draft in the client folder.

## 6. Open With Claude

```bash
cd ./workspaces/dogfood-agency
claude
```

Ask Claude for the same checks as Codex.

Record:

- Whether both agents read the intended files.
- Whether generated adapter text is clear.
- Whether MCP config works without manual repair.
- Whether skill files are sufficient.

## 7. Prototype Parity Test

Pick one real task from the private prototype and attempt it in the dogfood workspace using skills and tools only.

Capture gaps under:

```text
workspace/runs/dogfood-notes.md
```

Use these buckets:

- Missing setup instruction.
- Missing workspace context.
- Missing skill.
- Missing tool contract.
- Provider adapter mismatch.
- Integration not ready.
- Safety or approval ambiguity.

## Pass Criteria

Pass for maintainer dogfood:

- Fresh workspace initializes, configures, and validates.
- At least one provider can read the workspace and follow operating rules.
- At least one read-only tool is usable.
- One real prototype task can be attempted with clear gap notes.

Pass for first external tester:

- Setup requires no undocumented repo knowledge.
- The tester can customize instructions and client context without help.
- The tester can activate at least one read-only tool from docs.
- Provider setup failures are understandable.
- The tester can tell what works, what is fixture-only, what is live-read, and what is planned.
