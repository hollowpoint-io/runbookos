# Skill Format

Each skill lives in its own folder:

```text
skills/<skill-id>/
  skill.json
  SKILL.md
```

## `skill.json`

```json
{
  "id": "shopify-audit",
  "title": "Shopify Audit",
  "version": "0.1.0",
  "triggers": ["shopify audit", "store audit"],
  "modelTier": "balanced",
  "requiredTools": ["shopify"],
  "writesTo": ["workspace/clients/<client>/reports"]
}
```

## `SKILL.md`

Should include:

- Purpose
- Inputs
- Workflow
- Output
- Safety

## Skill Rules

- Skills should be model-neutral.
- Skills should name required tools, not provider-specific tool call names.
- Skills should define where outputs are written.
- Skills should include approval requirements.
