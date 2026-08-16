# Integration Setup Guides

RunbookOS keeps optional power tools disabled until the workspace owner supplies credentials, OAuth consent, or an external MCP server.

Use these guides with `runbookos.config.json`:

- Built-in RunbookOS MCPs can run from this repo during local development.
- External MCPs should use explicit `command` and `args` overrides, or a client-native remote MCP URL when the client supports it.
- Planned first-party integrations are documented as contracts only until their packages are implemented.
- Environment variables are listed by name only. Do not write real values into repo files.

Inspect a workspace with:

```bash
pnpm runbook integrations list ./my-workspace
pnpm runbook integrations list ./my-workspace --enabled
pnpm runbook credentials checklist ./my-workspace
```

To create an ignored local env placeholder file:

```bash
pnpm runbook credentials checklist ./my-workspace --write-local-env
set -a; source ./my-workspace/.runbookos/local.env; set +a
```

Fill secret values locally. RunbookOS writes placeholders only.

Enable a built-in integration:

```bash
pnpm runbook integrations setup shopify ./my-workspace --mode customer_custom_app
pnpm runbook integrations setup ahrefs ./my-workspace --mode fixture
pnpm runbook integrations setup gmail ./my-workspace
```

Enable an external MCP from the config defaults, or supply a command when RunbookOS does not ship one yet:

```bash
pnpm runbook integrations setup brightdata ./my-workspace
pnpm runbook integrations setup gdrive ./my-workspace --command <mcp-command> --arg <arg> --env GOOGLE_CLIENT_ID --env GOOGLE_REFRESH_TOKEN
pnpm runbook integrations doctor gdrive ./my-workspace
```

See also [Integration Catalog](../integration-catalog.md).
