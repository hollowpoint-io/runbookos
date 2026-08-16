# Integration Catalog

RunbookOS should make powerful tools discoverable without pretending that paid accounts, OAuth consent, API keys, or vendor MCP installs are bundled.

The pattern is:

- Ship disabled-by-default config blocks.
- Generate adapter-ready placeholders.
- Allow explicit `command` and `args` overrides for external MCPs.
- Document required account, key, OAuth, or install steps.
- Keep provider-specific setup notes for Claude, Codex, and other MCP clients.
- Keep all credentials in env vars, secret managers, OAuth stores, or the host MCP runtime.

## Status Labels

| Status | Meaning |
| --- | --- |
| Working | Implemented in this repo and covered by smoke tests. |
| Ready Config | Config/docs should be preloaded, but the user brings the external MCP/API. |
| Planned | Important to the product, but not implemented yet. |
| External MCP | Prefer vendor/community MCP installation instead of wrapping immediately. |

## Built-In RunbookOS MCPs

| Integration | Status | Use | Setup |
| --- | --- | --- | --- |
| Workspace | Working | Read runbook/context/client files; write safe reports and approval previews. | Enabled by default. |
| Memory | Working | Search memory, append daily notes, dry-run consolidation. | Enabled by default. |
| Shopify | Working | Fixture mode and customer custom-app read-only store/product/collection/theme metadata. | Disabled by default; customer supplies Shopify env vars for live reads. |
| Image | Skill-first planned | Generation, editing, product image prep, resizing, compression, and provenance. | Use image skills and provider-native tools; first-party MCP remains disabled until justified. |
| Gmail | Working first slice | OAuth status, metadata-only search/read, and draft creation. Sending is not implemented. | OAuth env only; disabled by default. |
| Ahrefs | Working fixture / live read-only | SEO keyword, site, top-page, organic keyword, and fixture competitor-gap research. | Disabled by default; fixture mode consumes no API units, live mode requires customer API token and row limits. |
| Google Search Console | Planned / external setup path | Owned-site SEO performance, indexing, and page diagnostics. | OAuth only; disabled by default; connect with `runbook integrations setup gsc <dir> --command ...`. |
| GA4 | Planned / external setup path | Traffic, conversion, and ecommerce analytics reports. | OAuth only; disabled by default; connect with `runbook integrations setup ga4 <dir> --command ...`. |
| Google Drive/Docs | Recommended / external setup path | Customer-authorized briefs, source docs, handoffs, and generated drafts. | OAuth only; disabled by default; connect with `runbook integrations setup gdrive <dir> --command ...`. |
| Bright Data | External MCP | Public web data, ecommerce research, competitor pages, SERP-like extraction. | Prefer official Bright Data MCP or user API key; disabled by default; connect with `runbook integrations setup brightdata <dir>`. |

## External MCP Config

First-party RunbookOS servers can be generated as local development commands or future published `@runbookos/mcp-*` packages. Third-party servers should not pretend to be RunbookOS packages. For those, add `command` and `args` in `runbookos.config.json`:

```json
{
  "mcpServers": {
    "context7": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "@upstash/context7-mcp@latest"],
      "env": ["CONTEXT7_API_KEY"]
    }
  }
}
```

When enabled, adapter generation preserves that command for Claude and Codex instead of emitting `@runbookos/mcp-context7`.

The CLI can write the enabled config for either preloaded commands or user-supplied external MCPs:

```bash
pnpm runbook integrations setup brightdata ./my-workspace
pnpm runbook integrations setup gsc ./my-workspace --command npx --arg -y --arg <external-gsc-mcp> --env GOOGLE_CLIENT_ID --env GOOGLE_REFRESH_TOKEN
pnpm runbook integrations doctor gsc ./my-workspace
```

Per-integration setup notes live under [docs/integrations](integrations/README.md). The CLI prints those guide paths in `runbook integrations list`.

## CLI Visibility

Use the CLI to inspect which MCP integrations are present in a workspace config:

```bash
pnpm runbook integrations list ./my-workspace
pnpm runbook integrations list ./my-workspace --enabled
```

The output lists integration id, enabled state, status label, category, required env var names, command hint, and relevant docs path. It prints env var names only; it never prints env values.

## Prototype / Power Tool Set

These should be represented in docs and optional config even when not implemented as first-party packages yet.

| Tool | Recommended Status | Why It Belongs | Credential Model |
| --- | --- | --- | --- |
| Context7 | External MCP | Up-to-date library/framework docs for coding agents; useful because Claude/Codex stale-doc behavior differs. | Optional Context7 API key or hosted MCP. |
| Bright Data | External MCP first | Strong public web data and scraping surface for ecommerce/lead-gen research. | Bright Data account/API or hosted MCP. |
| Ahrefs API v3 | Working fixture / live read-only | SEO research needs stable RunbookOS tool contracts over paid API responses. | Fixture mode today; live selected API v3 endpoints require Ahrefs API access on eligible paid plans. |
| Google Search Console | Planned | Owned-site SEO truth: queries, pages, indexing, performance. | Customer OAuth/Google Cloud project. |
| GA4 | Planned | Traffic and conversion analytics for client reports. | Customer OAuth/Google Cloud project. |
| Shopify | Working / Expanding | Core ecommerce operations. | Fixture, customer custom app, future OAuth managed app. |
| Image generation/manipulation | Skill-first planned | Product listing images, ad creatives, hero assets, resizing, compression. | Provider session supplies Codex-native, Google/Nano Banana, or external tooling. |
| Gmail / Google Workspace | Working first slice | Approved outbound comms and agency inbox work, starting with metadata-only reads and draft creation. | OAuth; no password/token files. |
| GitHub | Recommended | Repo operations, issue/PR context, changelogs. | User GitHub token or OAuth app. |
| Linear | Recommended | Agency/product work tracking. | User API key/OAuth. |
| Notion | Recommended | Client knowledge bases and lightweight CMS/workspaces. | OAuth/integration token. |
| Google Drive/Docs | Recommended | Client docs, briefs, handoff artifacts. | OAuth. |
| Firecrawl | Recommended | Site crawl/scrape alternative when Bright Data is too heavy. | User API key. |
| Exa or Perplexity | Recommended | Web/search/research augmentation with citations. | User API key. |
| Browser/Playwright | Recommended with caution | Visual QA, screenshots, ecommerce checks, local app verification. | Local install; strict workspace/file permissions. |
| Slack/Discord/Telegram/WhatsApp | External (agent-layer) | Notifications and command surfaces — delivered by an Agent SDK app / trigger.dev trigger, **not** a RunbookOS control plane. | User bot/app credentials; disabled by default. |

## Provider Notes

Claude and Codex do not wire MCP servers identically. RunbookOS should avoid promising a one-click universal MCP setup. Instead:

- The canonical `runbookos.config.json` lists desired integrations.
- Adapter generation emits best-effort Claude and Codex config.
- Integration docs list when a server must be installed separately.
- Skills refer to stable RunbookOS tool contracts, not vendor-specific server names.

## Recommended Config Policy

Default workspace config should enable only local safe servers:

- `workspace`
- `memory`

Power tools should be present but disabled:

- `shopify`
- `ahrefs`
- `brightdata`
- `gmail`
- `image`
- `context7`
- `gsc`
- `ga4`
- `github`
- `linear`
- `notion`
- `gdrive`
- `firecrawl`
- `exa`
- `perplexity`
- `browser`

This keeps the product visibly powerful while preserving public-safety and honest setup expectations.

## Sources To Track

- Bright Data MCP: https://docs.brightdata.com/mcp-server/overview
- Bright Data Claude/local MCP setup: https://docs.brightdata.com/ai/mcp-server/integrations/claude
- Firecrawl MCP setup: https://docs.firecrawl.dev/mcp-server
- Ahrefs API v3 docs: https://docs.ahrefs.com/docs/api/reference/introduction
- Ahrefs API limits/paid units: https://docs.ahrefs.com/docs/api/reference/limits-consumption
- Context7 MCP: https://context7.com/docs
- Exa MCP: https://exa.ai/docs/reference/exa-mcp
- Perplexity MCP: https://docs.perplexity.ai/docs/getting-started/integrations/mcp-server
- GitHub MCP: https://github.com/github/github-mcp-server
- Linear MCP: https://linear.app/docs/mcp
- Notion MCP: https://developers.notion.com/guides/mcp/overview
- Playwright MCP: https://playwright.dev/mcp/introduction
- Shopify custom app access tokens: https://shopify.dev/docs/apps/build/authentication-authorization/access-tokens/generate-app-access-tokens-admin
