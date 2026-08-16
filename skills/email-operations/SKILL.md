# Email Operations

Use this skill for Gmail inbox review, email draft preparation, and approval-backed outbox work.

## Use When

- Use this skill when reviewing or triaging the Gmail inbox.
- Use when drafting a reply to an existing email thread.
- Use when preparing outbound drafts through the approval-backed outbox.
- Use when recording draft and approval artifacts after email work.
- Do not use for building lead lists or first-touch outreach pipelines — use lead-generation.
- Do not use for long-form client content that happens to be delivered by email — use content-writing, then return here to draft.

## Research Phase (always first)

1. Search for the thread with `gmail.search` and read every message's metadata and snippets with `gmail.message_metadata`. Never draft a reply without reading the full thread.
2. Check `outbox/gmail/` and `outbox/approvals/` for existing drafts or pending approvals on the same thread. Do not create duplicates.
3. When the email concerns client work, read the relevant context under `workspace/clients/<client>` before drafting.

If research contradicts the task's premise, stop and report before continuing.

## Draft Workflow

1. Prepare a structured draft artifact under `outbox/gmail/`.
2. Prepare a matching approval preview under `outbox/approvals/`.
3. Update daily memory with the draft and approval paths.
4. After approval, create the Gmail draft with `gmail.draft_create`.
5. Record the Gmail draft id back into the draft artifact.

## Effort & Model Tiers

- Inbox scanning and metadata triage: `fast`.
- Routine drafts on known threads: `balanced` (manifest default).
- Sensitive replies, negotiations, anything client-facing with judgment calls: `deep`.
- Effort modes: quick = `fast` + minimal scope; standard = manifest tier; deep = `deep` + full research phase + verification evidence alongside the draft artifact.

## Approval Boundaries

Autonomous:

- inbox search and review via `gmail.search` and `gmail.message_metadata` — read tools return metadata and snippets only, unless a future skill revision explicitly expands scope
- preparing draft artifacts under `outbox/gmail/` and approval previews under `outbox/approvals/`
- daily memory updates

Approval required:

- Gmail draft creation via `gmail.draft_create` — only after the matching local approval preview is approved
- any other external email action

Never:

- send email. Sending is not implemented; do not imply that RunbookOS can send.
- write credentials to workspace files. OAuth client secrets, refresh tokens, access tokens, and mailbox addresses stay in runtime env or a secret manager.
