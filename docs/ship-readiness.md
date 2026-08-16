# Ship Readiness

This checklist keeps RunbookOS focused on the corrected product boundary: a public-safe workspace system for Claude Code, Codex, and future agents.

## Current Stage

The course-correction cleanup is essentially complete. The dead surfaces that duplicated agent behaviour have been removed:

- workflow JSON runners
- scheduler package
- provider wrapper packages
- messaging package
- gateway package
- approval MCP package
- image routing helper package

These were removed because they duplicated what CLI agents do — their *capabilities* (scheduling, image work, notifications) stay in scope via external cron, skills, and the agent layer. Remaining pre-share work (doc long-tail, verification run, git collapse) is tracked in [STATUS.md](STATUS.md).

## What Should Be Ready For Technical Testers

- Workspace initialization with `runbook init`.
- Interactive setup with `runbook setup wizard`.
- Client onboarding with `runbook client create`.
- Adapter generation for Claude and Codex.
- Shared instruction files: `RUNBOOK.md`, `USER.md`, `SOUL.md`, `ACTIVE_CONTEXT.md`, `MEMORY.md`, client dashboards, and skills.
- Safe MCP setup for workspace and memory.
- Fixture or read-only setup for Shopify and Ahrefs.
- Gmail OAuth helper and draft-capable MCP.
- Integration listing, setup, and doctor checks.
- Credential checklist that writes placeholders, not secret values.
- First-run confidence check with `runbook smoke`.
- Source-checkout install check and release check.

## What Is Partially Ready

- Shopify live reads: customer custom-app read-only mode exists; live smoke is opt-in.
- Ahrefs live reads: selected read-only endpoints exist; live smoke is opt-in.
- External MCPs: docs and command/env hooks exist, but users bring their own external MCPs.
- Agent SDK automation: future work, outside RunbookOS, after skill files and MCPs are proven.

## Not In Scope As RunbookOS Code

These are intentionally *not* RunbookOS responsibilities — the capability is delivered elsewhere (agent layer, external cron, skill + creds), not dropped:

- Generic external execution runner, scheduler, or daemon → external cron (trigger.dev) + Agent SDK app.
- Gateway or messaging control plane → agent layer / Agent SDK trigger.
- Provider wrapper/runtime packages → adapter generation already emits CLAUDE.md/AGENTS.md.
- Workflow manifest execution → skills *are* the workflow.
- Shopify mutations → skill + approval preview, via the Shopify MCP read surface plus agent writes.
- Image generation pipeline → skill + local provider credentials (built into the product-listing skill).

## Genuinely Future

- Global package publishing.
- Hosted UI or team workflow.
- Non-technical install flow.

## Before Sharing With A Technical Tester

- Remove or clearly mark deprecated docs for workflow runners, scheduler, provider wrappers, approval MCP, gateway, and image routing.
- Confirm `README.md` only describes the retained product surface.
- Run `pnpm runbook install check`.
- Run `pnpm runbook release check`.
- Verify generated workspaces load in both Claude and Codex.
- Verify `workspaces/` remains ignored.
- Keep all credentials in env vars, local ignored files, keychains, secret managers, or provider OAuth stores.

## Recommended Git Flow

1. Keep `main` clean and public-safe.
2. Use a dev branch for cleanup.
3. Generate test workspaces under ignored `workspaces/`.
4. Commit generalized code, docs, templates, skills, and fixtures only.
5. Do not commit generated private workspace data.

## Stop Conditions

Pause feature work if:

- README starts advertising features marked for removal.
- New TypeScript duplicates a skill instruction.
- A new CLI command is added without explicit approval.
- A new package is added without explicit approval.
- Generated workspace data risks leaking private context.
