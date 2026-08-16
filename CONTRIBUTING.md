# Contributing

RunbookOS is early. Contributions should keep the project public-safe and provider-neutral.

## Rules

- Do not add real credentials, real client data, or private business context.
- Keep provider-specific behavior inside provider packages or generated adapter files.
- Keep skills portable: use model tiers (`deep`, `balanced`, `fast`) instead of vendor model names.
- Add safety rules to every skill.
- Prefer examples with fake clients and fixtures.

## Local Development

```bash
pnpm install
pnpm -w build
pnpm -w typecheck
```

## Public-Safe Checklist

Before opening a PR:

- Run secret scanning.
- Search for real company names, emails, tokens, and domains.
- Check `git diff --stat` for large data files.
- Confirm examples are fake or explicitly licensed for public use.
