---
name: Desk Crawler Companion
description: The logbook beside a 1-bit e-ink screen; paper, ink, one grey, pixel type.
colors:
  paper: "#fafaf9"
  ink: "#1c1917"
  ink-soft: "#44403c"
  graphite: "#57534e"
  pencil: "#a8a29e"
  rule-grey: "#d6d3d1"
  screen-white: "#ffffff"
  night-paper: "#0c0a09"
  night-ink: "#f5f5f4"
  night-rule: "#44403c"
  alert-red: "#b91c1c"
  alert-red-night: "#f87171"
typography:
  display:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 700
    lineHeight: 1.11
  headline:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
  title:
    fontFamily: "Pixelify Sans, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.125rem"
    fontWeight: 600
    lineHeight: 1.55
  body:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1rem"
    fontWeight: 400
    lineHeight: 1.5
  figure:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 700
    lineHeight: 1.4
    fontFeature: "tnum"
  label:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    letterSpacing: "0.04em"
    fontFeature: "all-small-caps"
  meta:
    fontFamily: "ui-sans-serif, system-ui, -apple-system, Segoe UI, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 400
    lineHeight: 1.33
rounded:
  none: "0px"
  screen: "0.375rem"
  bezel: "1.4rem"
spacing:
  xs: "8px"
  sm: "12px"
  md: "20px"
  lg: "40px"
  control: "44px"
  tab: "40px"
components:
  button-primary:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.screen-white}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.ink-soft}"
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.ink}"
    rounded: "{rounded.none}"
    padding: "0 16px"
    height: "44px"
  button-secondary-hover:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
  button-quiet:
    textColor: "{colors.ink-soft}"
    height: "44px"
    padding: "0 16px"
  segmented-tab:
    textColor: "{colors.ink-soft}"
    typography: "{typography.label}"
    rounded: "{rounded.none}"
    padding: "0 12px"
    height: "40px"
  segmented-tab-active:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.screen-white}"
  pulse-strip:
    backgroundColor: "{colors.ink}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    padding: "12px 16px"
  device-bezel:
    backgroundColor: "{colors.ink}"
    rounded: "{rounded.bezel}"
    padding: "clamp(0.5rem, 2.5vw, 1rem)"
  device-screen:
    backgroundColor: "{colors.screen-white}"
    rounded: "{rounded.screen}"
  meter-track:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
    height: "12px"
  nav-tab:
    textColor: "{colors.graphite}"
    height: "44px"
  nav-tab-active:
    textColor: "{colors.ink}"
---

# Design System: Desk Crawler Companion

## Overview

**Creative North Star: "The Logbook Beside the Screen"**

The owner's TRMNL is a 1-bit e-ink panel; the companion is the paper logbook kept next to it. The page borrows the device's material honestly: warm off-white paper, near-black ink, one grey for rules, pixel art drawn at integer scale, and a pixel display face for the few names and headings that should feel like they came off the device. Everything else is set in the system sans so the reading stays quiet and fast.

Density is ledger-like rather than dashboard-like. Facts sit in hairline-ruled rows with small-caps labels on the left and tabular figures on the right, grouped under a heavy ink rule, instead of each fact getting its own white box. The device preview is the anchor of the hero page: drawn in a thick, rounded ink bezel, pinned in the left column on wide screens, with a solid ink strip beneath it carrying the hero's status and the next-adventure countdown.

The mood is calm and steady. Nothing pulses, nothing glows, no colour asks for attention. The only motion that belongs to the world is the e-ink refresh flash when a new screen lands in the preview.

**Key Characteristics:**
- Paper, ink, one grey; no decorative accent colour.
- Pixel display face for names and section heads; system sans for reading.
- Ledger rows: heavy ink rule on top, grey hairlines between rows, small-caps labels, tabular figures.
- Square controls: ink-filled or ink-outlined rectangles.
- Pixel art and 8x8 SVG glyphs rendered crisp, never smoothed.
- Flat: no shadows anywhere in the world.
- Dark mode is a straight inversion: night paper, night ink, darker rules.

## Colors

A 1-bit palette with a single mid-grey, built on Tailwind's warm stone scale; ink and paper carry everything.

### Primary
- **Ink** (stone-900): body text, primary button fill, the pulse strip, the device bezel, the heavy rule that opens every ledger, active segmented tab, meter fill, text selection background, form `accent-color`.
- **Soft Ink** (stone-700): primary button hover, quiet button and unselected segmented-tab text. In dark mode it becomes the bezel colour so the device still reads as a darker object than the page.

### Neutral
- **Paper** (stone-50): page ground and the sticky nav and log day headers that must hide content scrolling under them; also the text colour on ink fills.
- **Screen White**: the e-ink panel interior inside the bezel, and text on primary buttons and active tabs.
- **Graphite** (stone-600): secondary text: small-caps labels, timestamps, meta lines, inactive nav tabs and filters.
- **Pencil** (stone-400): zero values in the ledger, so an empty count recedes without disappearing. Locked items sit one step darker (stone-500).
- **Rule Grey** (stone-300): hairlines between ledger rows and under the nav and platform header.
- **Night Paper / Night Ink / Night Rule** (stone-950 / stone-100 / stone-700 to 800): the dark-mode inversion of paper, ink and rules. Ink-filled controls invert to night-ink fills with stone-900 text.

### Error
- **Alert Red** (red-700; red-400 at night): error alerts only, in semibold small text. It is the one non-stone hue in the build and exists for legibility of failures, not decoration.

### Named Rules
**The One Grey Rule.** Structure is ink or rule grey. A row separator is rule grey; a group boundary is ink. There is no third weight of line.

**The No Accent Rule.** No hue carries emphasis. Emphasis is ink fill, weight, or underline. Red appears only inside an error alert.

## Typography

**Display Font:** Pixelify Sans (self-hosted woff2, weights 400-700, SIL OFL 1.1 text shipped beside it), falling back to the system sans
**Body Font:** system UI sans stack
**Label/Mono Font:** system monospace stack is defined but not used on the hero page

**Character:** The pixel face is the device speaking: hero name, section heads, the rank number. The system sans is the owner's own handwriting in the logbook: plain, legible, dense.

### Hierarchy
- **Display** (700, 2.25rem): the hero's name at the head of the hero sheet and the seven-day rank number. One or two per page.
- **Headline** (600, 1.25rem): section heads: "Since you left", "Adventure log", "Records".
- **Title** (600, 1.125rem): subsection heads inside a section ("Where to explore").
- **Body** (400, 1rem): sentences, log entries, biome names (semibold for the name). Prose blocks cap at the reading measure (65ch).
- **Figure** (700, 1.25rem, tabular numerals): ledger values and hero stats. Smaller records values keep weight 700 at body size.
- **Label** (400, 0.875rem, all small caps, 0.04em tracking): the left side of ledger rows and meter labels. Meter labels are semibold.
- **Meta** (400, 0.75rem): explanatory footnotes under a block, in graphite.

### Named Rules
**The Device Voice Rule.** Pixelify Sans is reserved for names, section heads and headline numbers. Never set running text, buttons or labels in it.

**The Ledger Figure Rule.** Every number that can change sits in tabular numerals, so counts and countdowns do not jitter as they tick.

## Layout

The hero page is a desk-and-feed: on screens 1024px and wider, two columns (roughly 1.05fr device, 1fr feed) with a 40px column gap; the device column is sticky just under the game nav. Below 1024px the device sits full width above the feed. The game nav and hero page widen to a 72rem container; every other companion tab keeps a 48rem reading width.

Vertical rhythm in the feed: 40px between sections, 20px between blocks inside a section, 12px between a heading row and its content, 8px row padding inside ledgers. Ledgers run two columns on phones and up to three from 640px. Heading rows put the head on the left and a quiet meta line or link on the right, baseline-aligned, wrapping on narrow screens.

Every tap target is at least 44px tall (segmented tabs and text filters at least 40px). Log day headers stick under the nav while their day scrolls.

## Elevation & Depth

Flat. There are no shadows in the world. Depth is drawn the way a 1-bit screen would draw it: an ink fill against paper (the bezel, the pulse strip, a pressed tab), and a heavy ink rule against grey hairlines. Sticky elements stay flat and are separated from scrolling content by an opaque paper fill and a rule, never by a shadow.

### Named Rules
**The Drawn Depth Rule.** If something needs to sit above something else, give it an ink fill or an ink rule. Never a blur.

## Shapes

Controls, strips, ledgers and meters are square-cornered rectangles. The only curves belong to the device itself: the bezel's generous rounded corners (1.4rem) and the slightly rounded screen inside it (0.375rem), because that is the shape of the object being depicted. Pixel art and 8x8 glyphs render with crisp edges at integer cells; icons are drawn as SVG cell grids, never as font glyphs.

### Named Rules
**The Only Curve Is the Device Rule.** Rounded corners describe the TRMNL hardware. Nothing the owner taps is rounded.

## Components

### Buttons
Rectangles of ink: decisive, never soft.
- **Shape:** square corners, 44px minimum height, 16px horizontal padding, semibold label.
- **Primary:** ink fill, white text; hover steps to soft ink. Used for the single positive decision in a group (Resume adventures, Sign in).
- **Secondary:** 1px ink outline, ink text, transparent fill; hover inverts to ink fill with paper text. Used for routine actions (Drink potion, Pause adventures, Travel).
- **Quiet:** soft-ink text with a 4px-offset underline; hover darkens to ink. Used for "load more" style continuations.
- **Focus:** 2px outline in the current colour, offset 2px, on every focusable element.
- **Disabled:** 50% opacity, not-allowed cursor.
- **Dark:** primary becomes night-ink fill with stone-900 text; secondary outline lightens to stone-300.

### Segmented Tabs
- **Style:** a row of square cells inside one 1px ink outline, divided by ink hairlines; 40px tall, small semibold text.
- **State:** the pressed cell fills with ink and white text (`aria-pressed`). Used for the device layout switch.

### Text Filters
- **Style:** graphite small text; the selected option goes ink, semibold and underlined (4px offset). Used for the device picker and adventure log filters, where a full segmented control would be too heavy.

### Ledger
The system's signature container in place of cards.
- **Structure:** a description list opened by a 1px ink top rule; each row is a label/value pair separated by rule-grey hairlines, 8px vertical padding.
- **Content:** small-caps graphite label left, tabular bold figure right. Gains carry a leading plus; zero renders as "0" in pencil grey.
- **Columns:** two on phones, up to three from 640px, with 16px gutter on the left cell.

### Meter
- **Style:** 12px tall track with a 1px ink border, square; ink fill proportional to value. Label in semibold small caps above-left, "value/max" in tabular figures above-right.

### Pulse Strip
- **Style:** full-width ink band (12px 16px padding) under the device, paper text. Left: an 8x8 pixel glyph and the bold status sentence. Right: the countdown or ETA in small tabular figures. Inverts in dark mode.

### Device Bezel
- **Style:** ink frame with 1.4rem corners and fluid padding (0.5 to 1rem), holding a white screen with 0.375rem corners at the device's own aspect ratio. Pixel scene underneath, live render on top.
- **Motion:** on each new screen, a stepped ink-then-white flash (420ms, 6 steps) replays the e-ink full refresh. Under reduced motion it is effectively instant.

### Navigation
- **Style:** sticky paper bar under a rule-grey hairline, equal-width tabs, 44px tall, small semibold graphite text.
- **Active:** ink text with a 2px underline offset 8px. The game mark is a pixel favicon rendered crisp, hidden below 640px.

### Inline Links
Underlined with a 4px offset, in the surrounding text colour.

## Do's and Don'ts

### Do:
- **Do** group facts in ledgers: ink top rule, rule-grey hairlines, small-caps label left, tabular figure right.
- **Do** express emphasis with ink fill, weight or underline only.
- **Do** keep every interactive control square-cornered and at least 44px tall (40px for segmented tabs and text filters).
- **Do** set the hero name, section heads and headline numbers in Pixelify Sans; set everything else in the system sans.
- **Do** render pixel art and icons with crisp edges at integer scale, drawing icons as SVG cell grids in the current colour.
- **Do** provide the dark inversion for every ink, paper and rule colour you use.

### Don't:
- **Don't** wrap facts in bordered, rounded white cards; that is the stacked-card dashboard this world replaced.
- **Don't** add a hue for emphasis, status or decoration; red exists only inside error alerts.
- **Don't** use shadows, blurs or glows for depth.
- **Don't** round buttons, tabs, chips or inputs; the bezel and its screen are the only rounded shapes.
- **Don't** smooth-scale pixel art or set running text in the pixel face.
