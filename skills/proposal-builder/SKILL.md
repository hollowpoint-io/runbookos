# Proposal Builder

## Purpose

Turn research, audit findings, and client context into a professional proposal draft for human review.

This skill should feel specific and commercially useful without inventing guarantees, private case studies, or unsupported numbers.

## Use When

- Use this skill when turning audit or research findings into a client-ready proposal draft.
- Use this skill when scoping services and phases for a prospect.
- Use this skill when re-scoping an existing client for new work.
- Use this skill when a quote needs structure: deliverables, timeline, assumptions, exclusions.
- Do not use for the underlying research — run seo-research or competitor-analysis first and feed the output in.
- Do not use to send the proposal — that goes through email-operations after approval.

## Inputs

- `client`: client slug or prospect slug
- `domain`: website/domain
- `services`: examples: SEO, Shopify development, content, migration, audit, analytics, local SEO
- `budget_range`: optional
- `notes`: optional sales context, pain points, constraints, or call notes

## Research Phase (always first)

1. Read the client/prospect dashboard, call notes, and any existing research before drafting a line.
2. Verify every problem the proposal will claim: check the metric, the page, or the report that proves it. No evidence means no claim — or label it explicitly as an assumption.
3. Pull current-state numbers fresh (domain metrics, traffic, obvious site issues) — stale evidence in a proposal gets caught.
4. Check what has already been quoted or promised to this client in prior proposals and notes — do not contradict it unknowingly.

If research contradicts the task's premise, stop and report before continuing — do not build on a broken premise.

## Workflow

1. Complete the research phase above.
2. Collect or summarize current-state evidence:
   - domain/SEO metrics when available
   - competitor or market notes
   - obvious site/content/store issues
   - relevant operational constraints
3. Map the requested services to the client's actual problems. Do not list generic services if there is no evidence they matter.
4. Draft a proposal under `workspace/clients/<client>/proposals/`.
5. Include assumptions, exclusions, approval requirements, and what is not included.
6. Keep pricing as a draft if pricing was not explicitly provided by the user.
7. Create an approval preview before any sending, publishing, or external sharing.
8. Update the client dashboard with proposal status and next follow-up.

## Proposal Shape

- Executive summary
- Current state and evidence
- Opportunity assessment
- Recommended strategy
- Scope by phase
- Deliverables
- Timeline and milestones
- Investment/pricing notes
- Assumptions and exclusions
- Next steps

## Quality Bar

- Tie every recommendation to a client fact, research point, or clearly labeled assumption.
- Prefer concrete deliverables over vague claims.
- Use realistic timeline language.
- Avoid guaranteed rankings, guaranteed revenue, or unverifiable ROI.
- Keep the tone professional and direct.

## Effort & Model Tiers

- Evidence collection, metric pulls, prior-proposal scanning → `fast`
- Scope, deliverables, and timeline drafting → `balanced`
- Executive summary, strategy narrative, pricing framing → `deep` (manifest default)

Manifest `modelTier` is the default for the skill's core work. Caller effort modes map: quick → `fast` + minimal scope; standard → manifest tier; deep → `deep` + full research phase + verification evidence.

## Approval Boundaries

**Autonomous (no approval needed):**
- Research and evidence gathering
- Proposal drafts under `workspace/clients/<client>/proposals/`
- Dashboard and daily memory updates

**Approval required before execution:**
- Sending or sharing a proposal externally — always, no exceptions
- Final pricing when the user did not provide it
- Moving a draft onto any shared or client-visible system (shared doc, portal, link)

**Never:**
- Send a proposal directly from this skill
- Commit to pricing, timelines, or guarantees the user has not approved

## Safety

- Do not include internal margin/cost data unless explicitly requested.
- Do not copy private client examples into public-facing drafts.
- Mark estimates as estimates.
- Keep credentials out of proposal files.
