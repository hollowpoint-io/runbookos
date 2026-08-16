# Lead Generation

## Purpose

Build, enrich, qualify, and prepare outreach for ecommerce or service leads.

## Use When

- Use this skill when building or extending a lead list for outreach.
- Use when enriching leads with contact details, store data, or qualification signals.
- Use when auditing top leads to prioritise who gets contacted.
- Use when drafting outreach or follow-up messages from the leads pipeline.
- Do not use for replying to existing email threads or inbox triage — use email-operations.
- Do not use for deep analysis of a single named competitor — use competitor-analysis.

## Research Phase (always first)

1. Read `workspace/leads/config.md` — target market, niche filters, exclusions, and outreach policy.
2. Read `workspace/leads/crm.json` and `workspace/leads/results-log.md`. Know which leads already exist, their stage, and past outcomes before building lists or drafting anything. Never re-add or re-contact a lead already in the pipeline.
3. Check `workspace/leads/templates/` for current outreach and follow-up templates. Draft from the template, not from scratch.
4. Confirm market constraints: geography, anti-spam rules, and any niches the config excludes.

If research contradicts the task's premise, stop and report before continuing.

## Stages

1. Build list.
2. Enrich list.
3. Audit top leads.
4. Draft outreach.
5. Check follow-ups.

Each stage should stop for approval before progressing to the next stage unless the user explicitly asks for an autonomous batch.

## Effort & Model Tiers

- List building, scraping, enrichment, dedup: `fast`.
- Qualification, audits, follow-up checks: `balanced` (manifest default).
- Outreach copy and lead-priority judgment calls: `deep`.
- Effort modes: quick = `fast` + minimal scope; standard = manifest tier; deep = `deep` + full research phase + verification evidence in the results log.

## Approval Boundaries

Autonomous:

- build, enrich, dedupe, and score lists
- audit leads and save outreach drafts locally
- update `crm.json` stages and `results-log.md` for work done

Approval required:

- sending outreach — always, per message batch; approval never carries over to the next batch
- changing templates in `workspace/leads/templates/`
- expanding into a market or niche not in `config.md`

Never:

- autonomous sending, under any effort mode or batch instruction
- contacting leads outside the stages above or marked do-not-contact in `crm.json`
- anything the Safety section forbids

## Required Files

- `workspace/leads/crm.json`
- `workspace/leads/results-log.md`
- `workspace/leads/config.md`
- `workspace/leads/templates/`

## Safety

- Do not guess email addresses.
- Do not send outreach without explicit approval.
- Respect market, privacy, and anti-spam laws.
- Record source URLs for extracted contact details.
