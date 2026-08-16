# Overview

RunbookOS is an operating workspace for CLI agents.

It assumes the model and agent app will change. The durable product is:

- Workspace structure.
- Memory protocol.
- Client dashboards.
- Markdown skills.
- Adapter generation.
- MCP tool contracts.
- Approval and outbox conventions.

## Who It Is For

- Ecommerce operators.
- SEO and growth agencies.
- Fractional digital engineers.
- Solo builders managing many clients or projects.
- Teams using more than one coding agent.

## What It Is Not

- Not a hosted chatbot.
- Not a CRM.
- Not a workflow runner.
- Not a scheduler.
- Not a provider wrapper.
- Not a replacement for Shopify, Ahrefs, Gmail, analytics tools, Claude Code, or Codex.

## Core Loop

1. Agent reads `ACTIVE_CONTEXT.md`, `USER.md`, `SOUL.md`, `RUNBOOK.md`, and the relevant client dashboard.
2. Agent loads the relevant `SKILL.md`.
3. Agent gathers data through enabled tools and MCPs.
4. Agent writes reports, drafts, exports, or approval previews into the client workspace.
5. Agent updates memory and dashboards at wrap-up.

The product exists to make that loop reliable, portable, and safe.

## Product Boundary

RunbookOS owns:

- Workspace templates.
- Client folder conventions.
- Skill files and skill manifests.
- Adapter generation for Claude, Codex, and future agents.
- MCP setup and validation.
- Credential boundary documentation.
- Onboarding and doctor commands.

The agent owns:

- Planning.
- Reasoning.
- Sequencing work.
- Calling tools.
- Applying skill instructions.
- Asking for approval before external actions.

If a feature can be expressed as a skill instruction, it should be a skill instruction first.
