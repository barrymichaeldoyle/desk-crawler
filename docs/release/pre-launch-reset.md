# Pre-launch game reset and single-catalog release (D63)

One-off, before marketplace submission. Each production step below needs Barry's explicit approval at the time it runs. Never run the reset after public launch.

## Why two deployments

The single-catalog release requires every hero to have a `bagCapacity` and every run and publication to have `paginationVersion`, D65's nine achievement counters are optional and backfilled, so they need no reset. Convex refuses to deploy a schema that existing documents do not satisfy, and production still holds pre-ladder heroes and older runs. So the reset deploys and runs first, on today's schema, and the cleanup deploys afterwards onto empty gameplay tables.

## What the reset keeps and deletes

`resetGame.start` deletes `heroes`, `items`, `tickLogs`, `heroScoreWindows`, `rankInputs`, `heroRanks`, `leaderboardGenerations`, `leaderboardPublications`, `simulationFailures`, `operationalIncidents` and `simulationRuns`. It then clears hero pointers on game profiles and users and pins the world to `activeContentVersion: 'v1'`.

It keeps users, game profiles, Desk keepsakes, TRMNL grants, instances and install attempts, revocations, receipts, rate limits and the audit log. It pauses ticks while it works and restores the previous setting when done. It writes `adminAuditEvents` rows for start and completion (`completed:<rows deleted>`). It refuses while a run is active.

## Steps

1. **Back up.** Confirm today's daily backup exists in the Convex dashboard, or take a manual backup of `exciting-cormorant-948`.
2. **Commit A: reset only.** On top of the current `main` tip, commit only `apps/backend/convex/resetGame.ts`, `tests/convex/reset-game.test.ts` and the `resetGame` lines in `apps/backend/convex/_generated/api.d.ts`. Check it in a clean worktree at that commit: `pnpm check`.
3. **Deploy A.** From that clean worktree: `pnpm build:deploy` with the production deploy key. The schema is unchanged, so this push only adds the reset functions.
4. **Run the reset.**
   ```sh
   npx convex run resetGame:start '{"confirm":"RESET DESK CRAWLER BEFORE LAUNCH"}' --prod
   ```
   Wait for the scheduled steps to finish. In the dashboard: `heroes`, `items`, `tickLogs` and `simulationRuns` are empty, `worldState.activeContentVersion` is `v1`, `ticksPaused` is back to its earlier value, and the newest `adminAuditEvents` row reads `completed:<n>`.
5. **Do not install or create heroes** until step 7. Today's code would create a pre-ladder hero, and deploy B would then refuse that document.
6. **Commit B: the cleanup.** Commit the remaining changes (single catalog, bag ladder, compatibility removal, docs). This commit also deletes `resetGame.ts` and its test, so the reset can never run on the released game. Then run `pnpm check`.
7. **Deploy B.** `pnpm build:deploy`, then `pnpm deploy:web` for the companion. The Convex push confirms that the empty tables satisfy the stricter schema.
8. **Verify.**
   - Reinstall the plugin, then Save and Configure.
   - The new hero has `bagCapacity: 6` and a Paper Bag on the Bag page.
   - The Tote Bag arrives within about eight ticks.
   - The device renders and natural ticks complete.
   - Record the outcome in the release evidence.

## Rollback

Before step 4, rolling back means redeploying the previous commit. After step 4, the deleted gameplay data can only come back from the backup in step 1, and only together with the previous code. The reset was approved as a deliberate loss of pre-launch progress, so prefer fixing forward.
