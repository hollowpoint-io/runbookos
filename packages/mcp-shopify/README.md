# @runbookos/mcp-shopify

Public-safe read-only Shopify MCP package.

The default implementation is fixture-backed. `customer_custom_app` mode can perform explicit read-only live reads when a customer supplies their own Shopify custom app credentials through runtime env.

## Goal

Expose Shopify read paths through explicit, auditable tools:

- Store overview
- Product and variant search
- Collection search
- Collection content updates
- Theme inspection
- Bulk operation preview/apply/rollback

Working today:

- `shopify.store_overview`
- `shopify.product_search`
- `shopify.collection_search`
- `shopify.theme_inspect`
- `runbook://shopify/status`
- `runbook://shopify/fixture-store`

## Safety Model

- Read-only by default.
- Fixture mode by default.
- `customer_custom_app` mode reads only shop, product, collection, and theme metadata.
- Customer, order, payment, and token data are out of scope.
- Mutating tools require `dryRun: false` and an approval note.
- No tokens are stored in files. Credentials come from environment variables or the host MCP runtime.
- Every write tool should return a rollback plan when Shopify supports it.

## Environment

```text
RUNBOOKOS_SHOPIFY_AUTH_MODE=fixture
SHOPIFY_SHOP_DOMAIN=
SHOPIFY_ADMIN_TOKEN=
SHOPIFY_API_VERSION=2026-04
RUNBOOKOS_SHOPIFY_FIXTURE=
```

`RUNBOOKOS_SHOPIFY_FIXTURE` can point to a public-safe fixture JSON file. If omitted in local repo development, the server falls back to `examples/fixtures/shopify-demo-store.json`.

See [../../docs/shopify-auth.md](../../docs/shopify-auth.md) for the public-safe auth model. `oauth_managed_app` is reserved and does not perform live reads yet.
