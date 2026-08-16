# Google Search Console Integration

Status: planned first-party or vetted external MCP.

Google Search Console is the source of truth for owned-site search performance, indexing, and page-level SEO diagnostics. RunbookOS does not yet ship a GSC MCP server.

## Required Account

- Verified Search Console property access.
- Google Cloud OAuth client.
- Refresh token stored outside git, or a future managed OAuth token store.

## Workspace Config

```json
{
  "mcpServers": {
    "gsc": {
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

- Persist site URL, query dimensions, date range, row limit, and retrieval timestamp.
- Avoid blending GSC data with scraped SERP data without labeling sources.
- Keep raw exports under `workspace/clients/<client>/data/gsc/`.

## References

- Search Console API docs: https://developers.google.com/webmaster-tools
- Google OAuth docs: https://developers.google.com/identity/protocols/oauth2
