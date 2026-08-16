# Gmail Integration

Status: working first-party MCP wrapper.

Email needs stronger approval rules than read-only research tools. RunbookOS includes a Gmail MCP package for OAuth status, metadata-only inbox search, message metadata/snippet reads, and draft creation. Sending is intentionally not implemented.

## Required Account

- Google Cloud OAuth client.
- Gmail account authorization.
- Refresh token stored outside git, or a future managed OAuth token store.
- Optional `GMAIL_USER_EMAIL` runtime env for operator display.

Do not commit OAuth client secrets, refresh tokens, access tokens, mailbox addresses, message bodies, or thread exports.

## Setup

```bash
pnpm runbook integrations setup gmail ./my-workspace
pnpm runbook gmail auth ./my-workspace
pnpm runbook integrations doctor gmail ./my-workspace
pnpm runbook adapters ./my-workspace
```

`gmail auth` starts a local callback listener and prints a Google OAuth URL. After Google redirects back to `127.0.0.1`, the command exchanges the code and prints private `export` lines for your shell or secret manager. RunbookOS does not write Gmail credentials to workspace files.

## MCP Surface

- Resource `runbook://gmail/status`: OAuth credential state, missing env, safety boundary.
- Tool `gmail.search`: search Gmail and return message metadata plus snippets only.
- Tool `gmail.message_metadata`: read metadata plus snippet for one message.
- Tool `gmail.draft_create`: create a Gmail draft without sending it.

## Agent Usage

Use an email skill or direct user instruction. The agent should write drafts or approval previews under `outbox/` and ask before creating a Gmail draft. Sending remains unavailable.

## Safety Notes

- Start with read/search and draft-only actions.
- Never print email bodies or tokens in logs.
- Store generated drafts and approval previews under `outbox/`.
- Use narrow OAuth scopes where possible.

## References

- Gmail API docs: https://developers.google.com/gmail/api/guides
- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2
