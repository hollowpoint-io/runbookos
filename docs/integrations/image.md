# Image Integration

Status: skill-first planned integration. The previous `images plan` command is deprecated by the course correction.

Image generation and manipulation should be handled by skills and provider-native tools until repeated friction proves a first-party package is needed.

## Current Direction

- Put image generation, editing, compression, and provenance rules in `skills/image-generation/SKILL.md`.
- Let Codex use native image generation/editing where available.
- Let Claude use configured external tools or produce a Codex handoff when appropriate.
- Save generated assets under the relevant client `assets/` folder.
- Save prompt, source, provider/model, timestamp, rights notes, and review state with each output.

## Workspace Config

If a user supplies an external image MCP, configure it by command/env name in `runbookos.config.json` or through integration setup. Do not invent a first-party MCP command until the package exists.

## Safety Notes

- Store generated assets under `workspace/clients/<client>/assets/generated/`.
- Keep provenance metadata with each output.
- Do not modify people, logos, or licensed assets unless the customer confirms rights and intended use.
- Require approval before publishing assets to ecommerce, ad, or social platforms.
