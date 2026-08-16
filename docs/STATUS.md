# RunbookOS — Status

_Last updated: 2026-06-09. This is the single source of truth for where the project is and what's left. Read this first._

RunbookOS is **course-corrected**: the agent-runtime overbuild (gateway, scheduler, workflow runner, approval engine, provider wrappers, messaging) has been removed. What remains is the actual product — a workspace substrate that makes CLI agents persistent, tuned, and tool-equipped. The remaining work is doc realignment, verification, and a clean collapse to `main`.

---

## The model (target architecture)

Three layers. RunbookOS owns only the first.

| Layer | What | Who owns it |
| --- | --- | --- |
| **0 — Substrate** | Workspace structure, memory protocol, project/client folders, instruction files (`SOUL`/`USER`/`ACTIVE_CONTEXT`/`RUNBOOK`/`MEMORY`), skills + skillsets, adapter generation, credential boundary, onboarding/validation CLI, MCP tool contracts. | **RunbookOS** |
| **1 — Verticals** | A vertical = `SKILL.md` (tuned per project/use-case) **+ tool access** (API key/OAuth held locally + how-to instructions). Delivered as first-party MCP, skill+creds, or external MCP. | **RunbookOS configures; agent executes** |
| **2 — Execution** | *Interactive*: Claude Code / Codex reading the workspace. *Autonomous*: an Anthropic **Agent SDK** app tuned by a RunbookOS folder + skills, scheduled by an external cron (e.g. **trigger.dev**). | **The agent layer (NOT RunbookOS)** |

**Scope is kept in full. Only the delivery mechanism changed** — capabilities that were premature first-party code packages are now delivered as skill+creds or external MCP. Nothing was dropped.

---

## Scope & delivery (the vertical catalogue)

Every capability stays in scope. A **first-party MCP** exists only where auth/safety friction earns it; everything else is **skill + creds** or **external (BYO) MCP**.

| Vertical / tool | Delivery | State |
| --- | --- | --- |
| Workspace (read context, safe writes, approval previews) | MCP (first-party) | Working |
| Memory (search, daily append) | MCP (first-party) | Working |
| Shopify (read; mutations via skill + approval) | MCP (first-party) | Working — fixture + customer custom-app live read |
| Ahrefs (SEO research) | MCP (first-party, read-only) | Working — fixture + live read |
| Gmail (search, read, draft) | MCP (first-party, OAuth) | Working first slice — no send |
| Image generation / manipulation | **Skill + creds** | Skill-driven; provider/API key local. Built into product-listing skill. No package. |
| GA4 (analytics) | **Skill + creds** / external MCP | OAuth local; skill carries queries |
| Google Search Console | **Skill + creds** / external MCP | OAuth local |
| Google Drive / Docs / Sheets | **Skill + creds** / external MCP | OAuth local |
| Bright Data (scraping/SERP) | **External MCP (BYO)** | Vendor MCP via config command+env |
| Context7, GitHub, Linear, Notion, Firecrawl, Exa/Perplexity, Browser | **External MCP (BYO)** | Wired via config; user supplies MCP/key |

Full per-tool detail and credential models: [integration-catalog.md](integration-catalog.md).

---

## Non-goals (fixed)

RunbookOS is **not an agent runtime**. It does not build:

- a Claude Code / Codex replacement
- a gateway, daemon, or messaging/notification control plane
- a scheduler (use trigger.dev or system cron)
- a workflow runner or workflow.json manifests (skills *are* the workflow)
- an approval engine (approval is a skill instruction + an `outbox/` preview)
- provider wrappers around Claude or Codex

Execution, orchestration, sequencing, and scheduling belong to the agent layer — Claude Code/Codex interactively, or an Agent SDK app + trigger.dev autonomously.

---

## Where we are

**Code cleanup — done (~95%).** Verified against the working tree on `dev/rapid-buildout`:

- ✅ Dead packages gone: `workflows`, `scheduler`, `provider-claude`, `provider-codex`, `messaging`, `image-tools`, `mcp-approval`.
- ✅ `apps/gateway/` gone (only `apps/cli/` remains).
- ✅ Root `workflows/` JSON manifests gone.
- ✅ `scripts/` and root `package.json` carry **only** verify scripts for kept features — no dead `verify:workflow/scheduler/provider/approval/gateway/image`.
- ✅ Packages now exactly **9** (config, core, memory, skills, mcp-workspace, mcp-memory, mcp-shopify, mcp-ahrefs, mcp-gmail).
- ✅ 5 empty placeholder package dirs removed (`mcp-brightdata/ga4/gdrive/gsc/image`) — were untracked shells; verticals survive as skill+creds / external MCP.
- ✅ Dead `examples/demo-workspace/workflows/shopify-audit.json` manifest removed.
- ✅ Demo config no longer enables the removed `approval` MCP.

**Docs — already aligned:** `architecture.md` (has a correct "Removed From Core"), `integration-catalog.md` (carries the full scope), `getting-started.md`, `agent-walkthrough.md`.

---

## Public release (2026-08-16)

`main` is a single fresh commit of the current product tree. Older branches and history were discarded on purpose.

- Author: Billy Mahmood / Hollowpoint
- GitHub: `hollowpoint-io/runbookos`
- npm: `@runbookos/cli` and first-party `@runbookos/*` packages at `0.1.0`
- Not in this repo: the private gateway, client workspaces, or live credentials

### 1. Doc realignment (in progress)
- [x] `docs/STATUS.md` — this file (new source of truth)
- [x] `README.md` — scope/non-goals spine + delivery framing + execution seam
- [x] `docs/product-direction.md` — scope table + delivery column + trigger.dev seam
- [x] `docs/architecture.md` — add Agent SDK + trigger.dev execution layer note
- [x] `docs/agent-sdk-integration-plan.md` — cleanup is past-tense/done; add trigger.dev; confirm image-gen survives as skill
- [x] `docs/roadmap.md` — reconcile checkboxes to actual state; reframe forward batches
- [x] `docs/ship-readiness.md` — reframe "Not Ready" so delivery-change ≠ scope-drop
- [x] `DEV_HANDOFF.md` — update to current reality
- [x] `docs/integration-catalog.md` — reframe Slack/Telegram "control planes" line (external notification, not a RunbookOS control plane)
- [x] Long-tail pass — reviewed `repo-strategy.md`, `package-publishing-plan.md`, `private-porting.md`, `phase-2-extraction.md`, `overview.md`, `dogfood-test-plan.md`, `shopify-auth.md`, `shopify-audit-demo.md`. All but one were already correctly framed (non-goals lists, or "historical" banners). Fixed `repo-strategy.md` (it wrongly listed approval/messaging/scheduling as *planned integrations* — now marked agent-layer/external).

### 2. Verification — DONE (2026-06-09)
- [x] `pnpm install && pnpm -w typecheck && pnpm -w build` — clean across all 10 workspaces
- [x] Full `pnpm verify:*` suite — 14/14 passing (one fix: this file leaked a private prototype term, caught by the release gate; one fix: the live Shopify smoke wrote the real shop domain into the smoke workspace — now uses a placeholder)
- [x] `init → setup → client create → adapters → doctor → verify → smoke` end-to-end on a fresh workspace — "Result: ready"
- [x] **Live Shopify smoke passed against a real store** through the hardened client (`verify:shopify-live`)
- [ ] Ahrefs/Gmail LIVE smokes still need real creds in env (`AHREFS_API_TOKEN`, `GMAIL_*`) — same hardened code path as Shopify, fixture smokes green

### 3. Git collapse — DONE (2026-08-16)
- [x] Current tree published as a single `main` commit. Older branches and history discarded.
- [x] Authorship set to Billy Mahmood / Hollowpoint.

### 4. Forward product work
- [x] **Batch A — skill quality (DONE 2026-06-09)**: all 15 skills upgraded to v0.2.0 — `Use When` routing blocks, `Research Phase (always first)` with the stop-on-broken-premise rule, `Effort & Model Tiers`, `Approval Boundaries` (autonomous / approval-required / never), manifest `safety.requiresApprovalFor`. New-skill template (`templates/skill/`) carries the canonical shape.
- [x] **Batch B — MCP hardening (DONE 2026-06-09)**: shared `fetchWithRetry` in `@runbookos/core` (per-attempt timeout, bounded retries, Retry-After, actionable 401/403 hints) wired into Shopify (incl. GraphQL THROTTLED retry), Ahrefs, and Gmail (plus access-token caching + refresh-once-on-401 + invalid_grant guidance).
- Autonomous execution stays outside this repo (agent layer + external cron). Do not add a gateway, scheduler, or workflow runner here.

---

## Operating rule (for any agent working in this repo)

Before writing new TypeScript, ask: (1) can a skill file do this? (2) can it be a Markdown instruction? (3) does it duplicate Claude Code / Codex? (4) is it orchestration, scheduling, approval, messaging, or provider execution? **If yes to any — don't code it.** Improve the skill, template, adapter text, or MCP setup instead. New CLI commands and new packages require Billy's explicit approval.
