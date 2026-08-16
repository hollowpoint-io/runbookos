# Agent SDK Integration Plan + Course Correction

_Created 2026-05-26. Updated 2026-05-28. Author: Billy + Claude (architecture session)._

> **Status (2026-05-28): the cleanup below is essentially done.** Dead packages, the gateway, root workflow manifests, and removed-feature verify scripts are gone; packages are down to 9. The "what to remove" and "implementation order" sections are kept as the record of *why*, not as outstanding work. Current state and remaining tasks live in [STATUS.md](STATUS.md). The autonomous-execution direction is now concrete: **Anthropic Agent SDK** for the work, **trigger.dev** for scheduling — both outside RunbookOS.

## What RunbookOS actually is

RunbookOS is a **skill file + project folder system**. Each vertical (client, project, job type) has its own filesystem, references, memory, and skills. When a user invokes a vertical, the correct context loads and the agent is ready to work.

RunbookOS **supplements** Claude Code, Codex, and other CLI agents. It does not replace them, orchestrate them, or wrap their APIs.

The product is:
1. **Skill files** (SKILL.md) — operational playbooks the agent follows
2. **Project folder templates** — structured filesystem per vertical with context, memory, and data paths
3. **Config + adapter generation** — one config that emits CLAUDE.md / AGENTS.md / .mcp.json so agents load the right context and tools
4. **Onboarding CLI** — init, create-project, setup wizard, adapters, doctor

Everything else is the agent's job.

---

## Course correction: what to remove

The codebase has drifted into over-building. Multiple packages and CLI commands duplicate what Claude Code and Codex already do natively. This makes the project harder to maintain, harder to release publicly, and confusing to new users.

### Root cause

Coding agents (Claude, Codex) used during development kept expanding scope — adding orchestration, workflow runners, approval systems, provider wrappers, and demo infrastructure that replicate what the agents themselves already do when given good skill files and context. The build rule ("Markdown-first, code only when friction proves need") was stated in the docs but not enforced during implementation.

### What to remove and why

| Remove | Why | Dependency check |
|--------|-----|-----------------|
| **`packages/workflows/`** | Skill files ARE the workflow. The JSON manifest layer adds a second abstraction over what SKILL.md already defines. Agents read markdown — they don't need a workflow.json to tell them what to do. | CLI imports `parseWorkflow`, `renderWorkflowPrompt`. Remove those CLI commands and imports. |
| **`packages/scheduler/`** | Plan-only artifact generation. Scheduler never executes anything. When Agent SDK is added later, it will have its own scheduling pattern — this package would be replaced anyway. | CLI imports `parseScheduleFile`, `scheduleJobId`. Remove schedule CLI commands and imports. |
| **`packages/provider-claude/`** | Claude Code reads CLAUDE.md natively. The adapter generator already produces CLAUDE.md. A separate provider package that wraps Claude SDK calls adds maintained code with zero value. | Nothing imports it. Clean remove. |
| **`packages/provider-codex/`** | Same as above for Codex. Codex reads AGENTS.md natively. | Nothing imports it. Clean remove. |
| **`packages/messaging/`** | Conversation buffers and message adapter contracts built before the gateway can execute anything. Premature infrastructure. | Gateway imports it. Remove alongside gateway simplification. |
| **`packages/image-tools/`** | Image routing plan artifacts. The agent can handle image generation via skill file instructions — no coded routing package needed. | CLI `commands/images.ts` imports it. Remove image CLI commands and imports. |
| **`packages/mcp-approval/`** | A separate MCP server for writing approval files. The agent can write to `outbox/` via a skill instruction ("write an approval preview to outbox/ before executing"). No MCP needed. | Not imported by CLI. Gateway uses approval actions from messaging package. Clean remove. |
| **`packages/mcp-brightdata/`** | Empty directory. | Nothing. Delete. |
| **`packages/mcp-ga4/`** | Empty directory. | Nothing. Delete. |
| **`packages/mcp-gdrive/`** | Empty directory. | Nothing. Delete. |
| **`packages/mcp-gsc/`** | Empty directory. | Nothing. Delete. |
| **`packages/mcp-image/`** | Empty directory. | Nothing. Delete. |
| **`workflows/`** (root dir) | Workflow JSON manifests. Skill files replace these. | CLI workflow commands reference this directory. Remove with workflow CLI commands. |
| **`apps/gateway/`** | Safe command surface only — cannot execute work. When Agent SDK is added, the gateway would be rebuilt around real execution. Current implementation is dead weight. Keep Telegram as a future goal, remove current scaffolding. | Depends on messaging package. Both remove together. |
| **CLI commands to remove** | `workflow run/plan/start/status/finish`, `schedules list/run`, `approvals list/read/mark`, `providers doctor`, `images plan`, `gmail draft` — all replicate what the agent does when given a skill file. | These are branches in `index.ts`. Remove the command blocks and their imports. |
| **`apps/cli/src/commands/`** | `approvals.ts`, `images.ts`, `providers.ts`, `schedules.ts` — command files for removed features. `gmail.ts` and `skillsets.ts` can stay if gmail auth and skillset listing are useful for onboarding. | Remove the files and their imports from index.ts. |
| **Verification scripts for removed features** | `verify:workflow`, `verify:provider-workflow`, `verify:providers`, `verify:approval`, `verify:gateway`, `verify:scheduler`, `verify:image` — verifying scaffolding that no longer exists. | Scripts in `scripts/`. Delete the files and remove from package.json. |

### What to KEEP

| Keep | Why |
|------|-----|
| **`skills/`** | The product. Every SKILL.md and skill.json. |
| **`skillsets/`** | Useful grouping of related skills per vertical. |
| **`templates/`** | Project folder templates. Core product. |
| **`packages/config/`** | Config parsing + adapter generation (CLAUDE.md, AGENTS.md, .mcp.json, startup hook). This is the main piece of code RunbookOS needs. |
| **`packages/core/`** | Shared types and workspace contracts. |
| **`packages/memory/`** | Memory protocol helpers. |
| **`packages/skills/`** | Skill manifest validation. Useful for `skills list` and future skill registry. |
| **`packages/mcp-workspace/`** | Working MCP server for workspace reads and safe writes. Agents use this. |
| **`packages/mcp-memory/`** | Working MCP server for memory search and daily append. Agents use this. |
| **`packages/mcp-shopify/`** | Working MCP server with fixture and live-read modes. Agents use this. |
| **`packages/mcp-ahrefs/`** | Working MCP server with fixture and live-read modes. Agents use this. |
| **`packages/mcp-gmail/`** | Working MCP server with OAuth, search, read, draft. Agents use this. |
| **CLI: `init`** | Workspace creation. Core onboarding. |
| **CLI: `setup` / `wizard`** | User defines their verticals, projects, credentials. Core onboarding. |
| **CLI: `client create`** | Project folder creation from template. Core product. |
| **CLI: `adapters`** | Generates agent config files. Core product. |
| **CLI: `doctor`** | Workspace health check. Useful. |
| **CLI: `smoke`** | Quick confidence check. Useful for onboarding. |
| **CLI: `skills list`** | Shows available skills. Useful. |
| **CLI: `skillsets list`** | Shows available skill groups. Useful. |
| **CLI: `integrations list/setup/doctor`** | MCP setup and validation. Useful for onboarding. |
| **CLI: `credentials checklist`** | Shows what credentials are needed. Useful for onboarding. |
| **CLI: `release check` / `install check`** | Pre-release validation. Keep for now. |
| **CLI: `gmail auth`** | OAuth flow for Gmail MCP. Keep — agents can't do OAuth. |
| **Verification scripts for kept features** | `verify:json`, `verify:adapters`, `verify:setup`, `verify:client`, `verify:skillsets`, `verify:smoke`, `verify:install`, `verify:release`, `verify:integrations`, `verify:gmail`, `verify:mcp`, `verify:shopify`, `verify:ahrefs`. |

### Post-removal CLI surface

```
runbook init <dir>                          ← create workspace
runbook setup wizard <dir>                  ← interactive first-run
runbook setup <dir> [--user --role ...]     ← scripted setup
runbook client create <slug> <dir>          ← create project folder
runbook adapters <dir>                      ← generate CLAUDE.md / AGENTS.md / .mcp.json
runbook doctor <dir>                        ← workspace health check
runbook smoke <dir>                         ← quick confidence check
runbook skills list <dir>                   ← show available skills
runbook skillsets list <dir>                ← show skill groups
runbook integrations list <dir>             ← show configured MCPs
runbook integrations setup <id> <dir>       ← configure an MCP
runbook integrations doctor <id> <dir>      ← check MCP health
runbook credentials checklist <dir>         ← show needed credentials
runbook gmail auth <dir>                    ← OAuth flow
runbook release check                       ← pre-release validation
runbook install check                       ← install readiness
```

That's ~15 commands focused on workspace setup and onboarding. Down from ~30+ commands that duplicated agent behaviour.

### Post-removal package list

```
packages/
├── config/          ← adapter generation (KEEP — core product)
├── core/            ← shared types (KEEP)
├── memory/          ← memory helpers (KEEP)
├── skills/          ← skill validation (KEEP)
├── mcp-workspace/   ← workspace MCP (KEEP — agents use it)
├── mcp-memory/      ← memory MCP (KEEP — agents use it)
├── mcp-shopify/     ← shopify MCP (KEEP — agents use it)
├── mcp-ahrefs/      ← ahrefs MCP (KEEP — agents use it)
└── mcp-gmail/       ← gmail MCP (KEEP — agents use it)
```

9 packages. Down from 20. Every remaining package either generates agent config or provides an MCP server agents actively use.

### Estimated CLI reduction

The 5,571-line `index.ts` should drop to roughly 2,000-2,500 lines after removing workflow, schedule, approval, provider, and image command blocks plus their helper imports. The `commands/` subdirectory loses `approvals.ts`, `images.ts`, `providers.ts`, and `schedules.ts`.

---

## Guardrail for coding agents

**Add this to CLAUDE.md and AGENTS.md in the RunbookOS workspace:**

```markdown
## DO NOT OVERBUILD

RunbookOS is a skill file + project folder system. It supplements CLI agents, it does not replace them.

Before writing ANY new TypeScript:
1. Can the agent already do this by reading a skill file? → Don't code it.
2. Can this be a markdown instruction in SKILL.md? → Write markdown, not code.
3. Does this duplicate what Claude Code / Codex does natively? → Don't build it.
4. Is this orchestration, workflow running, or approval logic? → The agent handles this. Don't code it.

The CLI exists for: init, setup, adapters, doctor, integrations. That's it.
New CLI commands require Billy's explicit approval.
New packages require Billy's explicit approval.
```

---

## Agent SDK integration (future — after cleanup)

The Agent SDK plan from the original document remains valid but is simpler after the cleanup:

### What changes

- **No workflow.json manifests.** Agent SDK agents read SKILL.md directly as their instructions. The skill file defines the pipeline phases in markdown.
- **No scheduler package to wire into.** Agent SDK scheduled runs are standalone scripts triggered by an external cron (trigger.dev, or system cron), reading skill files and config directly.
- **No gateway to extend.** When Telegram execution is needed, it's built fresh as a thin Agent SDK trigger, not grafted onto the current gateway scaffolding.
- **No approval MCP to integrate.** Approval boundaries are defined in skill files. Agent SDK agents write to `outbox/` per skill instructions. Human reviews via filesystem or future Telegram interface.

### Simplified architecture

```
┌─────────────────────────────────────────────┐
│  RunbookOS (the product)                    │
│                                             │
│  skills/          ← agent instructions      │
│  templates/       ← project folder system   │
│  config/          ← adapter generation      │
│  mcp-*/           ← tool servers            │
│  CLI              ← onboarding only         │
└──────────────┬──────────────────────────────┘
               │
               │ agents read skills + context
               │ agents use MCPs as tools
               │
┌──────────────▼──────────────────────────────┐
│  Agent layer (NOT RunbookOS code)           │
│                                             │
│  Option A: Claude Code / Codex (interactive)│
│    → user invokes skill, agent follows it   │
│                                             │
│  Option B: Agent SDK app (autonomous)       │
│    → trigger.dev / cron triggers script     │
│    → script reads skill + config            │
│    → creates Agent SDK agents               │
│    → agents use RunbookOS MCPs as tools     │
│    → outputs written to project folders     │
│                                             │
│  Option C: Future agent runtimes            │
│    → same pattern, different provider       │
└─────────────────────────────────────────────┘
```

RunbookOS owns the workspace. The agent layer owns execution. The boundary is clean.

### Agent SDK implementation (when ready)

Agent SDK apps live **outside RunbookOS** as separate projects that consume RunbookOS skill files and MCPs:

```
my-agent-apps/
├── content-pipeline/     ← Agent SDK app that reads skills/content-writing/SKILL.md
├── email-triage/         ← Agent SDK app for email classification
├── trading-research/     ← Agent SDK app for market analysis
└── shared/
    └── telegram.ts       ← shared Telegram notification helper (extracted after 2+ apps need it)
```

Each app is a standalone script that:
1. Reads the relevant SKILL.md for agent instructions
2. Reads runbookos.config.json for MCP server config
3. Creates Agent SDK agents with model tiering
4. Runs the pipeline
5. Writes outputs to the RunbookOS project folder

This keeps RunbookOS clean and focused. Agent SDK complexity lives in the agent apps, not in the workspace product.

### Phase 1: Skill file upgrades (immediate, no code)

Add explicit pipeline phases to skills that need them. This works in Claude Code / Codex today without Agent SDK:

```markdown
## WORKFLOW PHASES

### Phase 1: Research (use subagents / haiku where possible)
Tools: Bright Data (SERP scrape top 5), Ahrefs (keyword cluster)
Output: research-brief.json (headings, word counts, gaps, keyword map)

### Phase 2: Structure
Input: research-brief.json + topic + target keyword
Output: content-outline.md (H2/H3 structure, key points per section)
Approval: present outline for review before writing

### Phase 3: Write
Input: content-outline.md + all rules below
Output: final content
Post-process: anti-AI audit pass
```

### Phase 2: Agent SDK prototype (after cleanup + skill upgrades proven)

Build one Agent SDK app (content-pipeline or email-triage) as a standalone project. Validate:
- Model tiering cost savings
- MCP integration works from external app
- Skill file as agent instructions works end-to-end
- Output quality matches or exceeds single-model execution

### Phase 3: Extract patterns (after 2+ Agent SDK apps exist)

If content-pipeline and email-triage share Telegram notification, cron triggering, or Bright Data wiring, extract those into a shared utility. Not before.

---

## Implementation order for the cleanup

### Step 1: Delete empty packages (zero risk)
- `packages/mcp-brightdata/`
- `packages/mcp-ga4/`
- `packages/mcp-gdrive/`
- `packages/mcp-gsc/`
- `packages/mcp-image/`

### Step 2: Delete unused packages (no imports elsewhere)
- `packages/provider-claude/`
- `packages/provider-codex/`

### Step 3: Remove CLI commands and their packages
Remove from `apps/cli/src/index.ts`:
- All `workflow` commands (run/plan/start/status/finish)
- All `approvals` commands (list/read/mark)
- All `schedules` commands (list/run)
- `providers doctor`
- `images plan`

Remove from `apps/cli/src/commands/`:
- `approvals.ts`
- `images.ts`
- `providers.ts`
- `schedules.ts`

Remove from `apps/cli/package.json` dependencies:
- `@runbookos/workflows`
- `@runbookos/scheduler`
- `@runbookos/image-tools`

Then delete:
- `packages/workflows/`
- `packages/scheduler/`
- `packages/image-tools/`
- `packages/mcp-approval/`
- `packages/messaging/`
- `workflows/` (root directory — the JSON manifests)

### Step 4: Remove gateway
- `apps/gateway/` (entire directory)

### Step 5: Remove verification scripts for deleted features
- `scripts/verify-workflow.mjs`
- `scripts/verify-provider-workflow.mjs`
- `scripts/verify-providers.mjs`
- `scripts/verify-approval.mjs`
- `scripts/verify-gateway.mjs`
- `scripts/verify-scheduler.mjs`
- `scripts/verify-image.mjs`
- Remove corresponding entries from root `package.json` scripts

### Step 6: Update docs
- Update `README.md` — remove references to workflows, gateway, scheduling, approvals, providers, images
- Update `docs/roadmap.md` — mark removed batches as deprecated/removed, simplify remaining batches
- Update `docs/architecture.md` — remove gateway, messaging, scheduler layers
- Update `docs/product-direction.md` — strengthen the anti-overbuild guardrail
- Add the "DO NOT OVERBUILD" guardrail to generated CLAUDE.md / AGENTS.md templates

### Step 7: Rebuild and verify
- `pnpm install` (clean lockfile)
- `pnpm -w typecheck`
- `pnpm -w build`
- Run remaining verify scripts
- Confirm `init`, `setup wizard`, `adapters`, `doctor`, `smoke` still work

---

## Success criteria

After cleanup, a user should be able to:

1. `runbook init ./my-workspace` — creates workspace with templates
2. `runbook setup wizard ./my-workspace` — defines verticals, projects, credentials
3. `runbook client create my-client ./my-workspace` — creates project folder
4. `runbook adapters ./my-workspace` — generates CLAUDE.md / AGENTS.md / .mcp.json
5. Open Claude Code or Codex in the workspace
6. Say "list these products" or "write content about X" — agent reads the skill file, uses the MCPs, writes to project folders

No dead code. No empty packages. No CLI commands that duplicate agent behaviour. Clean enough to release publicly.
