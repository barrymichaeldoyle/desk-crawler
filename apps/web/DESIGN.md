---
name: Desk Crawler Companion
description: The companion is the game screen; a dark arcade platformer HUD over the hero's own scene, the rest of the page its level select and quest log.
colors:
  arcade-ground: "#15122b"
  window-plum: "#221d44"
  raised-plum: "#2c2650"
  arcade-night: "#0c0a1c"
  cream: "#f4f1ff"
  muted-lilac: "#b9b2e6"
  faint-lilac: "#8d86c0"
  bezel-plum: "#3a3566"
  screen-white: "#ffffff"
  coin-gold: "#ffd166"
  coin-gold-hi: "#ffe08f"
  coin-gold-lo: "#b07a00"
  heart-red: "#e5483b"
  heart-red-ink: "#ff7b72"
  xp-green: "#4fd18b"
  travel-sky: "#5d8fd6"
  travel-sky-ink: "#86c8ff"
  rare-violet: "#a77bff"
  rare-violet-ink: "#c4a6ff"
  cubicle-tan: "#f3d394"
  cafeteria-coral: "#f08a6b"
typography:
  display:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1.25
  headline:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 700
    lineHeight: 1.33
  hud-title:
    fontFamily: "Press Start 2P, ui-monospace, monospace"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.02em"
  hud-label:
    fontFamily: "Press Start 2P, ui-monospace, monospace"
    fontSize: "0.6875rem"
    fontWeight: 400
    lineHeight: 1.6
    letterSpacing: "0.02em"
  small-label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 700
    lineHeight: 1.4
    letterSpacing: "0.06em"
    fontFeature: "tnum"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  body-sm:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
  meta:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 600
    lineHeight: 1.33
    fontFeature: "tnum"
rounded:
  none: "0px"
  screen: "0.375rem"
  bezel: "1.4rem"
spacing:
  xs: "8px"
  sm: "12px"
  md: "16px"
  lg: "20px"
  xl: "32px"
  control: "44px"
  nav: "52px"
components:
  button-primary:
    backgroundColor: "{colors.coin-gold}"
    textColor: "{colors.arcade-night}"
    typography: "{typography.hud-label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.coin-gold-hi}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.cream}"
    typography: "{typography.hud-label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.arcade-night}"
  button-quiet:
    textColor: "{colors.muted-lilac}"
    typography: "{typography.body}"
    padding: "8px 16px"
    height: "44px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.heart-red-ink}"
    typography: "{typography.hud-label}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.heart-red}"
    textColor: "{colors.arcade-night}"
  window:
    backgroundColor: "{colors.window-plum}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "12px 16px 16px"
  window-title:
    textColor: "{colors.cream}"
    typography: "{typography.title}"
  hud-nav:
    backgroundColor: "{colors.arcade-night}"
    textColor: "{colors.muted-lilac}"
    typography: "{typography.hud-label}"
    height: "52px"
  hud-nav-active:
    textColor: "{colors.coin-gold}"
  segmented-tab:
    textColor: "{colors.muted-lilac}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  segmented-tab-active:
    backgroundColor: "{colors.raised-plum}"
    textColor: "{colors.coin-gold}"
  hud-box:
    backgroundColor: "{colors.arcade-night}"
    textColor: "{colors.cream}"
    typography: "{typography.small-label}"
    rounded: "{rounded.none}"
    padding: "10px 12px"
  dialogue-strip:
    backgroundColor: "{colors.cream}"
    textColor: "{colors.arcade-night}"
    typography: "{typography.hud-label}"
    padding: "12px 36px 12px 12px"
  away-tally:
    backgroundColor: "{colors.arcade-night}"
    textColor: "{colors.cream}"
    rounded: "{rounded.none}"
    padding: "16px"
  log-badge:
    textColor: "{colors.arcade-night}"
    size: "32px"
  world-tile-locked:
    backgroundColor: "{colors.window-plum}"
    textColor: "{colors.muted-lilac}"
    rounded: "{rounded.none}"
    padding: "16px"
  device-bezel:
    backgroundColor: "{colors.bezel-plum}"
    rounded: "{rounded.bezel}"
    padding: "clamp(0.5rem, 2.5vw, 1rem)"
  device-screen:
    backgroundColor: "{colors.screen-white}"
    rounded: "{rounded.screen}"
---

# Design System: Desk Crawler Companion

## Overview

**Creative North Star: "The Game Screen"**

The companion is not a dashboard about a game; it is the game's own screen. The hero page opens on the hero's real scene, the same 1-bit art the TRMNL draws, multiplied over its biome's colour bands so the ink stays crisp and the paper takes the colour, with a platformer HUD laid over it: a party box (portrait, half-heart health, XP bar, ATK and DEF), a coin counter and a next-adventure timer, and a cream dialogue strip saying what is happening. Everything below is the level select and quest log around that screen: commands, a three-tile world map, the "While you were away" tally, the TRMNL preview, a badge-coded quest log and records.

The ground is a dark arcade screen. Panels sit one step lighter inside a hard 3px black outline. Game colours mean one thing everywhere: hearts red, XP green, coins gold, travel sky, rare violet. Arcade lettering (Press Start 2P) is reserved for the HUD voice: labels, nav, counters, buttons and the dialogue line, always small and uppercase. Pixelify Sans titles the page and its sections; the system sans carries every sentence so reading stays fast. The world is dark only.

The TRMNL is the one monochrome object. It sits in a plum bezel with a white e-ink screen showing the device's own framework templates; the companion's colour stops at its edge. Motion is scarce and stepped: the dialogue arrow's two-step bob, the e-ink refresh flash, and sheets and notices stepping into place in four frames.

**Key Characteristics:**
- Dark arcade ground, plum windows in 3px night outlines, cream text; dark theme only.
- The hero's scene leads, in colour, under a platformer HUD and a cream dialogue strip.
- Hearts red, XP green, coins gold, travel sky, rare violet; never colour alone.
- Press Start 2P for the HUD voice at two small steps; Pixelify Sans for titles; system sans for reading.
- Gold primary buttons with a darker bottom lip; dashed edges stamp locked and disabled states.
- Square everything; only the TRMNL bezel and screen curve.
- Pixel parts drawn as crisp SVG cell grids; pixel art rendered pixelated at integer scale.

## Colors

An arcade palette: a dark plum-black screen, one lighter window step, cream lettering, and five game colours that each carry one meaning.

### Primary
- **Coin Gold**: the primary action fill, coins and gold earned, levels, the current-place marks (pixel cursor arrow, select chevron, current world tile outline, own leaderboard row outline, the away tally's frame), the focus ring, text selection and form accent colour. Coin Gold Hi is the primary button's hover step; Coin Gold Lo is the primary button's bottom lip and the coin's shaded centre.

### Secondary
- **Heart Red**: heart fills, the danger button edge and hover fill, the destructive-disclosure rule. Heart Red Ink is its text tone and the combat and knock-out badge fill: HP changes, losses against equipped gear, rank drops, errors. A piece's own attack figure stays in cream; only a comparison is coloured.
- **XP Green**: the XP bar fill, XP and HP-gain text, rest and revive badges, upgrades, uncommon rarity, rank gains, the countdown figure. It reads as its own ink on the dark ground.

### Tertiary
- **Travel Sky**: the Server Room band and world tile. Travel Sky Ink is the travel badge.
- **Rare Violet**: rare things. Rare Violet Ink names rare gear, counts potions and items found, and fills the trap badge.

### Neutral
- **Arcade Ground**: the page, and the opaque fill behind sticky day headers.
- **Window Plum**: every window panel and the locked world tile.
- **Raised Plum**: the HUD nav's bottom bar, the pressed segmented cell, empty heart halves, the XP-meter outline, hairline row rules and dashed ledger rules.
- **Arcade Night**: outlines (windows, game screen, HUD boxes, badges, world-number chips), the HUD nav fill, the away tally fill, and text on gold, cream and biome tiles.
- **Cream**: all text on the dark ground, control edges, the portrait frame and XP-bar edge, the dialogue strip fill.
- **Muted Lilac / Faint Lilac**: secondary text and inactive nav; locked, disabled and zero values.
- **Bezel Plum**: the TRMNL bezel, and the detail line inside the cream dialogue strip.
- **Screen White**: the e-ink screen inside the bezel; nowhere else.

### Biome Bands
Each biome's game screen is four bands (ceiling, upper wall, wall, floor in an 18 / 14 / 40 / 28% grid), and its world-map tile wears the upper-wall band: Office Cubicles in carpet tan (Cubicle Tan, bands #e7b96f, #f3d394, #fbe9c2, #c98f5a), Server Room in status-LED blue (Travel Sky, bands #5d8fd6, #78a9e4, #9fd0f0, #ffd166), Cafeteria Depths in ketchup coral (Cafeteria Coral, bands #f08a6b, #f9b394, #ffd9c2, #d9534f). The floor band carries a 6px night rule at 25% opacity.

### Named Rules
**The One Meaning Rule.** Each game colour means one stat everywhere: red is health and harm, green is XP and recovery, gold is coins and the current choice, sky is travel and defence, violet is rare. A new surface reuses these meanings; it does not invent a sixth.

**The Never Colour Alone Rule.** Every coloured mark also carries a glyph, a sign, a label or a shape: log kinds sit in glyph badges, changes carry their sign and unit, rarity has a gem whose facets grow, biomes carry their name and number, hearts fill by half-heart shape.

**The Ink-On-Dark Rule.** Text on the dark ground uses a stat's ink tone (heart-red-ink, travel-sky-ink, rare-violet-ink); the raw fill is for bars, hearts, tiles and button fills.

## Typography

**Display Font:** Pixelify Sans (self-hosted woff2, 400 to 700, SIL OFL 1.1), falling back to the system sans
**Body Font:** system UI sans stack
**Label/Mono Font:** Press Start 2P (self-hosted woff2, 400, SIL OFL 1.1), the HUD voice

**Character:** Press Start 2P is the game talking: small, uppercase, on an 8px grid. Pixelify Sans is the level-select signage over each section. The system sans is the owner reading.

### Hierarchy
- **Display** (700, 3rem, 2.25rem below 640px, 1.25): the landing page title only.
- **Headline** (700, 1.875rem, 1.2): page titles (Your bag, Rankings, Settings) and hero-page section titles (World map, On your TRMNL, Quest log, Records).
- **Title** (700, 1.5rem, 1.33): window titles and world-tile biome names.
- **HUD Title** (Press Start 2P, 0.875rem, 1.6, uppercase): the hero's name and level, the away tally heading, its figures, the countdown and top-three ranks.
- **HUD Label** (Press Start 2P, 0.6875rem): buttons, nav from 640px, the dialogue sentence, world-number chips.
- **Small Label** (`label-px`: system sans, 0.75rem, bold, uppercase, tabular figures): stat labels in ledgers, HP/XP/ATK figures in the party box, gain chips, log filters, day headers. Both pixel faces blur their figures below 16px (Pixelify's 2 reads as 8), so small print never uses them.
- **Body** (400, 1rem, 1.5): sentences, log narrative, item and player names (semibold for names). Long prose holds to the reading measure.
- **Body Small** (400, 0.875rem): notes under commands, captions, secondary lines.
- **Meta** (600, 0.75rem, tabular): log timestamps (regular weight) and change chips.

### Named Rules
**The Two Steps Rule.** Press Start 2P runs only at 0.6875rem for nav and buttons and 0.875rem or larger for HUD headings and counters; it is always uppercase and never sets a sentence the owner must read at length. Smaller labels and figures use Small Label.

**The Ledger Figure Rule.** Every number that can change sits in tabular numerals so counts and countdowns do not jitter.

## Layout

The HUD nav is sticky at the top, 52px tall, its tabs equal-width. The hero page uses a 72rem container; Bag, Rankings and Settings use 48rem; the landing page 42rem. Pages pad 16px at the sides and stack sections 32px apart.

The hero page reads top to bottom: the full-width game screen, the command row and its note, the world map (three tiles in a row from 640px, joined by dashed gold connectors), then from 1024px two columns (1fr and 1.1fr, 32px gap): the away tally and TRMNL preview on the left, the quest log and records on the right. On phones the HUD boxes stack above the scene so they never cover the art, and the scene crops at 4x around the hero and foe; wide screens draw it at 7x between full-width bands.

Windows pad 12px top, 16px sides and bottom (20px sides from 640px), 12px from title to content. Ledgers go two columns from 480px with 24px between, rows divided by 2px dashed raised-plum rules. Every standalone target is at least 44px. Day headers stick under the nav on an opaque ground. The Bag's sale bar is a window pinned to the bottom with safe-area padding while gear is being selected, and the Bag's sheets and notice are pinned the same way.

## Elevation & Depth

Flat, with depth drawn as an 8-bit screen draws it: a panel sits above the ground because it is a step lighter inside a hard night outline; HUD boxes float over the scene as translucent night (85%) inside the same outline; the current thing is marked by a gold outline, not lift. Sticky elements separate by opaque fills and edges, never blur.

### Shadow Vocabulary
- **Button lip** (`box-shadow: inset 0 -4px 0 var(--color-gold-lo)`): the primary button's darker bottom row, pixel shading inside the fill. Removed when disabled.

### Named Rules
**The Drawn Depth Rule.** If something must sit above something else, give it a lighter fill and a night outline, or a gold outline when it is the current choice. Never a blur, glow or drop shadow.

## Shapes

Everything the owner touches is square: windows, buttons, tabs, inputs, tiles, badges, bars. Outlines are hard: 3px for windows, buttons and HUD boxes, 4px for the game screen and the away tally, 2px for inputs, segmented groups and badges. Disabled and locked states switch the edge to dashed, so state stamps rather than fades. The only curves describe the TRMNL hardware.

All glyphs, hearts, coins, gems, cursor arrows, chevrons and checks are SVG cell grids with crisp edges; pixel art renders pixelated at integer scale.

### Named Rules
**The Only Curve Is the Device Rule.** Rounded corners belong to the TRMNL bezel and its screen. Nothing interactive is rounded.

**The Stamp, Don't Fade Rule.** Disabled and locked states keep their shape and gain a dashed edge and muted text; they never vanish or drop to bare low opacity.

## Components

### Buttons
Chunky arcade keys in the HUD voice.
- **Shape:** square, 3px edge, 44px minimum height, 16px by 8px padding, HUD Label type.
- **Primary:** gold fill, night text and edge, gold-lo bottom lip; hover to gold-hi. The decision the game is asking for (Drink potion when hurt, Travel, Claim find, Resume, an upgrade's Equip). Links styled as the primary action reuse it.
- **Secondary:** transparent with a cream edge and cream text; hover inverts to cream fill, night text.
- **Quiet:** muted body-type text underlined at 4px offset; hover to cream. For continuations (load more, unequip, clear selection).
- **Danger:** heart-red edge, heart-red-ink text; hover fills heart red with night text. Destructive confirmations only.
- **Disabled:** dashed faint edge, no fill, no lip, muted text, not-allowed cursor; also applied while offline.
- **Pressed:** the primary key sinks two pixels into its lip (the lip halves); secondary and danger invert as on hover; quiet brightens. A tap answers before the server does.
- **Busy:** the label becomes a present-participle line ("Travelling…"); the shape holds.
- **Focus:** global 2px gold outline, 2px offset.

### Cards / Containers (Window)
- **Corner Style:** square.
- **Background:** Window Plum; stacked log entries are compact windows (12px by 10px).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 3px Arcade Night.
- **Internal Padding:** 12px top, 16px sides and bottom; 20px sides from 640px. A Pixelify title opens a titled window.

### Inputs / Fields
- **Text input and select:** square, 2px cream edge, ground fill, 44px tall, 12px side padding; selects carry a 5x3 gold pixel chevron.
- **Checkbox:** a night box with a 2px cream edge that fills gold with a night pixel tick; dashed when disabled; in a 44px hit area.
- **Disclosure:** a currentColor pixel triangle that turns down when open.
- **Error:** a semibold small sentence in heart-red-ink with role alert.

### Navigation (HUD Nav)
- **Style:** sticky night bar with a 4px raised-plum bottom edge; the gold-tile mark and "Desk Crawler" in gold HUD type at left from 640px; four equal tabs (Hero, Bag, Ranks, Settings), muted HUD Micro (HUD Label from 640px).
- **Active:** gold-ink text with the gold pixel cursor arrow (aria-current); hover to cream.

### Segmented Tabs and Text Filters
- **Segmented tabs:** square cells inside a 2px cream edge, divided by 2px edges; the pressed cell fills Raised Plum with gold text and the cursor arrow. Ranking period, device layout.
- **Text filters:** muted HUD Micro (or body small for the device picker); the pressed option goes gold-ink with the cursor arrow. Quest-log filters, device picker.

### Game Screen (signature)
- **Frame:** 4px night outline; biome bands behind the 1-bit scene in multiply blend.
- **HUD boxes:** night at 85% in 3px night outlines. Party box: 52px portrait in a 3px cream frame; name and gold level; ten 18x16 pixel hearts filling by half-heart; XP bar (10px, 2px cream edge, green fill); ATK and DEF. Opposite: coin counter in gold and the next-adventure box with the countdown in XP green.
- **Dialogue strip:** cream with a 4px night top rule, a 16px glyph, the HUD Label sentence, an optional bezel-plum detail line, and a 5x3 night "more" arrow in the corner bobbing 2px in two steps (1.2s), the only idle motion.

### World Map Tile
- Square tile, 16px padding, 3px night edge, filled with its biome band, night text; a night world-number chip with gold numeral; biome name in Title type; status line; Travel as the primary button. The current tile gains a 4px gold outline; locked tiles are window plum with a dashed faint edge and muted text ("Locked · reach level 9"). Tiles join with 4px dashed gold connectors from 640px; on phones each world is one row (chip, name and status, Travel at the right) with no connectors.

### Stance Row
- The segmented-tab pattern as a radiogroup: three equal cells (Cautious, Balanced, Bold) in a 2px cream edge, the chosen one pressed in Raised Plum with gold text and the cursor arrow; one body-small line beneath names the chosen stance, its blurb and its thresholds.

### Keepsake Strip
- A window strip in a 4px gold outline: a 48px night tile with the design, "New this week" in HUD Label gold, the title in Title type, and Enter code as the primary button; the code form opens beneath a 3px night rule. After a claim the strip names the keepsake and offers Shelf as a secondary button.

### While You Were Away Tally
- Night fill in a 4px gold frame: HUD Title heading in gold, the visit time beside it, then a dashed-rule ledger of HUD Micro labels and HUD Title figures in their stat ink (zero in faint). A 3px gold-edged HUD line counts gains during the visit.

### Quest Log Row
- A compact window: a 32px badge (2px night edge) filled with its kind's game colour holding a night glyph, the narrative sentence beside it (bold names), then the timestamp and change chips in stat inks. Day headers are HUD Micro, sticky.

### Bag Slot
- A square night cell in a 3px edge coloured by rarity (common on Raised Plum, uncommon XP green, rare violet, epic gold), holding the piece's 16x16 icon at 3x (ink in cream, white cells in Raised Plum) with its gem at 2x in the bottom-left corner. Top-right: a green pixel arrow for an upgrade or a muted `L12` level lock on a night tab; top-left in a sale: a 2px cream checkbox that fills gold with a night tick, the edge going gold. A held find wears a gold dashed edge; an empty slot is a dithered cell in a dashed Raised Plum edge; a busy slot dims its icon under a dither. Slots sit in an auto-filling grid of 4.5rem minimum cells (four across on a phone).

### Sheet
- A native modal dialog: a window pinned to the bottom of a phone with safe-area padding, centred at 28rem from 640px, over a 75% night backdrop. Title in Pixelify Sans receives focus; actions in a two-column button grid; Escape, the backdrop and Close dismiss it. Errors raised inside it show inside it.

### Notice
- The latest action's outcome in a pinned window above the phone's bottom edge (lifted above the sale bar): a semibold small sentence in XP green or heart-red-ink with a dismiss cross. Successes clear after five seconds; errors stay. Every page's commands report here (Hero, Bag, Settings); only a form's validation stays beside its input, and an error raised inside an open sheet shows in the sheet.

### Device Bezel
- Bezel Plum, 1.4rem corners, fluid padding; white 0.375rem screen at the device's aspect ratio; the scene stands in until the live template render fades in (200ms), then a six-step black-then-white flash over 420ms when a new screen loads.

## Do's and Don'ts

### Do:
- **Do** lead with the hero's scene in colour under the HUD; it is the companion's first viewport.
- **Do** put grouped content in a window: Window Plum inside a 3px Arcade Night outline.
- **Do** keep each game colour to its one meaning and pair it with a glyph, sign, label or shape.
- **Do** set text on the dark ground in the stat's ink tone, not the raw fill.
- **Do** set HUD labels, nav, counters and buttons in Press Start 2P at its small steps, uppercase.
- **Do** mark the current choice with the gold pixel cursor arrow or a gold outline.
- **Do** keep every control square, hard-edged and at least 44px tall.
- **Do** draw icons, hearts, arrows, checks and chevrons as crisp SVG cell grids, and render pixel art pixelated at integer scale.
- **Do** stamp disabled and locked states with a dashed edge and muted text.
- **Do** keep the device preview 1-bit inside its plum bezel.

### Don't:
- **Don't** add a light theme; the arcade screen is dark only.
- **Don't** set sentences or long prose in Press Start 2P, or labels and buttons in Pixelify Sans.
- **Don't** round buttons, inputs, tabs, windows, tiles or badges; only the bezel and its screen curve.
- **Don't** use drop shadows, blurs or glows for depth; the primary button's inset lip is the only shading.
- **Don't** convey state by colour alone.
- **Don't** fall back to the 1-bit logbook or the navy menu-window recolour; this world replaced both.
- **Don't** add idle motion beyond the dialogue arrow bob and the e-ink refresh; entrances are four stepped frames at most.
