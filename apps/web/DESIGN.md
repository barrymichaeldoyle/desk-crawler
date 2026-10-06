---
name: Desk Crawler Companion
description: The game's pause menu; 16-bit navy menu windows on a periwinkle overworld, stats in their game colours.
colors:
  overworld-ground: "#e8ecf9"
  overworld-ink: "#18214f"
  overworld-muted: "#4b5694"
  overworld-faint: "#7d87b8"
  overworld-rule: "#bcc4e9"
  night-ground: "#0b0f2e"
  night-text: "#e8ebfb"
  night-muted: "#a3acdc"
  night-faint: "#6f79ad"
  night-rule: "#272f63"
  menu-navy: "#1e2a6e"
  menu-navy-night: "#1c286c"
  window-cream: "#f6f1de"
  window-lavender: "#b5bdea"
  window-faint: "#8590c9"
  window-rule: "#34418d"
  frame-night: "#0a0f2c"
  bezel-night: "#2b3474"
  screen-white: "#ffffff"
  hp-red: "#e5483b"
  xp-green: "#3dbb6c"
  gold: "#f2c14e"
  gold-hi: "#f8d77f"
  sky: "#4aa8ff"
  rare-violet: "#a77bff"
  hp-ink-day: "#b42318"
  xp-ink-day: "#17733d"
  gold-ink-day: "#85570a"
  sky-ink-day: "#1d5bb8"
  rare-ink-day: "#6b3fd1"
  hp-ink-window: "#ff8a7e"
  xp-ink-window: "#62d891"
  sky-ink-window: "#86c8ff"
  rare-ink-window: "#c4a6ff"
typography:
  display:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "3rem"
    fontWeight: 700
    lineHeight: 1
  headline:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.875rem"
    fontWeight: 700
    lineHeight: 1.2
  title:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  figure:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    fontFeature: "tnum"
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    letterSpacing: "0.04em"
    fontFeature: "all-small-caps"
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
  xxl: "40px"
  control: "44px"
components:
  button-primary:
    backgroundColor: "{colors.gold}"
    textColor: "{colors.frame-night}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.gold-hi}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.window-cream}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.window-cream}"
    textColor: "{colors.menu-navy}"
  button-quiet:
    textColor: "{colors.window-lavender}"
    padding: "8px 16px"
    height: "44px"
  button-danger:
    backgroundColor: "transparent"
    textColor: "{colors.hp-ink-window}"
    rounded: "{rounded.none}"
    padding: "8px 16px"
    height: "44px"
  button-danger-hover:
    backgroundColor: "{colors.hp-red}"
    textColor: "{colors.frame-night}"
  menu-window:
    backgroundColor: "{colors.menu-navy}"
    textColor: "{colors.window-cream}"
    rounded: "{rounded.none}"
    padding: "12px 16px 16px"
  window-title:
    textColor: "{colors.gold}"
    typography: "{typography.title}"
  command-bar:
    backgroundColor: "{colors.menu-navy}"
    textColor: "{colors.window-lavender}"
    height: "44px"
  command-bar-active:
    textColor: "{colors.gold}"
  segmented-tab:
    textColor: "{colors.overworld-muted}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "44px"
  segmented-tab-active:
    backgroundColor: "{colors.menu-navy}"
    textColor: "{colors.gold}"
  meter-track:
    backgroundColor: "{colors.frame-night}"
    rounded: "{rounded.none}"
    height: "16px"
  device-bezel:
    backgroundColor: "{colors.frame-night}"
    rounded: "{rounded.bezel}"
    padding: "clamp(0.5rem, 2.5vw, 1rem)"
  device-screen:
    backgroundColor: "{colors.screen-white}"
    rounded: "{rounded.screen}"
---

# Design System: Desk Crawler Companion

## Overview

**Creative North Star: "The Party Menu"**

The companion is the game's pause menu. Every section is a 16-bit RPG menu window: a navy panel inside a notched two-pixel frame (night outline, cream line), set on a pale periwinkle overworld by day and a night-indigo overworld after dark. Inside the windows the text is cream, secondary text is lavender, and window titles are gold pixel type. Stats wear their game colours: red health, green experience, gold currency, sky-blue travel, violet for rare things and traps. Colour exists to restore hierarchy and state, and it never travels alone: every coloured mark also carries a glyph, a label, a sign or a shape.

Density is menu-like rather than dashboard-like. Facts sit in ruled rows inside a window (a two-pixel cream rule opens the list, hairlines in window-rule divide rows), small-caps labels on the left, bold tabular figures on the right. The one gold choice in a window is the action the game is asking for. The current menu option carries a gold pixel cursor arrow, the way an SNES menu marks where you are.

The TRMNL device is the one monochrome object in the world. It sits in a dark drawn bezel with a white e-ink screen, showing the same 1-bit templates the plugin serves; the companion's colour stops at its edge. Motion is scarce and stepped: the dialogue box's two-step "more" arrow bob, and the six-step e-ink refresh flash when a new screen lands.

**Key Characteristics:**
- Navy menu windows with a notched two-pixel frame, on a periwinkle (day) or night-indigo (dark) overworld.
- Gold for selection, the primary action and currency; red, green, sky and violet for HP, XP, travel and rare.
- Pixelify Sans for names, window titles and headline numbers; system sans for reading.
- Square controls with two-pixel edges; a gold pixel arrow marks the current choice.
- Native controls redrawn as pixel parts: checkbox, select chevron, disclosure triangle.
- Flat; depth is drawn by frames and fills, never by blur.
- The device preview stays 1-bit inside its bezel.

## Colors

A 16-bit game palette: two contexts (overworld ground and menu window) sharing one set of constant game fills, with a readable text tone of each fill per context.

### Primary
- **Menu Navy**: the fill of every menu window, the command bar, and the pressed cell of a segmented control. Shifts very slightly darker in dark mode (Menu Navy Night) so windows still sit above the night ground.
- **Gold**: the single primary action (button fill), selection (cursor arrow, pressed tab text, focus ring inside windows and at night), window titles, currency figures, text selection highlight and form accent colour. Gold Hi is the hover step of the primary button only.

### Secondary
- **HP Red**: health meter fill, combat and knock-out glyphs, HP changes, weapon stat, losses against equipped gear, the danger button and the destructive-disclosure rule.
- **XP Green**: experience meter fill, rest and revive glyphs, XP changes, upgrades, uncommon rarity, rank gains.

### Tertiary
- **Sky**: travel: the "On the way" marker, travel glyphs, armour stat, the Server Room swatch.
- **Rare Violet**: rare item names and gems, trap glyphs, potion counts and changes.

Each fill has an "ink" tone for text. On the day overworld the inks are darkened (HP Ink Day, XP Ink Day, Gold Ink Day, Sky Ink Day, Rare Ink Day) to hold contrast on periwinkle; inside windows and at night they are lightened (HP/XP/Sky/Rare Ink Window, and Gold itself). Text always uses the ink tone of its context, never the raw fill.

### Neutral
- **Overworld Ground / Ink / Muted / Faint / Rule** (day): periwinkle page ground, navy text, slate-blue secondary text, faint locked text, pale rules.
- **Night Ground / Text / Muted / Faint / Rule**: the same roles after dark, on night indigo.
- **Window Cream / Lavender / Faint / Rule**: the same roles inside a menu window. Cream is also the frame's inner line and the edge colour of controls inside windows.
- **Frame Night**: the frame's outer line, meter and checkbox tracks, primary button border and text, swatch outlines, the device bezel by day.
- **Bezel Night**: the device bezel in dark mode, lifted off the night ground.
- **Screen White**: the e-ink screen inside the bezel; nowhere else.

### Named Rules
**The Context Ink Rule.** Ground, ink, muted, faint, rule, edge, focus and every *-ink tone are re-declared inside a menu window. A component uses the role, not the hex, so it reads correctly on the overworld and inside a window alike.

**The Never Colour Alone Rule.** Every coloured mark also carries a glyph, a sign, a label or a shape: rarity has a gem whose facets grow, log kinds have pixel glyphs, changes carry their unit and sign, biomes carry their name beside the swatch.

**The One Gold Choice Rule.** In any window, at most one control is gold-filled: the decision the game is asking for (Drink potion when hurt, Travel, Claim find, Resume). Everything routine is the outlined secondary button.

## Typography

**Display Font:** Pixelify Sans (self-hosted woff2, weights 400-700, SIL OFL 1.1), falling back to the system sans
**Body Font:** system UI sans stack
**Label/Mono Font:** small caps of the body sans; the monospace stack is defined but unused

**Character:** The pixel face is the game's own menu lettering: hero name, window titles, page titles, rank numbers. The system sans carries every sentence, figure and control so reading stays fast and dense.

### Hierarchy
- **Display** (700, 3rem, line-height 1): the hero's name in the page header, once per page. The seven-day rank number uses the same face at 2.25rem in gold.
- **Headline** (700, 1.875rem): page titles on Bag, Rankings and Settings, set on the overworld ground.
- **Title** (600, 1.25rem): window titles, always gold-ink, always the first line of the window.
- **Figure** (700, 1.25rem, tabular numerals): stat and recap values; records values keep weight 700 at body size.
- **Body** (400, 1rem, 1.5): sentences, log narrative, item and biome names (semibold for names). Long prose caps at the reading measure.
- **Label** (400, 0.875rem, all small caps, 0.04em tracking): the left side of stat rows and meter labels (meter labels semibold, in their stat's ink).
- **Meta** (600, 0.75rem, tabular): log timestamps (regular weight) and change chips beside them (+42 XP, -9 HP).

### Named Rules
**The Menu Lettering Rule.** Pixelify Sans is for names, titles and headline numbers. Never set sentences, buttons, labels or figures in it.

**The Ledger Figure Rule.** Every number that can change sits in tabular numerals so counts and countdowns do not jitter.

## Layout

The hero page is a desk and a menu stack: the hero portrait (a framed pixel tile) and name head the page with level and location to the right; from 1024px two columns follow (roughly 1.05fr and 1fr, 40px gap). The left column is the dialogue box above the device bezel, sticky under the command bar. The right column stacks windows: Status, Where to explore, Since you left, Adventure log, Records, 40px apart. Below 1024px the HP and XP meters move directly under the name, then the dialogue box and device, then the windows.

The command bar and hero page use a 72rem container; Bag, Rankings and Settings use a 48rem reading width with 32px between blocks. Windows pad 12px top, 16px sides and bottom (20px sides from 640px). Inside a window: 12px from title to content, 8px vertical row padding in stat lists, 12px in log and gear rows.

Every standalone target is at least 44px tall (buttons, tabs, filters, selects, checkbox hit areas, biome rows at 48px). Log day headers stick under the command bar on an opaque ground with a two-pixel edge rule. The sale bar in Bag is a menu window pinned to the bottom with safe-area padding; the expanded review flows normally on phones.

## Elevation & Depth

Flat, with depth drawn the way a 16-bit screen draws it: a window sits above the overworld because it has a navy fill inside a two-tone pixel frame; a pressed tab sits forward because it fills navy; a meter reads as a filled tube because its fill carries a one-art-pixel highlight row along its top. Sticky elements are separated from scrolling content by an opaque fill and a frame or rule, never a shadow.

### Shadow Vocabulary
- **Meter highlight row** (`box-shadow: inset 0 2px 0 rgb(255 255 255 / 0.35)`): the lit top row of a meter fill. It is pixel shading inside the fill, not elevation, and is the only shadow value in the build.

### Named Rules
**The Drawn Depth Rule.** If something must sit above something else, give it a window frame, a navy fill or a two-pixel edge. Never a blur or drop shadow.

## Shapes

Everything the owner touches is square: windows, buttons, tabs, inputs, meters, swatches, checkboxes. The window's corners are notched by its pixel frame rather than rounded, drawn at 2 CSS px per art pixel from a 6x6 border image. Control edges are two pixels; disabled and locked states switch the edge to dashed so the state stamps rather than fades. The only curves describe the TRMNL hardware: the bezel (1.4rem) and its screen (0.375rem).

All pixel art, glyphs, cursor arrows, chevrons, checks and gems are SVG cell grids with crisp edges, or raster art rendered pixelated at integer scale.

### Named Rules
**The Only Curve Is the Device Rule.** Rounded corners belong to the TRMNL bezel and screen. Nothing interactive is rounded.

**The Stamp, Don't Fade Rule.** Disabled and locked states keep their shape and gain a dashed edge and muted text; they never vanish or drop to bare low opacity.

## Components

### Buttons
Square, two-pixel-edged menu choices.
- **Shape:** square corners (0px), 44px minimum height, 16px horizontal and 8px vertical padding, semibold label in the body sans.
- **Primary:** gold fill, night text, two-pixel night border; hover steps to Gold Hi. One per window (see The One Gold Choice Rule). Links styled as the primary action reuse the same treatment.
- **Secondary:** transparent fill, two-pixel edge in the context ink, ink text; hover inverts to an ink fill with ground-coloured text.
- **Quiet:** muted text with a 4px-offset underline; hover goes to ink. For continuations (load more, unequip, clear selection).
- **Danger:** two-pixel HP Red border, HP ink text; hover fills HP Red with night text. Destructive confirmations only.
- **Disabled:** dashed faint border, transparent fill, muted text, no underline, not-allowed cursor.
- **Busy:** the label swaps to a present-participle busy label ("Travelling…"); the shape does not change.
- **Focus:** 2px outline offset 2px in the context focus colour: navy on the day overworld, gold inside windows and at night.

### Cards / Containers (Menu Window)
- **Corner Style:** notched pixel corners from the frame, no radius.
- **Background:** Menu Navy, with the window's own context palette (cream, lavender, gold titles).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 4px border-image frame: night outer line, cream inner line, each one art pixel.
- **Internal Padding:** 12px top, 16px sides and bottom; 20px sides from 640px. A gold Pixelify title opens every titled window.

### Inputs / Fields
- **Text input and select:** square, two-pixel edge, ground fill, 44px tall, 12px horizontal padding; the select carries a 5x3 pixel chevron (navy by day, gold in windows and at night).
- **Checkbox:** a night box with a two-pixel edge that fills gold with a night pixel tick when checked; dashed edge when disabled. Sits in a 44px hit area.
- **Focus:** the global 2px focus outline.
- **Error:** a semibold small sentence in HP ink with role alert, under the control.

### Chips (Change Chips and Stamps)
- **Change chips:** semibold 0.75rem tabular text in the stat's ink beside the log timestamp; the sign carries direction, the colour carries the stat.
- **Stamps:** a dashed faint two-pixel border around tiny uppercase text ("Locked · level 9"), for locked states only.

### Navigation (Command Bar)
- **Style:** a sticky menu window with only its bottom frame showing, full width; the game mark (pixel favicon, pixelated) and "Desk Crawler" in gold Pixelify at left from 640px; equal-width tabs, 44px tall, semibold 0.875rem lavender text.
- **Active:** gold text with the gold pixel cursor arrow before it (aria-current). Hover goes to cream.

### Segmented Tabs and Text Filters
- **Segmented tabs:** a row of square cells inside a two-pixel edge, divided by two-pixel edges; the pressed cell fills Menu Navy with gold text and the cursor arrow. Used for ranking periods and the device layout switch.
- **Text filters:** muted small text; the pressed option goes gold-ink and semibold with the cursor arrow. Used for the device picker and adventure log filters.

### Meter
- **Style:** 16px tube with a two-pixel edge and a night track; the fill is HP Red, XP Green, Gold or Sky with its highlight row. Small-caps semibold label in the stat's ink above-left, "value/max" in tabular figures above-right.

### Dialogue Box (Status Pulse)
- **Style:** a menu window above the device: a 16px pixel glyph in its kind colour and the bold status sentence on the left, the countdown or ETA in small tabular lavender on the right, and a gold 5x3 "more" arrow in the bottom-right corner bobbing two pixels in two steps (1.2s).

### Adventure Log Row
- **Style:** a 16px kind glyph (combat red, loot and level-up gold, rest green, travel sky, trap violet, system muted) beside the narrative sentence; beneath, the timestamp and change chips. Rows divided by window-rule hairlines; day headers sticky with a two-pixel edge rule.

### Device Bezel
- **Style:** Frame Night bezel (Bezel Night in dark mode) with 1.4rem corners and fluid padding, holding a white 0.375rem-cornered screen at the device's aspect ratio; pixel scene underneath, live 1-bit render on top.
- **Motion:** a six-step black-then-white flash over 420ms when a new screen loads, effectively instant under reduced motion.

## Do's and Don'ts

### Do:
- **Do** put every section in a menu window with the notched two-pixel frame and a gold Pixelify title.
- **Do** use each stat's game colour (HP red, XP green, gold, sky travel, violet rare) and pair it with a glyph, sign, label or shape.
- **Do** set text in the context ink tone (hp-ink, gold-ink and so on), not the raw fill.
- **Do** mark the current menu choice with the gold pixel cursor arrow.
- **Do** keep every control square, two-pixel-edged and at least 44px tall.
- **Do** draw icons, arrows, checks and chevrons as crisp SVG cell grids, and render pixel art pixelated at integer scale.
- **Do** stamp disabled and locked states with a dashed edge and muted text.
- **Do** keep the device preview 1-bit inside its bezel.

### Don't:
- **Don't** fill more than one control gold in a window.
- **Don't** round buttons, inputs, tabs, windows or meters; only the bezel and its screen curve.
- **Don't** use drop shadows, blurs or glows for depth; the meter's highlight row is the only shading.
- **Don't** set sentences, buttons, labels or figures in Pixelify Sans.
- **Don't** convey state by colour alone.
- **Don't** fall back to the 1-bit paper logbook or rounded white casual-game cards; this world replaced both.
- **Don't** add idle motion beyond the dialogue arrow bob and the e-ink refresh.
