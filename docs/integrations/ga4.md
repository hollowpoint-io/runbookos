# GA4 Integration

Status: planned first-party or vetted external MCP.

GA4 is the source of truth for website traffic and conversion analytics, but RunbookOS does not yet ship a GA4 MCP server.

## Required Account

- Google Cloud project.
- GA4 property access.
- OAuth client and refresh token or a future managed OAuth flow.

## Workspace Config

```json
{
  "mcpServers": {
    "ga4": {
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

- Limit reports to properties the customer owns or has authorized.
- Persist report parameters, date ranges, property id, and retrieval timestamp.
- Avoid storing raw user-level event data unless the customer explicitly requests it and the workspace policy allows it.

## References

- Google Analytics Data API: https://developers.google.com/analytics/devguides/reporting/data/v1
- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2
