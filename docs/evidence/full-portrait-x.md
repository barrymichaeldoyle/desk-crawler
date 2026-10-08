# X full portrait polish — 2026-10-08

Barry was happy with the X full landscape and asked for the portrait to be polished. He wanted the top items arranged better, the pixel art spanning the full width, and the QR on the scene's row, more integrated with the art. He also asked for the broken "Elite defeated!" badge to be fixed and for a separator between the stories and the leaderboard (D93). Template v38 implements this.

## Behavior

- Full portrait header: the same as the landscape header.
  - Left: the hero and level with attack and defense, the status, then gold, potions and bag.
  - Right: the hearts with the HP count, the XP ticks with the count, and the gear line.
  - On the X the HUD slot grows from no basis and has a minimum (`lg:w--min-96`) that holds a full hearts row. The row wraps only beside the longest names. The 16-character "WWWWWWWWWWWWWWWW" moves the HUD under the hero. "Sir Staplington" and the long travel status keep it beside the hero, with the gear line on two lines.
  - The OG stacks the HUD under the hero.
- Scene: on the X it uses the existing 5x image (`scene_url`), which is 760 units wide, exactly the portrait content width. The 3x image filled about 60% of the width.
- QR: the standing home code (same target and scale) is set into the scene's top-right corner. It has a 4-unit black frame, close to one art pixel at 5x, so it reads as a sign hung on the wall. On the OG it sits beside the 2x scene without covering it.
  - In every biome the QR covers the rightmost backdrop prop (a rack, a lamp and desk, an arch). The hero (x 24) and subject (x 92) of the 152-pixel stage stay clear of it.
- Leaderboard: the ranking opens with "This week · Levels 4-7" set into a rule (D92's caption), which separates it from the stories.
- Badge: the celebration badge sits in its own row. In the portrait's `flex--stretch-x` column it had been stretched to the full width and squashed to a sliver. The landscape and narrow layouts look the same as before.
- The bag-full panel, the welcome panels and the narrow layouts are unchanged. The stacked weapon and armor slots are removed.

## Local verification

- Typecheck passes and **341 tests** pass. Two HUD tests were updated to match the portrait's new arrangement.
- The official TRMNL markup lint passes, and 292 renders are identical in liquidjs and Ruby Liquid.
- Headless sweeps (`pnpm sweep:trmnl`) over every preview found no overflow, broken image, unfitted story list or recap, or wrapped HUD row:
  - recap mode: **816 previews, 0 failures**
  - plain mode: **876 previews, 0 failures**
- X full portrait story counts compared with v37 ([results](full-portrait-x-results.json)):
  - **One more story:** 14 plain states, because the header is a row shorter than the old stacked header and gear slots, even with the taller scene.
  - **Unchanged:** the rest.
  - **Three fewer stories:** the 16-W name, whose HUD moves under the hero.
  - OG portrait story counts are unchanged.

## Rollout state

Local only. The live TRMNL render, and whether the corner code scans from a physical X with the scene around it, are unverified.
