# RunbookOS Workspace Runbook

This file is provider-neutral. Agent-specific files such as `AGENTS.md`, `CLAUDE.md`, and `.codex/config.toml` are generated from `runbookos.config.json`.

## Operating Model

- Read `ACTIVE_CONTEXT.md`, `USER.md`, `SOUL.md`, and the relevant client dashboard before doing meaningful work.
- Use skills for repeatable work instead of inventing a new process each time.
- Prefer Markdown-first vertical work: if a skill file plus connected tools can handle the task, use the skill directly instead of waiting for a coded runner.
- Keep raw data separate from distilled decisions.
- Save durable artifacts under the relevant client folder.
- Update memory and dashboards at the end of meaningful sessions.
- Prefer explicit approvals for external actions, credential use, publishing, destructive changes, or client-data mutations.
- When context is missing, say what is missing and propose the smallest useful next step.

## Workspace Map

```text
workspace/
  clients/
    <client>/
      README.md
      context/
      workstreams/
      campaigns/
      reports/
      data/
      archive/
memory/
outbox/
skills/
skillsets/
```

See `CUSTOMIZATION.md` for how to edit skills, skillsets, user context, credentials notes, and client dashboards for this workspace.

## Standard Work Loop

1. Clarify the objective and expected artifact.
2. Read the smallest sufficient context set.
3. Check enabled integrations and approval boundaries.
4. Run the relevant skill. A Markdown skill is enough when the agent can do the work with available tools.
5. Write the artifact in the correct client folder.
6. Update the dashboard, active context, and daily memory.
7. Surface blockers, assumptions, and next actions.

## Client State

Every client dashboard should answer:

- What is this client?
- What is active right now?
- What is blocked?
- What shipped recently?
- What should happen next?
- Where are credentials referenced?
- Which skills and integrations are safe to use?

## External Actions

Use the outbox for:

- Sending emails.
- Publishing content.
- Mutating client data.
- Applying bulk changes.
- Posting on social or CMS platforms.
- Creating, updating, or deleting live ecommerce records.

Never execute external actions silently. For mutations, produce a preview or approval request first.

## Vertical Defaults

### Ecommerce / Shopify

- Start with read-only discovery.
- Separate product, collection, merchandising, technical, content, operations, and reports.
- Do not publish, update products, change themes, or run bulk operations without approval.
- For live Shopify reads, use customer-owned credentials from runtime env only.

### SEO

- Separate keyword research, technical findings, content opportunities, and shipped recommendations.
- Label fixture, demo, live API, and manually supplied data clearly.
- Avoid pretending demo or incomplete data is a ranking truth.

### Local SEO

- Distinguish owned profile data, citation data, SERP observations, and inferred recommendations.
- Do not fabricate rankings, reviews, addresses, or customer claims.

### Content

- Draft first, publish after approval.
- Preserve brand voice notes and source links.
- Mark assumptions when product, audience, or offer context is incomplete.

### Lead Generation

- Keep prospect research, messaging drafts, approval previews, and sent outreach separate.
- Do not send outreach without approval.

## Provider Parity

Claude, Codex, and other agents should read the same source context:

- `RUNBOOK.md`
- `USER.md`
- `SOUL.md`
- `AGENCY.md`
- `ACTIVE_CONTEXT.md`
- client dashboards
- skill files under `skills/`

Generated adapter files should not contain unique business logic. Regenerate them from `runbookos.config.json` when config changes.
