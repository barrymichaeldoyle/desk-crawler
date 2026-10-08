# OG and BWRY full layouts — 2026-10-08

Barry said that, with the X full landscape and portrait done, the TRMNL OG and BWRY versions looked severely unimpressive by comparison (D94). Template v39 brings the OG-sized full layouts closer to the X and gives the BWRY panel its red and yellow inks. The X layouts do not change.

## Behavior

- **Full landscape (OG/BWRY):**
  - The scene uses the existing 3x image (`scene_url_medium`, 456x120) instead of the 2x one. It shares its row with a five-row board under the "This week · Lv 4-7" rule. A hero ranked below the board takes the fifth row.
  - A full-width rune rule separates the scene from the stories.
  - The stories span the screen. Each older story is one line, with the X's XP, gold and HP columns before the time. The newest story keeps the larger font, with its changes and time on the line below. The stacked chip rows are gone, so older stories keep their bold names.
  - A full bag replaces the stories with its panel, and the board stays beside the scene.
- **Full portrait (OG/BWRY):**
  - The 3x scene fills the 460-pixel width, and the standing QR hangs in its top-right corner, as on the X.
  - The board shows six rows in two columns (1-3 beside 4-6). A hero ranked below them takes the sixth row.
- **Both full arrangements:**
  - Gold and potions are named ("640 gold · 4 potions").
  - A gear line under the HUD shows the weapon and armor by the attack and defense marks. Each name clamps on its own.
- **BWRY inks:**
  - TRMNL gives grayscale panels a bit-depth class (`screen--1bit/2bit/4bit`) and ink panels a palette class instead (`screen--color-4bwry`), according to the TRMNL palette docs. So `1bit:`/`2bit:`/`4bit:` variants keep every other panel black.
  - Scenes swap to a four-ink twin, the same URL with `-bwry` before `.png`. The art route serves it as a 2-bit indexed PNG in the panel's exact inks with transparent paper. Sprite interiors take the companion's D87 fills reduced to an ink: reds, browns and purples print red; golds, ambers and greens print yellow; pale, grey and blue fills stay paper.
  - Hearts are red.
  - Lost HP chips have red text, and found-gold chips sit on yellow.
  - The own rank row and the celebration badge are red.
  - Attention lines are red.
  - This applies in every layout, so the half, side and quarter layouts pick up the inks too. Their arrangement is unchanged.
- **No payload change:** the template derives the four-ink URL from the scene URL. `tools/trmnl/preview.ts --inline-art` draws the art locally, so the new art can be previewed before a deployment serves it.

## Local verification

- Typecheck passes and **344 tests** pass. New tests cover:
  - the four-ink route, with every 1-bit ink pixel kept, the palette and transparency, and red and yellow present;
  - the fill reduction;
  - the red hearts;
  - the chip, badge and own-row inks;
  - each board's rows and appended hero.
- The official TRMNL markup lint passes, and 292 renders are identical in liquidjs and Ruby Liquid.
- Headless sweeps (`pnpm sweep:trmnl`, art inlined) over every preview found no overflow, broken image, unfitted story list or recap, or wrapped HUD row:
  - plain mode: **432 previews, 0 failures**
  - recap mode: **816 previews, 0 failures**
- All eight X views of the normal state (four layouts, both orientations) are pixel-identical to v38.
- OG full landscape, normal state: five visible stories with the board beside the scene, compared with four stories and a three-row board in v38. Counts per state are in the [results](og-bwry-full-results.json).

## Rollout state

Deployed from `efc9e65` (pushed to `main`; lint and Workers build passed). The four-ink scene URLs are served by the art route in the same deployment.
