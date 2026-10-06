# Engineering fixes and no-effect labels — 2026-10-06

Barry explicitly approved deploying the tested backend fixes and D53 companion/device polish. The existing production pipeline deployed commit `c8daeaa86e63264a812e563e7a7f948c9d6143b1` from `main`.

- [Workers Build `87561e6a`](https://dash.cloudflare.com/57fa9c5f2bc9dda93a108e887a81b419/workers/services/view/trmnl-games/production/builds/87561e6a-9d47-47f1-b042-33abdcc14b13) succeeded at 07:37:57 UTC, using `pnpm build:deploy` and `pnpm deploy:web`.
- Target: Convex `exciting-cormorant-948`; Worker `trmnl-games` on `trmnlgames.com`.
- Worker deployment `a8c20488-2e45-40a3-9913-f003dcc6b5dd` receives 100% traffic on version `ac63bd4d-8d79-442c-99f0-e01ac8f96e34`, created at **07:37:53.357590 UTC**.
- Fresh pre-push verification passed all workspace/core typechecks and **187 tests / 29 files**. The earlier candidate build and packaging dry run passed; the clean production CI build succeeded as well.
- Production function metadata targets the correct cloud URL and contains no synthetic `reviewValidation` or `engineeringValidation` harness functions.

Before rollout, production tick 195 was completed, there was no active run or blocked deletion job, and all three boards were ready with population 1. After rollout, Baz retained the same hero/owner references, creation time, level and lifetime XP. No reset, manual reward, simulator/content-version switch or gameplay command was performed.

The signed-in companion displays **No effect** on existing zero-delta entries, including “Took a quiet break. Already feeling great.” and “Refilled the water bottle and carried on.” Entries with actual healing still show `+5 HP` or their recorded amount; existing potion finds still show **+1 healing potion**. Labels are derived when reading/rendering retained logs; stored history is not rewritten. The live X side preview was visually inspected: zero-delta rows show `No effect`, normal numerical deltas remain, and metadata stays above the footer. The companion preview uses the current v24 templates and scene v4.

The next natural production tick, **196**, completed at **07:45:06.217 UTC** with pagination version 1, one processed hero and zero quarantined heroes. The world has no active run and remains unpaused, outside maintenance; all three published boards remain ready with population 1. Hero identity and creation time are unchanged, and lifetime XP, level and evaluated tick have not regressed.

The existing TRMNL installation timeline recorded a successful **manual refresh render at 09:42:36 SAST** (07:42:36 UTC), taking **743 ms** for a **25.1 KB** image, followed by **delivery at 09:44:19 SAST**. This establishes server rendering and delivery; no new physical-screen visual inspection is claimed.

Sanitized observations are recorded in [deployment results](engineering-deploy-results.json).

A post-deployment sample of **56 completion records from 07:38:01 to 07:41:05 UTC** had zero errors and zero conflict retries. This is a bounded low-traffic health sample, not a load certification.

The independent checkpoint workflow stays an inactive review template. This release does not change plans, spending limits, numerical tuning, provider identities, listing fields or submission status. Ongoing capture, controlled real-provider checks and funding/tuning decisions remain open in the [engineering report](engineering-readiness.md) and [release checklist](release.md). D43/D46 preview and waiver decisions remain respected.
