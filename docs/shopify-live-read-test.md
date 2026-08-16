# Shopify Live Read Test

This test validates that the Shopify MCP can read customer-owned store metadata without exposing credentials or mutating the store.

## Setup

```bash
pnpm runbook init ./workspaces/live-shopify-smoke
pnpm runbook setup ./workspaces/live-shopify-smoke --user "Smoke Tester" --role "Tester" --agency "RunbookOS" --timezone "Europe/London"
pnpm runbook client create live-shopify-smoke ./workspaces/live-shopify-smoke --name "Live Shopify Smoke" --website "$SHOPIFY_SHOP_DOMAIN" --platform Shopify
pnpm runbook integrations setup shopify ./workspaces/live-shopify-smoke --mode customer_custom_app
```

Runtime env:

```bash
export RUNBOOKOS_SHOPIFY_AUTH_MODE=customer_custom_app
export SHOPIFY_SHOP_DOMAIN=<store>.myshopify.com
export SHOPIFY_ADMIN_TOKEN=<admin-api-token>
export SHOPIFY_API_VERSION=2026-04
```

Validate:

```bash
pnpm runbook integrations doctor shopify ./workspaces/live-shopify-smoke
pnpm runbook adapters ./workspaces/live-shopify-smoke
pnpm runbook doctor ./workspaces/live-shopify-smoke
```

Then open Claude or Codex in the generated workspace and ask it to use Shopify read-only tools through a Shopify skill.

## Safety Boundary

The test must not read customers, orders, payments, transactions, token metadata, or theme asset bodies. It must not write to Shopify.

## Optional Smoke Script

If the retained live smoke script is available, run it only with explicit opt-in:

```bash
RUNBOOKOS_ENABLE_LIVE_SHOPIFY_SMOKE=1 pnpm verify:shopify-live
```
