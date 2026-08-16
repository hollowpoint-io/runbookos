# Roadmap

RunbookOS is a skill file + project folder system. It supplements CLI agents (Claude Code, Codex, etc.) — it does not replace them.

See [Product Direction](product-direction.md) for the build doctrine.
See [Agent SDK Integration Plan](agent-sdk-integration-plan.md) for the course correction and future Agent SDK architecture.

> **Status (2026-05-28):** the cleanup batch below is complete — including the empty package dirs, now genuinely removed (packages down to 9). Live status and remaining work (doc long-tail, verification run, git collapse) are tracked in [STATUS.md](STATUS.md). Forward batches A–D are the real work from here.

## Build Strategy

RunbookOS owns: skill files, project folder templates, adapter generation (CLAUDE.md / AGENTS.md / .mcp.json), MCP tool servers, and onboarding CLI.

The agent owns: execution, orchestration, workflow sequencing, approvals, reasoning.

**Build rule:** Before writing any new TypeScript, ask: "Can the agent already do this by reading a skill file?" If yes, don't code it.

---

## Course Correction (2026-05-26)

The codebase drifted into over-building. Coding agents used during development kept adding orchestration, workflow runners, approval systems, and provider wrappers that replicate what CLI agents do natively. See the [full analysis](agent-sdk-integration-plan.md#course-correction-what-to-remove).

### Cleanup batch: Remove over-built code

**Step 1: Delete empty packages**
- [x] Delete `packages/mcp-brightdata/` (empty directory)
- [x] Delete `packages/mcp-ga4/` (empty directory)
- [x] Delete `packages/mcp-gdrive/` (empty directory)
- [x] Delete `packages/mcp-gsc/` (empty directory)
- [x] Delete `packages/mcp-image/` (empty directory)

**Step 2: Delete unused packages**
- [x] Delete `packages/provider-claude/` (nothing imports it; adapter generator already produces CLAUDE.md)
- [x] Delete `packages/provider-codex/` (nothing imports it; adapter generator already produces AGENTS.md)

**Step 3: Remove CLI commands + their packages**
- [x] Remove `workflow run/plan/start/status/finish` commands from CLI (agent reads skill files directly)
- [x] Remove `approvals list/read/mark` commands from CLI (agent handles approvals via skill instructions)
- [x] Remove `schedules list/run` commands from CLI (plan-only, never executes)
- [x] Remove `providers doctor` command from CLI (agents validate themselves)
- [x] Remove `images plan` command from CLI (agent handles image work via skill instructions)
- [x] Delete `apps/cli/src/commands/approvals.ts`
- [x] Delete `apps/cli/src/commands/images.ts`
- [x] Delete `apps/cli/src/commands/providers.ts`
- [x] Delete `apps/cli/src/commands/schedules.ts`
- [x] Remove `@runbookos/workflows`, `@runbookos/scheduler`, `@runbookos/image-tools` from CLI dependencies
- [x] Delete `packages/workflows/`
- [x] Delete `packages/scheduler/`
- [x] Delete `packages/image-tools/`
- [x] Delete `packages/mcp-approval/`
- [x] Delete `packages/messaging/`
- [x] Delete `workflows/` root directory (JSON manifests — skill files replace these)

**Step 4: Remove gateway**
- [x] Delete `apps/gateway/` (safe-commands only, cannot execute work; rebuild from scratch when Agent SDK is ready)

**Step 5: Remove verification scripts for deleted features**
- [x] Delete `scripts/verify-workflow.mjs`
- [x] Delete `scripts/verify-provider-workflow.mjs`
- [x] Delete `scripts/verify-providers.mjs`
- [x] Delete `scripts/verify-approval.mjs`
- [x] Delete `scripts/verify-gateway.mjs`
- [x] Delete `scripts/verify-scheduler.mjs`
- [x] Delete `scripts/verify-image.mjs`
- [x] Remove corresponding entries from root `package.json`

**Step 6: Update docs**
- [x] Update `README.md` — remove references to workflows, gateway, scheduling, approvals, providers, image routing
- [x] Update `docs/architecture.md` — remove gateway, messaging, scheduler layers
- [x] Update `docs/product-direction.md` — strengthen the anti-overbuild guardrail
- [x] Add "DO NOT OVERBUILD" guardrail to generated CLAUDE.md / AGENTS.md templates
- [x] Clean up `docs/integration-catalog.md` — keep only working integrations

**Step 7: Rebuild and verify**
- [x] `pnpm install` (clean lockfile)
- [x] `pnpm -w typecheck` passes
- [x] `pnpm -w build` passes
- [x] All retained non-live verify scripts pass
- [x] `init`, `setup wizard`, `adapters`, `doctor`, `smoke` still work end-to-end

### Post-cleanup state

**CLI surface (~15 commands):**
```
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

**Packages (9, down from 20):**
```
config/          ← adapter generation (core product)
core/            ← shared types
memory/          ← memory helpers
skills/          ← skill validation
mcp-workspace/   ← workspace MCP server
mcp-memory/      ← memory MCP server
mcp-shopify/     ← shopify MCP server
mcp-ahrefs/      ← ahrefs MCP server
mcp-gmail/       ← gmail MCP server
```

---

## Completed batches (pre-correction)

The following batches delivered value that survives the cleanup:

### Batch 0: Public-Safe Scaffold (complete)
- Monorepo scaffold, workspace templates, initial skills, config schema
- Adapter generation for CLAUDE.md, AGENTS.md, .mcp.json, startup hook
- CLI: init, adapters, doctor, skills list
- Public-safety scanner

### Batch 1: Runtime Credibility (complete, partially retained)
- Working MCP servers: workspace, memory, shopify (fixture + live-read), ahrefs (fixture + live-read), gmail (OAuth + draft)
- Safe workspace write tools with path enforcement
- Adapter generation for local and published MCP commands

### Batch 3.5: First-Run Onboarding (complete, retained)
- Client creation from template
- Workspace setup wizard
- Setup menu and state-aware guidance
- Smoke test for first-run confidence
- Install check and release check

### Batch 1B: Gmail Communications (complete, retained)
- Gmail MCP with OAuth, metadata search/read, draft creation
- Gmail auth CLI command
- Approval-backed draft path (via skill file instructions, not mcp-approval)

---

## Forward batches (post-correction)

### Batch A: Skill file quality

Goal: make skill files excellent — with research phases, pipeline steps, model tier hints, and clear approval boundaries. This is the product differentiator.

- [ ] Add research pipeline phases to content-writing skill (pilot)
- [ ] Add research phases to seo-research, competitor-analysis skills
- [ ] Add model tier hints to all skills (fast/balanced/deep per phase)
- [ ] Add approval boundary instructions to skills that involve external mutations
- [ ] Validate that Claude Code follows phased skill instructions when skills are invoked
- [ ] Port prototype Shopify listing and collection creation skills as Markdown-first verticals

Exit criteria: a user can say "write content about X" and the agent automatically researches, structures, writes, and audits — all from reading the skill file.

### Batch B: MCP server hardening

Goal: make the kept MCP servers reliable for real daily work.

- [ ] Shopify live-read skills work against configured stores
- [ ] Ahrefs live-read skills work with API credentials
- [ ] Gmail OAuth works reliably (troubleshooting docs for edge cases)
- [ ] Workspace MCP write paths verified in real provider sessions

Exit criteria: a user with credentials can do real client work through MCP tools, not just fixture demos.

### Batch C: Public release readiness

Goal: clean enough to share publicly without embarrassment.

- [ ] No dead code, empty packages, or deprecated features
- [ ] README accurately describes what works
- [ ] Quick start path works for a new user
- [ ] Generated adapter files load correctly in Claude Code and Codex

Exit criteria: someone can clone, init, setup, and start doing real work in under 15 minutes.

### Batch D: Agent SDK integration (future, after A-C)

Goal: enable autonomous execution of skill pipelines via Agent SDK, outside of RunbookOS.

See [Agent SDK Integration Plan](agent-sdk-integration-plan.md#agent-sdk-integration-future--after-cleanup) for full architecture.

- [ ] Build one standalone Agent SDK app (content-pipeline or email-triage)
- [ ] Validate model tiering cost savings
- [ ] Validate MCP integration from external Agent SDK app
- [ ] Validate skill file as agent instructions end-to-end
- [ ] Schedule autonomous runs via trigger.dev (or system cron) — not a RunbookOS scheduler
- [ ] If Telegram/notification surfaces are needed, build as a thin Agent SDK trigger (not grafted onto the old gateway)
- [ ] Extract shared patterns only after 2+ Agent SDK apps prove the need

Exit criteria: an Agent SDK app can read a RunbookOS skill file, use RunbookOS MCPs, and produce outputs in RunbookOS project folders — without any RunbookOS code changes.
