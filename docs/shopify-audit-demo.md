# Shopify Demo Notes

The old deterministic Shopify workflow runners are deprecated by the course correction. Skill files are now the workflow.

Use this document only as historical context for fixture data quality and expected report shape. Do not add new CLI workflow runners.

## Current Direction

- Keep Shopify fixture data useful for demos and tests.
- Keep the Shopify MCP read-only tool surface reliable.
- Move repeatable Shopify operating procedures into `skills/`.
- Let Claude or Codex execute the skill from the generated workspace.
- Require approval previews and rollback notes before any Shopify mutation.

## Useful Demo Pattern

For a safe Shopify demo:

1. Create a workspace.
2. Create a demo client.
3. Enable Shopify fixture mode.
4. Regenerate adapters.
5. Open Claude or Codex in the workspace.
6. Ask the agent to use the relevant Shopify skill and fixture/read-only tools.

The output should still land in the client folder and memory should still be updated, but the agent performs the work directly from skills rather than a workflow manifest runner.
