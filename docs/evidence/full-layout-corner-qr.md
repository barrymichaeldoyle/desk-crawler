# Night and Day recaps, the corner QR and the bag-full panel — 2026-10-07

Barry asked how day and night worked. The office sky switched at 06:00/18:00 and the recap at 07:00/19:00, and he chose to align them on the recap's hours and rename the recaps (D84). From a live X screenshot he then asked for a smaller corner QR to the companion home, a bag-full panel over the stories, wider stories, attack and defense beside the level, the bag count beside the potions, and more space between recap facts (D88). Template v36 implements both.

## Behavior

- `DAY_START_HOUR` (7) and `NIGHT_START_HOUR` (19) in `activityRecap.ts` drive both the recap periods and `sceneTimeAt`. The images and URLs are unchanged.
- `recap.label` is `Night recap` (19:00-07:00, shown 07:00-19:00) or `Day recap` (07:00-19:00, shown 19:00-07:00). The help page says the same.
- In every view, the recap row's facts sit a medium gap apart (it was small).
- Full layout, landscape and portrait:
  - The attack and defense marks follow the name and level, and the hearts row ends at the HP count.
  - In the landscape, gold, potions and bag sit under the hero: marks on the OG, named counts on the X. In the portrait they follow the XP count.
  - A small unlabelled code to `/app/desk-crawler` (`home_qr_base`) sits in the top-right corner, at a new served scale 2 on the OG (66 px) and 3 on the X.
  - The "Your bag" column is gone. The landscape gives the stories 8 of 12 columns and the ranking 4.
  - With a full bag (`qr_base` set), a panel replaces the stories and ranking. It reads "Bag full" and "Adventures are paused until you make room.", with the label and a 3/5-scale code to the bag. The corner code is hidden.
- `companion_qr_base` still means the bag, for cached v35 screens and for the half and quarter layouts, which are otherwise unchanged.

## Local verification

- Typechecks pass and **335 tests** pass. The QR test decodes every served scale, including 2, with jsQR.
- The official TRMNL markup lint passes, and 292 renders are identical in liquidjs and Ruby Liquid.
- **1,752 settled previews** (876 plain and 876 recap states) were checked against art served locally from this tree:
  - Nothing overflows, every story list and recap row fits, and no images are broken. The only image failures came from stale plain-state files that still pointed at the deployed origin, which did not yet serve scale 2.
  - Three X full previews (sleeping, stale, travelling) reported a scene overflow once and passed on a rerun of all 39 X full previews.
- Story counts against the v35 sweep ([recap icons](recap-icons-results.json)):
  - **X full landscape:** more stories in 9 plain and 15 recap states.
  - **Full portrait:** a few more stories.
  - **Full bag:** shows the panel instead of its one story.
  - **OG full landscape:** one story fewer where the newest story or a notice takes two lines (choice, merchant, milestones, elite, level-up, long text). Its left header column is one row taller.
  - **Half and quarter views:** some lose one story, because the wider recap gap wraps the recap sooner.
  - These counts also include the parallel D85 travel change in the same commit.

[Results](full-layout-corner-qr-results.json) record per-preview story counts and recap fits, with no story text or player identifiers.

## Rollout state

A parallel session committed the code in `b548dc1` (pushed to `main`; lint and Workers build passed at 18:57 UTC) before these records were written. Production therefore serves template v36. The live server render and whether the 2-pixel-module OG code scans from a physical screen are unverified.
