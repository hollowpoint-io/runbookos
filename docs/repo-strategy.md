# Repository Strategy

RunbookOS starts as a monorepo.

## Why Monorepo First

- One install path for v1.
- One versioned skill manifest format.
- Easier refactors while provider and MCP contracts are still settling.
- Easier public docs and examples.

## Package Boundaries

Packages should still be independently shaped:

- `@runbookos/core`
- `@runbookos/config`
- `@runbookos/memory`
- `@runbookos/mcp-shopify`
- `@runbookos/mcp-ahrefs`
- `@runbookos/mcp-gmail`

In-scope verticals such as Bright Data, Google Drive, GA4, and Google Search Console stay documented and are delivered as **skill + creds** or **external (BYO) MCP** until a first-party package earns its place (proven need + runnable behaviour + smoke coverage). Gmail now has a first working package slice. Approval, messaging, scheduling, provider wrappers, and image-routing are **not** planned packages — they are agent-layer / external-cron concerns (see [STATUS.md](STATUS.md) non-goals).

## When To Split Repos

Split only when one of these is true:

- A package needs a separate release cadence.
- A tool package becomes useful outside RunbookOS.
- A package needs different licensing.
- External contributors need clear ownership boundaries.

Until then, keep the source together and publish packages from the monorepo.
