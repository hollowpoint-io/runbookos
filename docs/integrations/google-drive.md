# Google Drive And Docs Integration

Status: recommended external MCP or future first-party wrapper.

Google Drive and Docs are useful for client briefs, shared source documents, handoffs, and exported artifacts.

## Required Account

- Google Cloud project.
- Drive API access.
- OAuth client and refresh token, or an external MCP server with its own OAuth flow.

## Workspace Config

```json
{
  "mcpServers": {
    "gdrive": {
      "enabled": false,
      "env": [
        "GOOGLE_CLIENT_ID",
        "GOOGLE_CLIENT_SECRET",
        "GOOGLE_REFRESH_TOKEN"
      ]
    }
  }
}
```

Do not enable this server until a first-party package or explicit external command override is configured.

## Safety Notes

- Only access customer-authorized folders and files.
- Keep exported summaries or generated documents inside the client workspace before publishing them back to Drive.
- Require approval before creating, editing, sharing, or deleting Drive files.

## References

- Google Drive API docs: https://developers.google.com/drive/api/guides/about-sdk
- Google Docs API docs: https://developers.google.com/docs/api
- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2
