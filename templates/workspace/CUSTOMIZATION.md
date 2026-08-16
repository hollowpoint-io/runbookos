# Workspace Customization

RunbookOS is designed to be edited. The fastest path to a useful workspace is usually changing Markdown, not writing code.

## Start Here

- `SOUL.md` - operating principles, tone, approval posture, and how the agent should behave.
- `USER.md` - user profile, preferences, businesses, recurring priorities, and communication style.
- `AGENCY.md` - company/operator defaults, markets, verticals, and service posture.
- `ACTIVE_CONTEXT.md` - what is active right now and where the next session should resume.
- `RUNBOOK.md` - workspace rules that should stay provider-neutral.
- `workspace/clients/<client>/README.md` - client dashboard and operational overview.

## Skills

Skills live in `skills/<skill>/`.

Each skill should have:

- `SKILL.md` - the actual operating instructions for Claude, Codex, or another agent.
- `skill.json` - lightweight metadata so RunbookOS can list and validate it.

Prefer detailed Markdown over coded execution logic when the agent can do the work with tools.

Good skills include:

- trigger phrases
- required context files
- tool setup notes
- exact steps
- gotchas and past mistakes
- approval points
- output paths
- wrap-up requirements

## Skillsets

Skillsets live in `skillsets/<skillset>/`.

Use them to group skills by operating lane, such as Shopify, product listing, collection content, theme audit, SEO, competitor research, content, lead generation, proposals, local SEO, or finance.

During setup, choose the skill lanes you expect to use first. You can change them later by editing `USER.md`, `AGENCY.md`, `ACTIVE_CONTEXT.md`, skill files, and skillset manifests.

## Tools And Credentials

Credentials should stay in runtime env vars, shell profiles, local secret managers, or provider-specific auth stores. Do not write API keys or private tokens to workspace files.

For a local development workspace, the least surprising storage path is `.runbookos/local.env`. It is ignored by the workspace `.gitignore`, and RunbookOS only creates placeholders:

```bash
pnpm runbook credentials checklist . --write-local-env
set -a; source .runbookos/local.env; set +a
```

Fill the values locally in your editor or secret manager. Do not paste real values into committed docs, skills, client dashboards, reports, or memory files.

For a planned tool that does not have a first-party RunbookOS MCP package yet, add an external MCP command or setup notes instead of waiting for TypeScript code.

For Shopify, the normal customer-owned path is:

```bash
pnpm runbook integrations setup shopify . --mode customer_custom_app
export SHOPIFY_SHOP_DOMAIN=<store>.myshopify.com
export SHOPIFY_ADMIN_TOKEN=<admin-api-token>
pnpm runbook integrations doctor shopify .
```

Then use the Shopify skills to draft products, collections, audits, merchandising plans, and approval previews. Only move to a live write after the skill has produced a human-readable preview, rollback note, and explicit approval point.

## When To Add Code

Add code only when it clearly reduces repeated friction:

- auth/setup helper
- adapter generation
- doctor/status check
- public-safety validation
- artifact scaffolding
- a mature repeated setup or validation task that is now boring enough to automate

If the operating procedure still changes often, keep it in Markdown.

## Create A New Vertical

A vertical is just a repeatable lane of work, not a new app.

1. Create a skill folder:

   ```bash
   cp -R templates/skill skills/<new-skill>
   ```

   If this workspace was generated without the repo templates folder, copy any existing skill folder and replace its contents.

2. Edit `skills/<new-skill>/skill.json`:

   ```json
   {
     "id": "new-skill",
     "title": "New Skill",
     "version": "0.1.0",
     "triggers": ["plain language trigger"],
     "modelTier": "balanced",
     "requiredTools": ["workspace"],
     "writesTo": ["workspace/clients/<client>/reports/<vertical>"]
   }
   ```

3. Edit `skills/<new-skill>/SKILL.md` with the actual operating procedure.

4. If it belongs to a group, add it to `skillsets/<skillset>/skillset.json`.

5. Regenerate adapters:

   ```bash
   pnpm runbook adapters .
   ```

## Create A New Project Or Client Folder

Use a client workspace when the work has durable context, outputs, and memory:

```bash
pnpm runbook client create <client-slug> . --name "<Client Name>" --website <domain> --platform "<Platform>"
```

Inside the client folder, use workstream folders for project lanes:

```text
workspace/clients/<client>/
  products/
  collections/
  content/
  campaigns/<campaign-name>/
  reports/
  data/
```

Add or rename folders freely. Update the client `README.md` so the next Claude/Codex session knows what exists and what is active.

## Connect External Tools

First-party RunbookOS packages are not required for a tool to be useful. If an MCP exists externally, enable it in config and regenerate adapters:

```bash
pnpm runbook integrations setup brightdata .
pnpm runbook integrations setup browser .
pnpm runbook integrations setup gdrive . --command <mcp-command> --arg <arg> --env GOOGLE_CLIENT_ID --env GOOGLE_CLIENT_SECRET --env GOOGLE_REFRESH_TOKEN
pnpm runbook integrations setup gsc . --command <mcp-command> --arg <arg> --env GOOGLE_CLIENT_ID --env GOOGLE_CLIENT_SECRET --env GOOGLE_REFRESH_TOKEN
pnpm runbook integrations setup ga4 . --command <mcp-command> --arg <arg> --env GOOGLE_CLIENT_ID --env GOOGLE_CLIENT_SECRET --env GOOGLE_REFRESH_TOKEN
```

Then check:

```bash
pnpm runbook integrations doctor <id> .
pnpm runbook adapters .
```
