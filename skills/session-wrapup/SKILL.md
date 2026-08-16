# Session Wrap-Up

## Purpose

Persist useful context so the next session starts with accurate state.

## Use When

- Use this skill when the user says "wrap up", "done", or ends a working session.
- Use when saving progress before a long-running or risky task.
- Use when dashboards or `ACTIVE_CONTEXT.md` have drifted from what actually happened.
- Do not use for producing client-facing reports or deliverables — run the relevant client skill, then wrap up after.
- Do not use to log outreach or email artifacts — lead-generation and email-operations write their own records.

## Research Phase (always first)

- Check what was actually touched this session: files changed, clients worked, decisions made. Log only that — nothing speculative.
- Skim today's daily log and `ACTIVE_CONTEXT.md` so updates append rather than overwrite.

If research contradicts the task's premise, stop and report before continuing.

## Workflow

1. Create or append to `memory/YYYY-MM-DD.md`.
2. Update touched client dashboards.
3. Update touched workstream READMEs.
4. Update `ACTIVE_CONTEXT.md` with short cross-client status.
5. Add long-term memory only for decisions or facts that will matter beyond this week.

## Effort & Model Tiers

Manifest tier is `fast`; correct for all wrap-ups.
Use `balanced` only when distilling a long multi-client session into long-term memory.

## Approval Boundaries

Autonomous:

- daily log, dashboard, workstream README, and `ACTIVE_CONTEXT.md` updates

Approval required:

- long-term memory entries for decisions the user has not confirmed
- deleting or rewriting prior log entries

Never:

- log work that did not happen, or rolled-back changes as if they shipped
- anything the Safety section forbids

## Daily Log Template

```markdown
# Session Log - YYYY-MM-DD

## What Was Worked On
- 

## Key Decisions
- 

## Client Updates
- 

## Open Threads
- 

## Notes
- 
```

## Safety

- Do not create empty logs for trivial sessions.
- Do not include secrets.
- Keep active context short.
