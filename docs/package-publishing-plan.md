# Package Publishing Plan

Status: packages are publish-ready as `@runbookos/*` (`0.1.0`). Source checkout with `pnpm bootstrap:source` remains supported.

## Current Source Bootstrap

```bash
pnpm bootstrap:source
```

This runs:

1. `pnpm install --frozen-lockfile`
2. `pnpm -w build`
3. `pnpm runbook install check`

It does not request credentials, write secrets, create workspaces, call provider models, or execute external actions.

## Publishing Target

The v1 package target should provide:

- `@runbookos/cli` with a `runbook` binary.
- Published first-party MCP packages for working servers only: workspace, memory, Shopify, Ahrefs, Gmail.
- Adapter generation that defaults to published MCP commands for packaged installs.
- A clean upgrade path from source checkout to package install.

## Do Not Publish Yet

Do not publish packages for planned integrations until they have runnable behavior and smoke coverage. This includes image, Bright Data, Google Drive, GSC, GA4, approval, messaging, scheduling, and provider wrappers.

## Release Gates Before Publishing

- Clean checkout install succeeds.
- `pnpm bootstrap:source` succeeds locally.
- `pnpm runbook release check` reports ready.
- Published-package adapter smoke passes against packed packages.
- README and getting-started docs clearly distinguish source bootstrap from package install.
