# Shopify Auth

RunbookOS supports safe Shopify access through MCP tools and skill instructions. It does not need a workflow runner to use Shopify data.

## Modes

### Fixture

Fixture mode uses public-safe sample data and consumes no API units:

```bash
pnpm runbook integrations setup shopify ./workspaces/my-agency --mode fixture
pnpm runbook integrations doctor shopify ./workspaces/my-agency
pnpm runbook adapters ./workspaces/my-agency
```

### Customer Custom App Read-Only

Use customer-owned credentials through runtime env only:

```bash
pnpm runbook integrations setup shopify ./workspaces/my-agency --mode customer_custom_app

export RUNBOOKOS_SHOPIFY_AUTH_MODE=customer_custom_app
export SHOPIFY_SHOP_DOMAIN=<store>.myshopify.com
export SHOPIFY_ADMIN_TOKEN=<admin-api-token>
export SHOPIFY_API_VERSION=2026-04

pnpm runbook integrations doctor shopify ./workspaces/my-agency
pnpm runbook adapters ./workspaces/my-agency
```

Current live-read scope:

- shop metadata
- product metadata
- collection metadata
- theme metadata

Out of scope:

- customers
- orders
- payments
- token metadata
- writes/mutations

## How Agents Should Use It

Open Claude or Codex in the generated workspace and ask it to use the relevant Shopify skill. The agent should read the client dashboard, run read-only discovery through enabled MCP tools, write artifacts under the client folder, and update memory at wrap-up.

## Mutation Boundary

Do not add write scopes by default. Before any Shopify mutation, the agent must produce:

- exact proposed changes
- affected resource identifiers
- rollback data
- dry-run or preview artifact
- explicit approval point

Only after approval should live writes be considered.
