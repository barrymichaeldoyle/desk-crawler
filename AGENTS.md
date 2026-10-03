# Desk Crawler project instructions

The user-provided workspace instructions remain applicable. These instructions add project-specific guidance.

## Current phase

Implementation authorized by Barry on 2026-10-03. Work follows the work packages and gates in `docs/`. Creating or changing external resources (Convex/Clerk/Cloudflare projects, DNS, TRMNL plugin registration), deploying, sending email and publishing still need explicit confirmation for each action.

## Read before working

1. `README.md` and `docs/README.md`.
2. `docs/decisions.md`: confirmed decisions outrank proposals and the source brief.
3. The authoritative docs listed in your assigned work package.
4. `.agents/skills/trmnl/SKILL.md` for TRMNL work, then its relevant references.

Use current official platform documentation when local skills or older examples disagree. The Clerk TanStack skill includes legacy Vinxi guidance: the selected architecture uses the current Vite-based TanStack Start integration on Cloudflare Workers.

## Implementation conventions, once authorized

- Convex owns game state, scheduling, authorization, and transactional state changes.
- Keep the simulator pure, deterministic, and versioned. No network calls or wall-clock reads inside it.
- Clients submit intents, never authoritative stats or rewards.
- Use bounded reads/writes. No global ranking scans during polling or companion queries.
- Publish Top 5, total population, and individual ranks from the same immutable leaderboard generation.
- Distinguish plugin installations from physical devices. A hero advances independently of device count and polling.
- Treat TRMNL tokens as read-only installation credentials. Clerk authentication governs game mutations.
- Add only fields used by the current release. Use additive migrations for future systems.
- Update contracts, tests, and docs when behavior changes. Explain differences from proposals.
- Preserve player progress across continuous releases. Never reset production for a balance patch.

## Collaboration

Work packages are ready for future assignment. Do not start agents solely because a package exists. When delegation is requested, assign explicit file ownership and dependencies; do not let multiple agents edit schema, contracts, or lockfiles simultaneously.

Do not send emails, contact TRMNL reviewers, publish marketplace entries, or deploy based only on this plan. Prepare reviewable artifacts first and follow the user's authorization for the actual action.

## Validation

During planning, validate local links, fixture JSON, cross-document consistency, and skill provenance. During implementation, follow `docs/quality.md`. Mock tests do not replace the required live TRMNL installation/render check.

<!-- convex-ai-start -->

This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read
`convex/_generated/ai/guidelines.md` first** for important guidelines on
how to correctly use Convex APIs and patterns. The file contains rules that
override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running
`npx convex ai-files install`.

<!-- convex-ai-end -->
