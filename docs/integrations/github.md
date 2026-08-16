# GitHub Integration

Status: recommended external MCP.

GitHub is useful for repo context, issue triage, pull requests, changelogs, and release work. Prefer GitHub's official MCP server and keep it read-only unless a task is explicitly approval-gated.

## Required Account

- GitHub account or organization access.
- Personal access token or OAuth flow with least-privilege scopes.

## Workspace Config

For local stdio MCP clients, GitHub documents a Docker-based server:

```json
{
  "mcpServers": {
    "github": {
      "enabled": false,
      "command": "docker",
      "args": ["run", "-i", "--rm", "-e", "GITHUB_PERSONAL_ACCESS_TOKEN", "-e", "GITHUB_READ_ONLY=1", "ghcr.io/github/github-mcp-server"],
      "env": ["GITHUB_PERSONAL_ACCESS_TOKEN"]
    }
  }
}
```

RunbookOS currently lists `GITHUB_TOKEN` in `.env.example`; if you use GitHub's official server directly, map your private token to `GITHUB_PERSONAL_ACCESS_TOKEN` in your host environment.

## Safety Notes

- Use read-only mode for research and audit work.
- Require approval previews before creating issues, branches, commits, pull requests, or releases.
- Restrict tokens to the target organization or repositories where possible.

## References

- GitHub MCP server: https://github.com/github/github-mcp-server
