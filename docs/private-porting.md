# Private Porting Guide

Use this guide when moving private prototype context, client data, and integrations into a local RunbookOS workspace while keeping the public repo clean.

## Rule

Public RunbookOS code, templates, fixtures, skills, and docs must stay safe to publish. Private client data and credentials belong only in ignored local workspaces, env vars, secret managers, or provider runtimes.

## Recommended Shape

```text
runbookos/                         public-safe repo
  docs/
  templates/
  skills/
  skillsets/
  workspaces/                      ignored local workspaces
    private-agency/                private context lives here
```

`workspaces/` is ignored by git. Keep it that way.

## 1. Create A Private Workspace

```bash
pnpm runbook init ./workspaces/private-agency
pnpm runbook setup wizard ./workspaces/private-agency
pnpm runbook client create <client-slug> ./workspaces/private-agency --name "<Client Name>" --website <client-domain> --platform Shopify
pnpm runbook smoke ./workspaces/private-agency
pnpm runbook doctor ./workspaces/private-agency
```

Then customize:

```text
workspaces/private-agency/USER.md
workspaces/private-agency/SOUL.md
workspaces/private-agency/RUNBOOK.md
workspaces/private-agency/ACTIVE_CONTEXT.md
workspaces/private-agency/MEMORY.md
workspaces/private-agency/workspace/clients/<client>/README.md
```

Do not commit these files unless you intentionally turn a sanitized version into a template or fixture.

## 2. Port Context In Layers

1. Operating preferences and approval boundaries.
2. Client dashboard summaries.
3. Workstream notes.
4. Public-safe sample fixtures.
5. Integration credentials through env vars only.
6. Live-read tests.
7. Approval previews before mutations.

Avoid dumping the whole prototype into memory. Keep each client dashboard concise and link deeper notes under that client folder.

## 3. Activate Shopify Safely

Fixture mode:

```bash
pnpm runbook integrations setup shopify ./workspaces/private-agency --mode fixture
pnpm runbook integrations doctor shopify ./workspaces/private-agency
```

Customer custom-app read-only mode:

```bash
pnpm runbook integrations setup shopify ./workspaces/private-agency --mode customer_custom_app

export RUNBOOKOS_SHOPIFY_AUTH_MODE=customer_custom_app
export SHOPIFY_SHOP_DOMAIN=<customer-owned-shop.myshopify.com>
export SHOPIFY_ADMIN_TOKEN=<customer-owned-admin-token>
export SHOPIFY_API_VERSION=2026-04

pnpm runbook integrations doctor shopify ./workspaces/private-agency
pnpm runbook adapters ./workspaces/private-agency
```

Then open Claude or Codex in the workspace and use the Shopify skills. Current live-read scope is shop, product, collection, and theme metadata only. Customer, order, payment, token metadata, and writes are out of scope.

## 4. Track Gaps Before Building

Create:

```text
workspaces/private-agency/workspace/runs/private-porting-notes.md
```

Use these headings:

```markdown
# Private Porting Notes

## Missing Public Template

## Missing Skill

## Missing Integration

## Provider Setup Issue

## Approval/Safety Gap

## Should Stay Private
```

Only general fixes should move back into repo code/docs/templates. Private data stays in the workspace.

## 5. Commit Policy

Commit:

- generic CLI fixes
- docs
- templates
- sanitized fixtures
- public skill improvements
- tests for retained packages

Do not commit:

- generated private workspaces
- `.env`
- access tokens
- real store domains
- private client dashboards
- exports from paid tools unless sanitized as fixtures

## 6. Before Public Push

Run:

```bash
git status --short
pnpm verify:json
pnpm verify:adapters
pnpm verify:setup
pnpm verify:client
pnpm verify:smoke
pnpm verify:release
pnpm verify:mcp
pnpm verify:shopify
```

Then check:

```bash
find . -name .DS_Store -print
git status --ignored --short workspaces
```

The public branch should not contain private workspace files.
