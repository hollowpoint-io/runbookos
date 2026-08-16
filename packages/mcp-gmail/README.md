# @runbookos/mcp-gmail

First-party Gmail MCP wrapper for RunbookOS.

Initial scope:

- OAuth status and safety metadata.
- Browser OAuth URL/callback helpers for refresh-token setup.
- Metadata-only Gmail message search.
- Metadata/snippet reads for one message.
- Draft creation only. Sending is intentionally not implemented.

Credentials are read from runtime environment variables only:

- `GMAIL_CLIENT_ID`
- `GMAIL_CLIENT_SECRET`
- `GMAIL_REFRESH_TOKEN`

RunbookOS does not persist Gmail credentials or mailbox addresses in workspace files.
