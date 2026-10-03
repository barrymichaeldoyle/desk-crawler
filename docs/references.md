# Primary references and skill provenance

Research date: 2026-10-03. These support platform behavior; gameplay constants and architecture tradeoffs are proposals. Recheck current docs in the implementation spikes.

## TRMNL

| Source | Use |
| --- | --- |
| [Official agent skills](https://github.com/usetrmnl/trmnl-agent-skills) | Workflow/framework reference bundle |
| [Marketplace introduction](https://docs.trmnl.com/go/plugin-marketplace/introduction) | Recipe versus Third Party |
| [Plugin types](https://help.trmnl.com/en/articles/10546870-compare-custom-plugin-types) | Public installation alternatives |
| [Plugin creation](https://docs.trmnl.com/go/plugin-marketplace/plugin-creation) | Registration and refresh selection |
| [Installation](https://docs.trmnl.com/go/plugin-marketplace/plugin-installation-flow) | Code/token exchange, callback, one-shot success event |
| [Screen generation](https://docs.trmnl.com/go/plugin-marketplace/plugin-screen-generation-flow) | Form POST, bearer/UUID, timeout, four keys, merge variables |
| [Management](https://docs.trmnl.com/go/plugin-marketplace/plugin-management-flow) | JWT/JWKS/audience/UUID/expiry |
| [Uninstall](https://docs.trmnl.com/go/plugin-marketplace/plugin-uninstallation-flow) | Instance teardown |
| [Going live](https://docs.trmnl.com/go/plugin-marketplace/going-live) | Submission/review/demo |
| [Private plugins](https://help.trmnl.com/en/articles/9510536-private-plugins) | Comparison; not selected launch path |
| [Framework source](https://github.com/usetrmnl/trmnl-framework) | Current framework and asset licenses |

The pasted `/go/public-plugins` link was not the working current guide. The connected `APIEndpointsSearchTool` searches third-party data APIs, not TRMNL's own protocol.

### Installed skill

- Local [`.agents/skills/trmnl/SKILL.md`](../.agents/skills/trmnl/SKILL.md).
- Source: `usetrmnl/trmnl-agent-skills`, `skills/trmnl`.
- Version metadata: 0.2.0; framework family v3.
- Main commit at install: `3c631171a914551eeb0bdf5222240643393a1697`, 2026-09-29.
- Verified Git blob hashes of the installed skill and all three references against that exact commit.
- References: `agent_prompt.md`, `template_guide.md`, `framework_v3_guide.md`.
- Project-local install through skill-installer. No global directory or TRMNL account changed.
- MIT; reproduced in [notices](third-party-notices.md).

The supplement has an older “currently v3.0.3” label while the guide includes later features. The bundle is workflow/reference material, not proof of latest framework version. Verify actual runtime/classes during the live spike and resolve any conflicting image/icon advice with current official docs/screenshots.

Skill discovery is available next turn; we manually read/applied it in this turn. Refresh by recording a new upstream commit and reviewing changes, not hand-editing vendor references.

## Convex

| Source | Use |
| --- | --- |
| [Cron jobs](https://docs.convex.dev/scheduling/cron-jobs) | UTC recurrence and invoked-function non-overlap |
| [Scheduled functions](https://docs.convex.dev/scheduling/scheduled-functions) | Atomic scheduling, retries/status |
| [Pagination](https://docs.convex.dev/database/pagination) | Opaque bounded cursor pages |
| [Indexes](https://docs.convex.dev/database/reading-data/indexes) | Compound ordering |
| [HTTP actions](https://docs.convex.dev/functions/http-actions) | `.convex.site`, parsing/prefix routes |
| [Clerk](https://docs.convex.dev/auth/clerk) | Auth provider integration |
| [Limits/usage](https://docs.convex.dev/production/state/limits) | Resource measurements and subscription headroom |
| [Backup and restore](https://docs.convex.dev/database/backup-restore) | Daily/weekly backup retention, Pro entitlement and excluded code/configuration/scheduled functions; D27 recovery baseline |

Batch sizes are starting points, not claimed platform maxima. Recheck numeric limits against the selected plan/runtime; summary pages can differ.

## App and hosting

- [Cloudflare TanStack Start](https://developers.cloudflare.com/workers/framework-guides/web-apps/tanstack-start/): current Vite-based Workers integration.
- [Clerk TanStack quickstart](https://clerk.com/docs/tanstack-react-start/getting-started/quickstart): current SDK setup.
- [Clerk webhooks overview](https://clerk.com/docs/guides/development/webhooks/overview): asynchronous delivery, retries, duplicate/out-of-order events and deletion reconciliation.
- [Clerk webhook verification](https://clerk.com/docs/reference/backend/verify-webhook): verify signed provider events before trusted mutations.
- [Workers pricing](https://developers.cloudflare.com/workers/platform/pricing/): incremental hosting costs.

Local planning skills used: discovery/installer, Cloudflare, Clerk router/TanStack. The local Clerk skill references legacy Vinxi; current Vite-based docs take precedence. The current quickstart includes provisioning guidance; no setup command was run during planning.

## Limits of this research

No live TRMNL installation/account mutation/render, Convex deployment, Clerk application selection or subscription dashboard inspection happened. Protocol facts are sourced; actual compatibility, instance behavior, performance and balance remain named verification gates.

## Planning review source refresh — 2026-10-03

Rechecked marketplace pages above and these official sources:

| Source | Clarification |
| --- | --- |
| [Refresh behavior](https://help.trmnl.com/en/articles/10113695-how-refresh-rates-work) | On-demand section supersedes historical asynchronous guidance |
| [Sleep](https://help.trmnl.com/en/articles/11129379-sleep-mode) | Device fetch pause/retained image, independent of hero pause |
| [Mashups](https://help.trmnl.com/en/articles/10168132-mashups) | Playlist composition, preview and compact-render troubleshooting |
| [Framework releases](https://trmnl.com/framework/releases) | Current listed 3.4.0 dated 2026-09-28; preview pin differs from hosted runtime |
| [Responsive](https://trmnl.com/framework/docs/3.4/responsive) | Model classes, orientation and bit-depth variants |
| [Image](https://trmnl.com/framework/docs/3.4/image) | Platform dithering versus local preview and prepared bitmap art |
| [Progress](https://trmnl.com/framework/docs/3.4/progress) | Documented numeric fill-width exception to older blanket style ban |
| [Title bar](https://trmnl.com/framework/docs/3.4/title_bar) | Sibling of layout; compact mashup presentation |
| [Glyphs](https://trmnl.com/framework/docs/3.4/font_glyphs) | Selected-font inventory, not arbitrary Unicode support |

Current official instructions take precedence under [AGENTS.md](../AGENTS.md). Vendor text stays unmodified; older version/monochrome-only statements do not guarantee current capabilities. This project's monochrome-first choice remains.

Rechecked local Git blobs against the GitHub tree at recorded commit `3c631171a914551eeb0bdf5222240643393a1697`:

| File | Git blob SHA-1 |
| --- | --- |
| `SKILL.md` | `7fdac592c6ecff22fec30fecef4875b466df0152` |
| `references/agent_prompt.md` | `00a18b3a7b7259a2f1d9edf489d558f46392fe56` |
| `references/template_guide.md` | `461a514ae752959afb1c74779c0e25879d52abf7` |
| `references/framework_v3_guide.md` | `4f9e1513fb21c882b2d820dc6b5c043532ac295e` |

This proves provenance, not live compatibility. [Review](history/review-2026-10-03.md) separates facts, proposals and remaining evidence.

## Creator Fund source refresh — 2026-10-03

[August 2026 report](https://trmnl.com/blog/creator-fund-08-2026) and [fund announcement](https://trmnl.com/blog/creator-fund) support the current revenue assumptions in [monetization](monetization.md). They do not establish this Third Party game's eligibility, a fixed rate per download or sustainable costs. V10 remains open.
