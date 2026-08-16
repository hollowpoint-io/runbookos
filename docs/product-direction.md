# Product Direction

RunbookOS is not a replacement for Claude Code, Codex, or any future CLI agent. It is the installable operating workspace that makes those agents useful, persistent, safe, and portable.

The private prototype proves the product pattern:

```text
agent + startup context + skill Markdown + overview/dashboard Markdown + file system + MCP/tools + runtime credentials
```

RunbookOS should package that pattern for other operators without turning the agent into a custom app runtime.

## What RunbookOS Owns

- Workspace bootstrap and file structure.
- Provider adapter generation for Claude, Codex, and future agents.
- Startup context and wrap-up conventions.
- Public-safe skill, skillset, and client templates.
- Runtime credential setup guidance and local secret boundaries.
- MCP/tool configuration and validation.
- Approval/outbox conventions before external actions.
- Verification that the workspace is usable and public-safe.

## What The Agent Owns

- Reading the relevant skill and overview files.
- Reasoning over messy inputs.
- Calling provider-native tools and MCPs.
- Performing vertical work from Markdown instructions.
- Writing reports, exports, dashboards, memory notes, and approval previews.
- Asking for approval when the skill says a live action needs it.

## Scope & Delivery

Scope is the full set of verticals and tools (Shopify, SEO/Ahrefs, GSC, GA4, Bright Data, Drive/Docs/Sheets, Gmail, image generation, content, leads, and more). That scope is fixed and expansive. What varies per tool is **delivery mechanism**:

- **MCP (first-party)** — a thin RunbookOS server, justified only by real auth/safety friction. Today: workspace, memory, Shopify, Ahrefs, Gmail.
- **Skill + creds** — an API key or OAuth token held locally plus `SKILL.md` instructions; no package. Today: image generation (built into the product-listing skill), GA4, GSC, Drive/Docs/Sheets.
- **External MCP (BYO)** — a vendor/community MCP wired via config `command`/`args`/`env`. Today: Bright Data, Context7, GitHub, Linear, Notion, Firecrawl, Exa/Perplexity, browser.

Removing a premature first-party package downgrades *delivery* (code → skill+creds / external MCP). It never removes the vertical. The catalogue lives in [integration-catalog.md](integration-catalog.md); current state in [STATUS.md](STATUS.md).

## Execution Layer

RunbookOS does not execute. Work runs in one of two places, both outside the product:

- **Interactive** — Claude Code or Codex open the workspace and follow skills.
- **Autonomous** — an Anthropic Agent SDK app, tuned by a RunbookOS folder + skills, triggered by an external cron such as **trigger.dev**. The Agent SDK does the heavy/scheduled work; trigger.dev handles scheduling. RunbookOS supplies only the folder, READMEs, and skills that tune it.

This is why there is no gateway, scheduler, or workflow runner in scope: those roles are filled by the Agent SDK and trigger.dev.

## Build Rule

All intended verticals and tools stay in scope. Do not pause a vertical just because it is not ready for a custom coded runner.

Default implementation order:

1. **Markdown-first vertical**: skill file, overview/runbook notes, expected folders, setup notes, and adapter visibility.
2. **Tool wiring**: MCP/external command config, credential env names, doctor/status checks, and setup docs.
3. **Thin helper**: small CLI command only when it removes repeated friction, such as auth, adapter generation, validation, or artifact scaffolding.
4. **Coded helper/MCP package**: only after the Markdown/tool path is used enough to prove the repetitive part should be productized.

This means Bright Data, Google Drive/Docs, GSC, GA4, image generation, live Ahrefs competitor research, and Shopify mutations can all exist as useful RunbookOS verticals before they have first-party coded packages.

## Anti-Goals

- Do not build a Claude Code or Codex replacement.
- Do not encode all business logic into TypeScript if Markdown skills plus tools already work.
- Do not block useful verticals on first-party MCP packages.
- Do not confuse fixture demos with daily usefulness.
- Do not add daemon/gateway/orchestration complexity before the local agent workspace loop is excellent.

## Success Test

A technical user should be able to:

1. Install or bootstrap RunbookOS quickly.
2. Add runtime credentials without committing secrets.
3. Edit `SOUL.md`, `USER.md`, `ACTIVE_CONTEXT.md`, client dashboards, and skill Markdown.
4. Open Claude or Codex in the workspace.
5. Have the agent load the right context, use the connected tools, do real vertical work, and write durable outputs.

If a feature does not improve that loop, it should wait.
