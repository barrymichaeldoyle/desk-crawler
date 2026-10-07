# Recap periods: morning stand-up and sprint retro — 2026-10-07

Barry asked that the device never read "Last 12 hours" and only show a recap once its period has ended, suggesting stand-up and retro events for the office theme and offering 8-hour periods. D75 keeps two 12-hour periods a day because the rituals name them and 07:00/19:00 were the times Barry gave.

## Behavior

`recapPeriod(now, utcOffsetSeconds)` is a pure function: it finds the most recent 07:00 or 19:00 in the owner's local time at or before `now` and returns `{ label, from, to }` for the twelve hours ending there. The 07:00 boundary is the **Morning stand-up** (the night, 19:00 to 07:00) and shows until 19:00; the 19:00 boundary is the **Sprint retro** (the day, 07:00 to 19:00) and shows until the next 07:00. The Convex payload query reads the bounded `tickLogs` range for exactly that period and `buildPayload` labels it from the same function, so the window and its label cannot disagree. `recap.from`/`to` carry the period's UTC seconds; the `· partial` suffix is unchanged.

The screen route now parses `trmnl[user][utc_offset]` before the payload query and passes it in (it already drove story times and the scene's sky); without one the boundaries are UTC. The companion's device preview sends the browser's offset, so the owner sees the same period their device shows. Preview fixtures sit inside the period the preview clock falls in (10:20 Johannesburg: the stand-up that ended at 07:00, 05:00 UTC).

## Local verification

- Typechecks and **294 tests / 43 files** pass. New tests cover the period choice at 06:59, 08:00 and 19:00 UTC with no offset, in Johannesburg (UTC+2) and Honolulu (UTC−10) across the local-day boundary; the half-open window at both ends; the retro label after 19:00; the payload's `from`/`to`; and the Convex read path with and without an offset (48 rows in the stand-up with no offset, 41 with Johannesburg's, an empty retro at 20:00, boundary and later rows excluded).
- Official TRMNL markup lint passes; 276 renders identical in liquidjs and Ruby Liquid.
- **768 settled recap previews** (32 states × four layouts × OG/X/BWRY × landscape/portrait) with the new labels pass the same headless sweep as D74: no element outside its view or past the title bar, no unclamped text overflow (the longer "Morning stand-up · partial" label included), every story list fitted completely.

## Rollout state

Pushed with the D74 template as one production deployment; see the decision record for the build outcome.
