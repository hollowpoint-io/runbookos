# MEMORY.md

Long-term memory for durable decisions, lessons, operating preferences, and context that should survive across sessions.

Keep this file concise. Daily detail belongs in `memory/YYYY-MM-DD.md`; client-specific detail belongs under `workspace/clients/<client>/`.

## How To Use Memory

- Add only durable information that will be useful later.
- Prefer decisions, constraints, preferences, and lessons over raw notes.
- Include dates and enough context for another agent to understand why the memory matters.
- Do not store secrets, access tokens, customer data, private exports, or sensitive personal data.
- When in doubt, write a daily note first and promote only stable facts here.

## Session Wrap-Up Prompt

At the end of meaningful work, update:

1. The relevant client dashboard.
2. Any touched workstream README.
3. `ACTIVE_CONTEXT.md` if the next action changed.
4. `memory/YYYY-MM-DD.md` with what happened, what changed, and what is next.
5. This file only when a durable decision, lesson, or preference was discovered.

## Key Decisions

- YYYY-MM-DD: Decision and reason.

## Lessons Learned

- YYYY-MM-DD: Lesson, where it applies, and what should be done differently next time.

## Project Status

- RunbookOS workspace initialized.

## Preferences Discovered

- Add only durable preferences here.

## Reusable Prompts

### Before Starting Work

- What client, skill, or workspace area is in scope?
- What context files should be read first?
- What output artifact is expected?
- Which tools are enabled, and which actions require approval?
- What could go wrong if stale context or live credentials are used?

### Before External Actions

- Is this action read-only or does it mutate external state?
- Has the user approved the exact action?
- Is there a rollback or preview artifact?
- Are credentials coming from runtime env or a secret manager rather than workspace files?

### Before Finishing

- Did the dashboard, report, memory, and active context stay consistent?
- Are blockers and next actions explicit?
- Did any generated artifact contain private data that should not be committed?
