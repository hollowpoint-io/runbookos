# Security

RunbookOS is designed to be public-safe, but real workspaces are private by default.

## Never Commit

- API keys
- Access tokens
- Customer data
- Store admin tokens
- Gmail tokens
- Raw PII exports
- Private client strategy unless intentionally public

## Credential Pattern

Use:

- `.env`
- Secret managers
- MCP runtime env injection
- Password managers for human access

Do not use:

- Markdown files with live tokens
- Tracked JSON config containing credentials
- Shell history with secrets

## Public Repo Checklist

Before publishing:

- Run secret scanning.
- Review `git ls-files`.
- Confirm `.env` and local config are ignored.
- Use fake demo clients only.
- Confirm all screenshots are sanitized.
- Confirm examples use placeholders.
- Confirm Shopify remains disconnected by default; see [Shopify Auth Modes](shopify-auth.md).
- Confirm no real `*.myshopify.com` domains or Shopify token prefixes are committed.

## External Control Surfaces

If a future Agent SDK app, chat bot, or messaging surface exposes a workspace:

- Whitelist users or workspaces.
- Keep command logs free of secrets.
- Do not send full private reports to shared channels.
- Require explicit approval for external actions.
- Keep message history short and scoped to the conversation.
