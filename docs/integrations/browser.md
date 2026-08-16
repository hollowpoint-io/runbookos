# Browser And Playwright Integration

Status: recommended external MCP with caution.

Browser automation is useful for visual QA, ecommerce checks, local app verification, and screenshot evidence. Prefer the official Playwright MCP for browser interaction and keep it disabled until a skill or explicit task needs it.

## Workspace Config

```json
{
  "mcpServers": {
    "browser": {
      "enabled": false,
      "command": "npx",
      "args": ["-y", "@playwright/mcp@latest"],
      "env": []
    }
  }
}
```

For more constrained sessions, pass Playwright MCP options such as `--headless`, `--browser=chromium`, or capability limits in `args`.

## Safety Notes

- Avoid logged-in customer/admin sessions unless the user explicitly authorizes them.
- Keep screenshots and traces inside the client workspace.
- Do not use browser automation to bypass access controls or scrape private data.
- Prefer deterministic CLI/API checks over browser automation when a stable API exists.

## References

- Playwright MCP docs: https://playwright.dev/mcp/introduction
- Playwright MCP configuration: https://playwright.dev/mcp/configuration/options
