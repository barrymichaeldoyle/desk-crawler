/**
 * Four self-contained TRMNL layouts. Template v47 moves the OG full landscape's code into the view's corner as a smaller
 * corner-cut code to the `/dc` short link, and runs the gear line on under it (D108). Template v46 closes the X half's details column to small gaps, so its board keeps a
 * third row above the recap ribbon (D104). Template v45 moves the X side landscape's code to the header's top-right corner,
 * names its gear by the attack and defense marks, shows four board rows and sets the recap as a ribbon at the foot,
 * as the X quarter landscape now does too (D104).
 * Template v44 shows the stance beside the bag count under a gauge mark (D103).
 * Template v43 stands the rune rule on end between the X landscape half's columns
 * and puts a thin rule under its scene (D97). Template v42 sets the X landscape half's scene at 3x (D97). Template v41 rearranges the X's landscape half (D97): a details column (hero, HUD,
 * gear on two lines, board) beside a vertical rule, then the scene and code over the rune rule and the ledger. Template v40 gives the X its own half, side and quarter arrangements (D95): the
 * half views take the full layout's header, scene, board and one-line ledger; the side stacks the header over the scene
 * (its bag code hung in the corner in landscape), the stories and a board; the quarter shows the HP and XP counts with
 * the code beside the name. The OG keeps its arrangements, each block marked `lg:hidden`. Template v39 lifts the OG-sized panels (D94): the full landscape sets a 3x scene
 * beside a five-row board and runs a screen-wide ledger of one-line stories with stat columns; the full portrait takes
 * the 3x scene across its width with the QR hung in its corner and a six-row board in two columns; both name the
 * counters and show the gear by its marks. On BWRY ink panels the scene prints its four-ink twin and the hearts, lost
 * HP, found gold, the own rank row, the celebration badge and attention lines take red and yellow. Template v38 reworks the full portrait: the landscape's header (the HUD block
 * beside the hero on the X, under it on the OG), the scene across the full width with the standing QR hung in its
 * corner, and a captioned rule between the stories and the ranking; the celebration badge keeps its size in stretching
 * columns. Template v37 polishes the X's full layout: each story is one line, its XP, gold
 * and HP in fixed columns before the time; the stories and the ranking get a wider gutter and a full-width rune; the
 * ranking shows up to ten ruled rows (`top10`), in two columns in portrait. Template v36 reworks the full layout: attack and defense beside the name, the bag
 * count beside the potions, a small companion QR in the top-right corner, a bag-full panel over the stories, and wider
 * stories without the bag column; the recap's facts sit further apart everywhere. v35 draws the recap as icon-led
 * facts under its name and hours. v34 adds the merchant notice (an inverted line in the attention slot that
 * keeps the stories). v33 completes the HUD: XP as ten
 * half-step ticks under the hearts with the numbers at the end, attack and
 * defense marks in the counter line, a shorter full header so the scene and
 * stories move up, and a leaderboard that marks the hero's own row instead of
 * repeating the rank (v32: hearts, counters and chips; v31: centred setup
 * panel; v30: portrait arrangements; v29: a companion QR in every view).
 * User text arrives only through escaped merge_variables; scenes and QR codes
 * use existing integer-scaled artwork. No shared-template registration.
 */
import { GLYPHS, glyphRows } from '../art/glyphs'
import { hudMarkUri } from '../art/hud'

export const TEMPLATE_VERSION = 47

const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`

/** Title-bar icon: an upright letter-opener blade with a spark. Inline, so it never needs the network. */
const TITLE_ICON = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="square">' +
    '<path d="M12 2v13"/><path d="M8 15h8"/><path d="M12 15v4"/><path d="M10 21h4"/>' +
    '<path d="M19 4v4M17 6h4"/><path d="M5 9v2M4 10h2"/></svg>',
)

/**
 * Rune divider between the scene and the story: a thin rule with a diamond and runic ticks, drawn at the width of its
 * column so the OG keeps whole pixels instead of scaling the image down.
 */
const runeDivider = (width: number) => {
  const c = width / 2
  return svgDataUri(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="12" viewBox="0 0 ${width} 12" fill="black">` +
      `<rect x="0" y="5" width="${c - 30}" height="2"/><rect x="${c + 30}" y="5" width="${c - 30}" height="2"/>` +
      `<path d="M${c} 0l6 6-6 6-6-6z"/><rect x="${c - 20}" y="2" width="2" height="8"/><rect x="${c + 18}" y="2" width="2" height="8"/>` +
      `<rect x="${c - 38}" y="3" width="2" height="6"/><rect x="${c + 36}" y="3" width="2" height="6"/></svg>`,
  )
}
/** The ornament alone: its rule stubs meet the fills on either side. */
const RUNE_ORNAMENT = runeDivider(120)
/** A plain stretch of the same 2-unit rule, stretched to any width (`preserveAspectRatio="none"`). */
const RULE_FILL = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="4" height="12" viewBox="0 0 4 12" preserveAspectRatio="none" fill="black"><rect x="0" y="5" width="4" height="2"/></svg>')
/**
 * Every piece of the rule is sized by the framework's pixel classes, which the X scales up, so fills and ornament
 * always join at one weight (D92). `ruleFill` stretches; the ornament keeps its shape.
 */
const ruleFill = `<img class="grow w--min-0 h--[12px]" src="${RULE_FILL}" alt="">`
const runeRule = `${ruleFill}<img class="no-shrink w--[120px] h--[12px]" src="${RUNE_ORNAMENT}" alt="">${ruleFill}`

/**
 * The rune rule stood on end, for the X landscape half's column separator (D97): the same ornament and fill transposed,
 * the fills stretching to the column's height.
 */
const RUNE_ORNAMENT_V = svgDataUri(atob(RUNE_ORNAMENT.split(',')[1]!).replace('width="120" height="12" viewBox="0 0 120 12" fill="black">', 'width="12" height="120" viewBox="0 0 12 120" fill="black"><g transform="matrix(0 1 1 0 0 0)">').replace('</svg>', '</g></svg>'))
const RULE_FILL_V = svgDataUri('<svg xmlns="http://www.w3.org/2000/svg" width="12" height="4" viewBox="0 0 12 4" preserveAspectRatio="none" fill="black"><rect x="5" y="0" width="2" height="4"/></svg>')
const ruleFillV = `<img class="grow h--min-0 w--[12px]" src="${RULE_FILL_V}" alt="">`
const runeRuleV = `<div class="no-shrink flex flex--col flex--center-x gap--none" data-rune-rule="vertical">${ruleFillV}<img class="no-shrink w--[12px] h--[120px]" src="${RUNE_ORNAMENT_V}" alt="">${ruleFillV}</div>`

/**
 * Device-envelope-only code: no code in owner/public preview payloads. Fits the existing footer height. "code" tells a
 * passer-by it is something to enter; the narrow portrait bars drop the word to fit.
 */
const KEEPSAKE_LABEL = 'Keepsake code'
const keepsakeFooter = `{% if desk_keepsake_code %}<span class="instance">${KEEPSAKE_LABEL} {{ desk_keepsake_code | escape }}</span>{% endif %}`

const titleBar = `
<div class="title_bar">
  <img class="image image-stroke" src="${TITLE_ICON}" alt="">
  <span class="title">Desk Crawler</span>
  ${keepsakeFooter}
</div>`

/**
 * Narrow portrait columns (side, quarter): a 480-pixel-wide panel can't fit the name beside the code, so while a code
 * is showing it takes the name's place there; the icon still marks the plugin. The X keeps both. Both use the short label.
 */
const titleBarNarrow = titleBar
  .replace('<span class="title">', '<span class="title{% if desk_keepsake_code %} hidden lg:inline-block{% endif %}">')
  .replace(`${KEEPSAKE_LABEL} {{`, 'Keepsake {{')


type SceneField = 'scene_url' | 'scene_url_small' | 'scene_url_medium'
/**
 * Grayscale tiers carry a bit-depth class and ink panels a palette class instead, so `1bit:`/`2bit:`/`4bit:` variants
 * reach every panel except the ink ones (D94). `inkOnly` shows an element on ink panels alone; `ink` paints red or
 * yellow there and keeps black (or white) everywhere else.
 */
const inkOnly = '1bit:hidden 2bit:hidden 4bit:hidden'
const ink = (property: 'text' | 'bg', colour: 'red' | 'yellow', fallback = 'black') =>
  `${property}--${colour} 1bit:${property}--${fallback} 2bit:${property}--${fallback} 4bit:${property}--${fallback}`
/**
 * A scene image below the X's breakpoint: the 1-bit art on every grayscale tier, and on ink panels its four-ink twin
 * (the same path with `-bwry`, D94), where the hero's cardigan and the monsters print in red and yellow and the paper
 * shows through. The wrapper carries the breakpoint so the bit-depth classes never meet `lg:` ones on one element, and
 * lays the image out as a flex item that may shrink, so a narrow column fits it to its width as before the wrapper.
 */
const grayOnly = 'hidden 1bit:block 2bit:block 4bit:block'
const sceneImage = (field: SceneField, classes = 'lg:hidden') =>
  `<div class="${classes} flex w--min-0"><img class="image ${grayOnly}" src="{{ ${field} }}" alt=""><img class="image ${inkOnly}" src="{{ ${field} | replace: ".png", "-bwry.png" }}" alt=""></div>`
/** Base scene everywhere, swapped for an integer-scaled larger image on screen--lg (TRMNL X). */
const scene = (field: SceneField, large = field === 'scene_url' ? 'scene_url_large' : 'scene_url_medium') => {
  return `
  {% if ${field} != "" %}<div class="flex flex--row flex--center-x stretch-x">${sceneImage(field)}<img class="image hidden lg:block" src="{{ ${large} }}" alt=""></div>{% endif %}`
}

/** The rune rule across the full width of its column. */
const divider = `
  <div class="flex flex--row flex--center-y gap--none stretch-x" data-rune-rule="true">${runeRule}</div>`

/**
 * HUD marks assigned once per layout (`hud_heart_full`...). Drawn at twice their grid so the X, where the framework
 * scales pixel classes up, keeps whole pixels; the classes size them on the OG.
 */
const HUD_ASSIGNS =
  `{% assign hud_heart_full = "${hudMarkUri('heartFull', 36, 32)}" %}{% assign hud_heart_half = "${hudMarkUri('heartHalf', 36, 32)}" %}{% assign hud_heart_empty = "${hudMarkUri('heartEmpty', 36, 32)}" %}` +
 `{% assign hud_heart_full_ink = "${hudMarkUri('heartFull', 36, 32, '#ff0000')}" %}{% assign hud_heart_half_ink = "${hudMarkUri('heartHalf', 36, 32, '#ff0000')}" %}{% assign hud_heart_empty_ink = "${hudMarkUri('heartEmpty', 36, 32, '#ff0000')}" %}` +
  `{% assign hud_tick_full = "${hudMarkUri('tickFull', 36, 16)}" %}{% assign hud_tick_half = "${hudMarkUri('tickHalf', 36, 16)}" %}{% assign hud_tick_empty = "${hudMarkUri('tickEmpty', 36, 16)}" %}` +
  `{% assign hud_sword = "${hudMarkUri('sword', 24, 24)}" %}{% assign hud_shield = "${hudMarkUri('shield', 24, 24)}" %}` +
  `{% assign hud_coin = "${hudMarkUri('coin', 24, 24)}" %}{% assign hud_potion = "${hudMarkUri('potion', 24, 24)}" %}{% assign hud_star = "${hudMarkUri('star', 24, 24)}" %}{% assign hud_bag = "${hudMarkUri('bag', 24, 24)}" %}` +
  `{% assign hud_stance_cautious = "${hudMarkUri('stanceCautious', 24, 24)}" %}{% assign hud_stance_balanced = "${hudMarkUri('stanceBalanced', 24, 24)}" %}{% assign hud_stance_bold = "${hudMarkUri('stanceBold', 24, 24)}" %}`

/**
 * A HUD row: marks and counts that wrap where a column is too narrow for all of them. It never shrinks, so beside a
 * long hero name (the quarter header) the name clamps instead of the hearts sliding past the panel edge.
 */
const hudRow = (data: string, inner: string, gap = 'gap--small') => `<div class="flex flex--row flex--wrap flex--left flex--center-y ${gap} no-shrink" ${data}>${inner}</div>`

/**
 * One count with its HUD mark instead of a word: the marks name each count, as in the companion's HUD. The mark sits
 * three pixels from its number and counts sit a medium gap apart (`COUNTER_GAP`), so each number reads as its own
 * mark's rather than the next one's.
 */
const COUNTER_ICON = 'w--[16px] h--[16px] no-shrink'
const COUNTER_GAP = 'gap--medium'
const counter = (icon: string, text: string, classes = '') => `<div class="${classes}flex flex--row flex--center-y gap--[3px] no-shrink"><img class="${COUNTER_ICON}" src="{{ ${icon} }}" alt=""><span class="label lg:title--small">${text}</span></div>`
/** Attack and defense (the companion's ATK/DEF, D60): the level base plus the equipped gear. */
const attackDefense = (classes = '') => counter('hud_sword', '{{ attack }}', classes) + counter('hud_shield', '{{ defense }}', classes)
/** Bag slots in use, always beside the potions (D88). Null (unlinked) shows nothing. */
const bagCount = (classes = '') => `{% if bag_capacity %}${counter('hud_bag', '{{ bag_used }}/{{ bag_capacity }}', classes).replace('<div class="', '<div data-bag-count="true" class="')}{% endif %}`
/**
 * The stance under its gauge mark, needle low, centred or high (D103), after the bag count. A setting rather than a
 * count, it outlasts the log line that changed it. Empty (unlinked, or a catalog without stances) shows nothing.
 */
const stanceCount = (classes = '') =>
  `{% if stance_name and stance_name != "" %}{% case stance %}{% when "cautious" %}{% assign hud_stance = hud_stance_cautious %}{% when "bold" %}{% assign hud_stance = hud_stance_bold %}{% else %}{% assign hud_stance = hud_stance_balanced %}{% endcase %}` +
  `${counter('hud_stance', '{{ stance_name | escape }}', classes).replace('<div class="', '<div data-stance="{{ stance | escape }}" class="')}{% endif %}`
const goldPotions = (classes = '') => counter('hud_coin', '{{ gold }}', classes) + counter('hud_potion', '{{ potions }}', classes)
/**
 * Gold, potions, bag slots and the stance under the hero in the full layouts (D88, D103), each count named: the OG's full header has the
 * width for the words too. `lg:flex` keeps the X's wider default gap.
 */
const heroCounters =
  hudRow('data-counters="words"', counter('hud_coin', '{{ gold }} gold') + counter('hud_potion', '{{ potions }} {% if potions == 1 %}potion{% else %}potions{% endif %}') + bagCount() + stanceCount(), COUNTER_GAP).replace('class="flex', 'class="flex lg:flex')

/**
 * The full layouts' name line (D88): the hero and level, then the attack and defense marks. On the OG a long name
 * clamps rather than pushing the marks off the line; the X has room for the longest (16-character) name, so it never
 * clamps there. The landscape header sizes the hero column to its content (D90) and sets the HUD block against the
 * corner QR, so the spare width sits between the two and goes to the hero column first, a little below the top
 * (`pt--2`; centring it in the QR's height sat too low) (D91).
 */
const nameRow = (names: string) =>
  `<div class="flex flex--row flex--left flex--center-y gap--small stretch-x" data-name-row="true">${names}` +
  `<div class="flex flex--row flex--center-y ${COUNTER_GAP} no-shrink" data-attack-defense="true">${attackDefense()}</div></div>`

/**
 * Health as ten half-heart hearts, the companion's HUD meter (D60): each half fills independently, so the row reads in
 * 5% steps. Rounded from the real numbers, and never empty while the hero has any health. Wide rows carry the count
 * and the attack and defense marks after it (`extra`); narrow columns show the count in the counter rows instead,
 * since ten hearts already fill their width.
 */
const HEART_CLASSES = 'w--[18px] h--[16px] no-shrink'
const hpCount = '<span class="label lg:title--small no-shrink" data-hp-count="true">{{ hp }}/{{ max_hp }} HP</span>'
const hearts = (count = true, extra = '') =>
  `{% if max_hp > 0 %}{% assign heart_halves = max_hp | divided_by: 2 | floor %}{% assign heart_halves = hp | default: 0 | times: 20 | plus: heart_halves | divided_by: max_hp | floor %}{% else %}{% assign heart_halves = 0 %}{% endif %}{% if hp > 0 and heart_halves < 1 %}{% assign heart_halves = 1 %}{% endif %}` +
  hudRow(`data-hearts="{{ heart_halves }}"`, `${heartRow('', grayOnly)}${heartRow('_ink', inkOnly)}${count ? hpCount : ''}${extra}`)
/**
 * One row of the ten hearts: black on grayscale tiers, red on ink panels (`_ink` marks, D94). The visibility sits on a
 * wrapper, since the bit-depth `flex` variants bring the framework's default gap with them.
 */
const heartRow = (suffix: string, visibility: string) =>
  `<div class="${visibility} no-shrink"><div class="flex flex--row gap--[2px] no-shrink">{% for i in (1..10) %}{% assign heart_right = i | times: 2 %}{% assign heart_left = heart_right | minus: 1 %}<img class="${HEART_CLASSES}" src="{% if heart_halves >= heart_right %}{{ hud_heart_full${suffix} }}{% elsif heart_halves >= heart_left %}{{ hud_heart_half${suffix} }}{% else %}{{ hud_heart_empty${suffix} }}{% endif %}" alt="">{% endfor %}</div></div>`

/**
 * XP as ten half-step ticks the width of the hearts, the thin bar directly under them with the numbers at the end
 * (D74): the same 5% steps and the same floor as the hearts, so liquidjs and Ruby Liquid agree. Wide rows add the
 * coin and potion counts after the numbers (`extra`); the 240-pixel portrait columns wrap the numbers under the ticks.
 */
const TICK_CLASSES = 'w--[18px] h--[8px] no-shrink'
const xpCount = '<span class="label lg:title--small no-shrink" data-xp-count="true">{{ xp }}/{{ xp_to_next }} XP</span>'
/** `extra` counters (the portrait's gold, potions and bag) follow the XP count at the counter gap. */
const xpTicks = (extra = '') =>
  `{% assign xp_halves = xp_pct | default: 0 | times: 20 | plus: 50 | divided_by: 100 | floor %}` +
  hudRow(`data-xp-ticks="{{ xp_halves }}"`, `<div class="flex flex--row gap--[2px] no-shrink">{% for i in (1..10) %}{% assign tick_right = i | times: 2 %}{% assign tick_left = tick_right | minus: 1 %}<img class="${TICK_CLASSES}" src="{% if xp_halves >= tick_right %}{{ hud_tick_full }}{% elsif xp_halves >= tick_left %}{{ hud_tick_half }}{% else %}{{ hud_tick_empty }}{% endif %}" alt="">{% endfor %}</div>${extra ? `<div class="flex flex--row flex--wrap flex--left flex--center-y ${COUNTER_GAP} no-shrink" data-xp-counters="true">${xpCount}${extra}</div>` : xpCount}`)

/**
 * The wide HUD (full landscape and portrait): hearts and the HP count on one row; XP ticks and count on the next
 * (attack and defense sit in the name row, D88). The portrait adds coins, potions and bag slots after the XP; the
 * landscape keeps them under the hero (`heroCounters`).
 */
const hudWide = (withCounters: boolean) => `${hearts(true)}
    ${xpTicks(withCounters ? goldPotions() + bagCount() : '')}`

/**
 * Narrow columns (side, half, their portrait forms): the hearts alone fill the width, so the HP count leads a combat
 * row with attack and defense (a full heart marks it), and coins and potions take a row of their own.
 */
const counters = () => `${hudRow('data-counters="true"', counter('hud_heart_full', '{{ hp }}/{{ max_hp }}') + attackDefense(), COUNTER_GAP)}${hudRow('data-counters="2"', goldPotions() + bagCount() + stanceCount(), COUNTER_GAP)}`

/** One glyph as a compact URL-encoded SVG: a single path of horizontal runs keeps each icon to a few hundred bytes. */
export const glyphUri = (kind: string, size: number) => {
  const runs = glyphRows(kind).flatMap((row, y) => [...row.matchAll(/#+/g)].map((run) => `M${run.index} ${y}h${run[0].length}v1h-${run[0].length}z`))
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${size}' height='${size}' viewBox='0 0 8 8' shape-rendering='crispEdges'><path d='${runs.join('')}'/></svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const GLYPH_KINDS = Object.keys(GLYPHS)

/** Each glyph assigned once per layout (`glyph16_combat`...), so log lines only pick a variable instead of repeating the SVG. */
const glyphAssigns = (sizes: readonly number[]) =>
  sizes.flatMap((size) => GLYPH_KINDS.map((k) => `{% assign glyph${size}_${k} = "${glyphUri(k, size)}" %}`)).join('')

/** The log-kind glyph for a Liquid expression, the same icons as the companion log. Needs `glyphAssigns` for `size`. */
const logIcon = (kind: string, size: number) =>
  `{% case ${kind} %}${GLYPH_KINDS.filter((k) => k !== 'system')
    .map((k) => `{% when "${k}" %}{% assign glyph = glyph${size}_${k} %}`)
    .join('')}{% else %}{% assign glyph = glyph${size}_system %}{% endcase %}<img class="image no-shrink" src="{{ glyph }}" alt="">`

/**
 * Stored text with names in [[bold marks]]: escaped first, then each mark becomes an atomic inline `text--bold` span (plain <b> loses to
 * the X fonts' fixed weight axis). Older text has no marks.
 */
const rich = (expr: string) => `{{ ${expr} | escape | replace: "[[", '<span class="text--bold inline-block">' | replace: "]]", "</span>" }}`

/**
 * Rich text in one regular-weight span: `.label` is inline-flex and would lay out each run as its own item, and label
 * text is already semibold on the X, so names only stand out against regular weight. The OG's small bitmap font has a
 * single weight, so there names are bold only in the larger newest-story line.
 */
const richSpan = (content: string) => `<span class="text--regular">${content}</span>`

/** Story above its metadata; the icon and time start at the same left edge. */
const storyText = richSpan(rich('line_story'))

/** Status with a real time when it has one ("Knocked out, back at 12:30"); otherwise the self-contained label. */
const statusText = richSpan(`{% if status_eta_at and utc_offset != nil %}${rich('status_eta_label')} {{ status_eta_at | plus: utc_offset | date: "%H:%M" }}{% else %}${rich('status_label')}{% endif %}`)

/**
 * Clamp attributes that keep bold names where possible. The framework clamp replaces an element's markup with plain
 * text, so text whose visible length (`plain`) fits in `fit` characters is left unclamped on the OG, and the X (wide,
 * with room to wrap) never clamps rich text. Only longer OG text falls back to a plain clamped line.
 */
const fitClamp = (plain: string, clamp: number, fit: number) =>
  `data-clamp="{% if ${plain}.size > ${fit} %}${clamp}{% else %}0{% endif %}" data-clamp-lg="0"`

const plainOf = (expr: string) => `${expr} | replace: "[[", "" | replace: "]]", ""`

/** On ink panels a lost HP reads red and found gold sits on yellow (D94); units follow a no-break space. */
const chipInk = (text: string) => `{% if ${text} contains "\u00a0HP" and ${text} contains "−" %} ${ink('text', 'red')}{% elsif ${text} contains "\u00a0gold" and ${text} contains "+" %} ${ink('bg', 'yellow', 'white')}{% endif %}`
/** One change as an outlined chip. */
const chip = (text: string) => `<span class="label lg:title--small label--outline${chipInk(text)}">{{ ${text} | escape }}</span>`
/** A fixed-width, right-aligned cell, so the same stat sits in the same place on every line. */
const chipCell = (field: string, kind: string, width: string) => `<span class="flex flex--row flex--right no-shrink ${width}" data-chip-cell="${kind}">{% if ${field} != "" %}${chip(field)}{% endif %}</span>`
/**
 * The X full layouts' changes on the story's line (D89): XP, gold and HP each in their own fixed column before the
 * time, so they line up down the ledger, and any other change (a potion, a bag slot, "No effect") just before them.
 * A story without changes keeps the whole line, and one with only other changes ("No effect") reserves no stat columns.
 * Units arrive joined by a no-break space, so the last word after it names the stat.
 */
const chipColumns = (visibility = 'hidden lg:flex') => `{% assign chip_xp = "" %}{% assign chip_gold = "" %}{% assign chip_hp = "" %}{% assign chip_other = "" %}{% for change in line_changes %}{% assign chip_unit = change | split: "\u00a0" | last %}{% if chip_unit == "XP" %}{% assign chip_xp = change %}{% elsif chip_unit == "gold" %}{% assign chip_gold = change %}{% elsif chip_unit == "HP" %}{% assign chip_hp = change %}{% else %}{% capture chip_other %}{{ chip_other }}${chip('change')}{% endcapture %}{% endif %}{% endfor %}<span class="${visibility} flex--row flex--center-y flex--right gap--xsmall no-shrink" data-story-chips-inline="true">{{ chip_other }}{% if chip_xp != "" or chip_gold != "" or chip_hp != "" %}${chipCell('chip_xp', 'xp', 'w--[66px]')}${chipCell('chip_gold', 'gold', 'w--[78px]')}${chipCell('chip_hp', 'hp', 'w--[66px]')}{% endif %}</span>`

/**
 * One story as a ledger line: the glyph, the story, and its HH:MM at the end of the line; the stat changes follow as
 * outlined chips, one per change, indented to the story's edge. The glyph sits two pixels down so it centres on the
 * letters rather than hugging the rule above the entry. The chips sit in a block so they wrap like words when
 * a narrow column cannot hold them all; the 240-pixel portrait columns put the time there too (`timeBelow`), where the
 * story line has no room for it. A zero-gap grid keeps the chips directly beneath the story. `inline` moves the chips
 * onto the story's own line, right-aligned before the time, so each entry is one line and the chips line up as a
 * column: on the X only (`'lg'`, the full portrait) or everywhere (`'all'`, the full landscape, whose OG ledger spans
 * the screen's width).
 */
type ChipsInline = false | 'lg' | 'all'
const logLine = (entry: string, classes: string, clamp: number, size: number, fit: number, wrapper = 'block', timeBelow = false, inline: ChipsInline = false, leadMeta = false) => {
  // On the X alone the inline forms swap in with `lg:` classes; everywhere, they replace the stacked forms outright.
  // `lg:flex` brings the framework's default gap and outranks gap classes, so `'all'` pairs it with `flex` to keep the
  // X's spacing exactly as the X-only form draws it.
  const onlyX = (lg: string) => (inline === 'all' ? '' : lg)
  const shown = inline === 'all' ? 'flex lg:flex' : 'hidden lg:flex'
  // A live entry (the travel line, D91) says its time in the story; the column is for when something happened.
  const timeSpan = (extra = '') => `{% if line_timed %}<span class="${extra}label lg:title--small no-shrink" data-story-time="true">{{ ${entry}.u | plus: utc_offset | date: "%H:%M" }}</span>{% endif %}`
  // The newest story in the inline ledgers (`leadMeta`) is larger: it keeps the whole width, and its changes and time
  // take the line below in the same columns as the rows beneath, rather than squeezing it into three lines.
  const lead = inline !== false && leadMeta
  const time = lead && inline === 'all' ? '' : timeSpan(lead ? 'lg:hidden ' : '')
  const changes = `{% for change in line_changes %} ${chip('change')}{% endfor %}`
  const hasChanges = `${entry}.d != nil and ${entry}.d != ""`
  const columns = chipColumns(shown)
  const inlineChips = inline && !lead ? `{% if ${hasChanges} %}${columns}{% endif %}` : ''
  const leadRow = lead ? `{% if line_timed or ${hasChanges} %}<div class="${shown} flex--row flex--right flex--center-y gap--xsmall" data-story-lead-meta="true">{% if ${hasChanges} %}${columns}{% endif %}${timeSpan()}</div>{% endif %}` : ''
  const stacked = `{% if ${timeBelow ? `line_timed or ${hasChanges}` : hasChanges} %}<div class="${inline ? 'lg:hidden ' : ''}flex flex--row flex--left flex--top gap--xsmall pt--1" data-story-changes="true"><div class="no-shrink w--[${size}px]"></div><div class="grow w--min-0">${timeBelow ? time : ''}${changes}</div></div>{% endif %}`
  return `{% assign line_timed = false %}{% if utc_offset != nil and ${entry}.live != true %}{% assign line_timed = true %}{% endif %}{% assign line_changes = ${entry}.d | default: "" | split: " · " %}{% assign line_story = ${entry}.n | default: ${entry}.s %}{% assign line_plain = ${plainOf('line_story')} %}<div class="${wrapper} stretch-x"><div class="grid grid--cols-1 gap--none">${entry === 'log[0]' ? '' : '{% unless forloop.first %}<div class="border--h-30 stretch-x"></div>{% endunless %}'}<div class="flex flex--row flex--left flex--top${inline && !lead ? ` ${onlyX('lg:')}flex--center-y` : ''} gap--xsmall"><div class="no-shrink pt--0.5">${logIcon(`${entry}.k`, size)}</div><span class="${classes} grow" ${fitClamp('line_plain', clamp, Math.max(0, fit - (timeBelow ? 0 : 14)))}>${storyText}</span>${inlineChips}${timeBelow ? '' : time}</div>${inline === 'all' ? '' : stacked}${leadRow}</div></div>`
}

/** The status line, its clamp fitted like log lines. */
const statusLine = (clamp: number, fit: number) =>
  `{% if status_eta_at and utc_offset != nil %}{% assign status_plain = ${plainOf('status_eta_label')} | append: " 00:00" %}{% else %}{% assign status_plain = ${plainOf('status_label')} %}{% endif %}<span class="label lg:title--small" ${fitClamp('status_plain', clamp, fit)}>${statusText}</span>`

/**
 * A big moment (level-up, elite win, jackpot, rare find) gets an inverted badge above the newest story. Its own row keeps
 * it at its text's size where the column stretches its children (the portrait's `flex--stretch-x`).
 */
const celebrationBadge = (classes: string) => `
      {% if celebration %}<div class="no-shrink flex flex--row flex--left" data-celebration="true"><span class="${classes} label--inverted ${ink('bg', 'red')}">{{ celebration | escape }}</span></div>{% endif %}`

/**
 * Whole story/stat pairs; the fitter keeps the longest newest-first prefix that fits. `rowFit` is the plain length the
 * older one-line entries may reach before the OG clamps them; the full landscape's screen-wide ledger allows more.
 */
const storyList = (clamp: number, classes: string, size = 16, fit = 60, timeBelow = false, inline: ChipsInline = false, rowFit = 28) => `
  <div class="grow stretch-x" data-story-list="true">
    {% for entry in log %}{% unless attention and forloop.index > 1 %}{% if forloop.first %}${logLine('entry', classes, clamp, size, fit, 'block', timeBelow, inline, true)}{% else %}${logLine('entry', 'label lg:title--small', 1, 16, rowFit, inline ? `block pt--1 ${inline === 'all' ? '' : 'lg:'}pt--0.5` : 'block pt--1', timeBelow, inline)}{% endif %}{% endunless %}{% endfor %}
    {% if log.size == 0 %}<span class="label lg:title--small">The first adventure starts soon.</span>{% endif %}
  </div>`

/**
 * Pinned framework 3.4 emits its final stats before signalling readiness. Fit the
 * actual rich-text boxes at that point, reserving the footer and following rank
 * line, and trim boards marked `data-fit-rows` to their slot. Only visibility changes; there are no styles, network calls or writes.
 * Scope to this view so another Desk Crawler slot has its own height budget, and
 * to the orientation layout the framework is showing (the other is display: none).
 */
const fitStories = `<script>
(() => {
  const view = document.currentScript.closest('.view');
  if (!view) return;
  const fit = () => {
    const layout = Array.from(view.querySelectorAll('.layout')).find(el => el.getClientRects().length > 0);
    const footer = Array.from(view.querySelectorAll('.title_bar')).find(el => el.getClientRects().length > 0);
    if (!layout || !footer) return;
    // Recap rows first, since the story budget subtracts their height: drop trailing facts past the row's line cap.
    view.querySelectorAll('[data-recap-items]').forEach(row => {
      if (!row.getClientRects().length) return;
      const items = Array.from(row.querySelectorAll('[data-recap-item]'));
      items.forEach(item => item.classList.remove('hidden'));
      const lines = Number(row.dataset.recapItems) || 1;
      const lineHeight = (items[0] || row.firstElementChild).getBoundingClientRect().height;
      const gap = parseFloat(getComputedStyle(row).rowGap) || 0;
      const limit = lines * lineHeight + (lines - 1) * gap + 0.5;
      let count = items.length;
      while (count > 1 && row.getBoundingClientRect().height > limit) items[--count].classList.add('hidden');
      row.dataset.recapCount = String(count);
      // The most notable fact always stays, even where the name and hours already take the rows on their own.
      row.dataset.recapFit = count === 1 || row.getBoundingClientRect().height <= limit ? 'complete' : 'over';
    });
    const layoutBottom = Math.min(footer.getBoundingClientRect().top, layout.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(layout).paddingBottom) || 0));
    // Boards in a bounded slot (the X half's, under its scene): drop trailing rows, and the rule above each, until the
    // board ends inside the slot. The hero's own row goes last; the row before it goes first.
    view.querySelectorAll('[data-fit-rows]').forEach(board => {
      if (!board.getClientRects().length) return;
      const rows = Array.from(board.querySelectorAll('[data-rank-row]'));
      board.classList.remove('hidden');
      rows.forEach(row => { row.classList.remove('hidden'); if (row.previousElementSibling && row.previousElementSibling.matches('.border--h-30')) row.previousElementSibling.classList.remove('hidden'); });
      const slot = board.closest('[data-fit-bound]');
      const bound = Math.min(layoutBottom, slot ? slot.getBoundingClientRect().bottom : layoutBottom);
      const shown = () => rows.filter(row => !row.classList.contains('hidden'));
      while (shown().length && board.getBoundingClientRect().bottom > bound + 0.5) {
        const visible = shown();
        const own = visible[visible.length - 1].classList.contains('label--inverted') && visible.length > 1;
        const drop = own ? visible[visible.length - 2] : visible[visible.length - 1];
        drop.classList.add('hidden');
        const rule = drop.previousElementSibling && drop.previousElementSibling.matches('.border--h-30') ? drop.previousElementSibling : drop.nextElementSibling && drop.nextElementSibling.matches('.border--h-30') ? drop.nextElementSibling : null;
        if (rule) rule.classList.add('hidden');
      }
      // A slot too short for the caption and one row (the longest names wrap the header) shows no board at all. The
      // X-only boards use plain rules, since lg:block would outrank hidden.
      if (!shown().length || board.getBoundingClientRect().bottom > bound + 0.5) board.classList.add('hidden');
      board.dataset.rowCount = String(board.classList.contains('hidden') ? 0 : shown().length);
    });
    view.querySelectorAll('[data-story-list]').forEach(list => {
      if (!list.getClientRects().length) return;
      const entries = Array.from(list.children).filter(entry => entry.classList.contains('block'));
      entries.forEach(entry => entry.classList.remove('hidden'));
      const parent = list.parentElement;
      let bottom = Math.min(layoutBottom, parent.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(parent).paddingBottom) || 0));
      const gap = parseFloat(getComputedStyle(parent).rowGap) || 0;
      for (let sibling = list.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
        if (getComputedStyle(sibling).display !== 'none') bottom -= sibling.getBoundingClientRect().height + gap;
      }
      let count = entries.length;
      while (count && entries[count - 1].getBoundingClientRect().bottom > bottom + 0.5) entries[--count].classList.add('hidden');
      list.dataset.storyFit = 'complete';
      list.dataset.storyCount = String(count);
      list.dataset.storyBottom = String(bottom);
    });
  };
  window.addEventListener('trmnl:terminalize:stats', fit);
  window.addEventListener('load', () => { if (window.TRMNL_PLUGINS_READY) fit(); }, { once: true });
  if (window.TRMNL_PLUGINS_READY) fit();
})();
</script>`

/** The mark for one recap item (`item.k`): HUD marks for XP, gold, wins and potions, log glyphs for the rest. */
const recapIcon = `{% case item.k %}{% when "xp" %}{% assign recap_icon = hud_star %}{% when "coin" %}{% assign recap_icon = hud_coin %}{% when "sword" %}{% assign recap_icon = hud_sword %}{% when "potion" %}{% assign recap_icon = hud_potion %}${GLYPH_KINDS.filter((k) => k !== 'system')
  .map((k) => `{% when "${k}" %}{% assign recap_icon = glyph16_${k} %}`)
  .join('')}{% else %}{% assign recap_icon = "" %}{% endcase %}{% if recap_icon != "" %}<img class="${COUNTER_ICON}" src="{{ recap_icon }}" alt="">{% endif %}`

/**
 * The recap as one wrapping row: its name and hours ("Night recap 19:00-07:00"), then each fact behind its icon.
 * Each piece is unbreakable, so narrow columns wrap between pieces rather than inside "19:00-07:00". `lines` caps the
 * rows it may take; the fitter hides the trailing (least notable) facts that would need more.
 */
const recapRow = (lines: number, text: string, headingClasses = 'text--bold') =>
  `<div class="flex flex--row flex--wrap flex--left flex--center-y gap--medium stretch-x" data-recap-items="${lines}">` +
  `<span class="${text} ${headingClasses} no-shrink">{{ recap.label | escape }}</span>{% if recap.span %}<span class="${text} ${headingClasses} no-shrink" data-recap-span="true">{{ recap.span | escape }}</span>{% endif %}` +
  `{% for item in recap.items %}<div class="flex flex--row flex--center-y gap--xsmall no-shrink" data-recap-item="true">${recapIcon}<span class="${text}">{{ item.t | escape }}</span></div>{% endfor %}</div>`

/** Device recap is read-only and uses its own window, independent of the recent-story list. Quarter views allow two rows. */
const recapBlock = (lines = 3) => `
  {% if recap %}<div class="flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">
    ${recapRow(lines, 'label lg:title--small')}
    <div class="border--h-30 stretch-x"></div>
  </div>{% endif %}`

/** A separate bottom recap with breathing room above its text, fitted to one line. */
const recapRibbon = `
  {% if recap %}<div class="no-shrink stretch-x" data-recap-ribbon="true">
    <div class="border--h-30 stretch-x"></div>
    <div class="pt--2">${recapRow(1, 'label lg:title--small')}</div>
  </div>{% endif %}`

/**
 * The seven-day own-group board (D74, D89): the hero's own row inverted where it appears, and appended after the list
 * when it sits below the rows a device shows. The OG keeps three rows so every row stays at a readable size; the X
 * shows up to ten (`top10`, or `top5` from a payload that predates it), ruled like the story ledger. In the landscape
 * a hero below a full board takes the tenth row's place, so the column never holds more than ten rows.
 * `heading` (the portrait) opens the panel with the period and group set into a rule, the separator from the stories;
 * the full landscape carries it in the divider row instead.
 */
/** The row itself is the label, so an inverted own row keeps its text white: a `.label` child would set its own colour. */
const rankRow = (text: string, score: string, classes: string, own: string) =>
  `<div class="${classes}label lg:title--small flex flex--row flex--between flex--center-y stretch-x gap--small{% if ${own} %} label--inverted ${ink('bg', 'red')}{% endif %}" data-rank-row="{{ ${text === 'rank' ? 'rank' : 'row.rank'} }}">` +
  `<span class="grow w--min-0" data-clamp="1">{{ ${text} }}. {{ ${text === 'rank' ? 'owner_name' : 'row.name'} | escape }}</span>` +
  `<span class="no-shrink">{{ ${score} }}&nbsp;XP</span></div>`
/**
 * A vertical rule between the stories and the ranking in the full landscape, X only (the OG column has no width to
 * spare). The framework has no X-only border class, so it is its own element: `border--v-30` draws a one-pixel line
 * down its left edge, the shade of the horizontal rules, and the row stretches it to the column's height.
 */
const columnRule = '<div class="hidden lg:block no-shrink border--v-30" data-column-rule="true"></div>'
/** A ledger rule between board rows, X only. */
const rankRule = '<div class="hidden lg:block border--h-30 stretch-x"></div>'
const rankHeading = `This week{% if leaderboard_cohort_label != "" %} · {{ leaderboard_cohort_label | escape }}{% endif %}`
const boardRow = rankRow('row.rank', 'row.score', '', 'rank and row.rank == rank')
/**
 * The portrait's board on the X: rows 1-5 and 6-10 side by side, so a full-width row does not leave the name and score
 * a panel apart and the stories keep their height. The OG pairs rows 1-3 with 4-6 the same way; a hero below them
 * takes the sixth row's place. Each column is a plain flex column (the framework's gaps need `flex`).
 */
const OG_PORTRAIT_ROWS = 6
const rankColumn = (loop: string, extra = '') => `<div class="flex flex--col flex--top flex--stretch-x gap--xsmall">{% for row in board_rows ${loop} %}{% unless forloop.first %}${rankRule}{% endunless %}${boardRow}{% endfor %}${extra}</div>`
const rankColumns = `<div class="hidden lg:block stretch-x"><div class="grid grid--cols-1 lg:grid--cols-2 gap--none lg:gap--large stretch-x">${rankColumn('limit: 5')}${rankColumn('offset: 5')}</div></div>` +
  `{% assign board_limit = ${OG_PORTRAIT_ROWS} %}{% if rank and rank > ${OG_PORTRAIT_ROWS} %}{% assign board_limit = ${OG_PORTRAIT_ROWS - 1} %}{% endif %}{% assign board_right = board_limit | minus: 3 %}` +
  `<div class="lg:hidden grid grid--cols-2 gap--medium stretch-x" data-board-columns="og">${rankColumn('limit: 3')}${rankColumn('offset: 3 limit: board_right', `{% if rank and rank > ${OG_PORTRAIT_ROWS} %}${rankRow('rank', 'leaderboard_score', '', 'true')}{% endif %}`)}</div>`
/** Period and group caption set into the rune rule above the ranking (D92); the OG shortens "Levels" to "Lv". */
const rankCaption = `<div class="flex flex--row flex--center-y gap--xsmall stretch-x">${ruleFill}<span class="label lg:title--small no-shrink lg:hidden">This week{% if leaderboard_cohort_label != "" %} · {{ leaderboard_cohort_label | replace: "Levels ", "Lv " | escape }}{% endif %}</span><span class="hidden lg:inline-block label lg:title--small no-shrink">${rankHeading}</span>${ruleFill}</div>`
/**
 * The OG full landscape's board beside its scene (the X keeps its ten-row column under the rule): the caption, then up
 * to five rows; a hero below them takes the fifth row's place, so the panel never outgrows the scene.
 */
const OG_BOARD_ROWS = 5
const ogBoard = `<div class="lg:hidden grow w--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall" data-board-column="og">
      ${rankCaption}
      {% unless rank %}{% if rank_status == "dormant" %}<span class="label">Not ranked while paused</span>{% else %}<span class="label">Ranking within the hour</span>{% endif %}{% endunless %}
      {% assign board_rows = top10 | default: top5 %}{% assign board_limit = ${OG_BOARD_ROWS} %}{% if rank and rank > ${OG_BOARD_ROWS} %}{% assign board_limit = ${OG_BOARD_ROWS - 1} %}{% endif %}
      {% for row in board_rows limit: board_limit %}${rankRow('row.rank', 'row.score', '', 'rank and row.rank == rank')}{% endfor %}
      {% if rank and rank > ${OG_BOARD_ROWS} %}${rankRow('rank', 'leaderboard_score', '', 'true')}{% endif %}
    </div>`
const rankPanel = (heading: boolean) => `
      ${heading ? rankCaption : ''}
      {% unless rank %}{% if rank_status == "dormant" %}<span class="label lg:title--small">Not ranked while paused</span>{% else %}<span class="label lg:title--small">Ranking within the hour</span>{% endif %}{% endunless %}
      {% assign board_rows = top10 | default: top5 %}
      ${heading ? rankColumns : `{% assign board_limit = board_rows.size %}{% if rank and rank > board_rows.size and board_rows.size >= 10 %}{% assign board_limit = 9 %}{% endif %}{% for row in board_rows limit: board_limit %}{% unless forloop.first %}${rankRule}{% endunless %}${boardRow}{% endfor %}`}
      {% if rank and rank > board_rows.size %}${rankRule}${rankRow('rank', 'leaderboard_score', 'hidden lg:flex ', 'true')}{% endif %}`


/**
 * The one quiet attention message (service, delay, death, inventory sleep): never clipped, shown in every size. A
 * notice (D78: the merchant) takes the same slot as an outlined chip but leaves the stories and recap alone.
 */
const attention = (classes: string, clamp: number) => `
      {% if attention %}<span class="${classes} label--underline ${ink('text', 'red')} no-shrink" data-clamp="${clamp}">{{ attention | escape }}</span>{% elsif notice %}<div class="no-shrink pt--1"><span class="${classes} label--outline" data-clamp="${clamp}">{{ notice | escape }}</span></div>{% endif %}`

/** Integer-scaled assets keep every QR module crisp on monochrome displays. */
const qrImage = (scale: number, largeScale: number, field = 'qr_base') =>
  `<img class="image lg:hidden" src="{{ ${field} }}/${scale}.png" alt=""><img class="image hidden lg:block" src="{{ ${field} }}/${largeScale}.png" alt="">`

/**
 * The full layouts' standing link (D88): a small unlabelled code to the companion home in the top-right corner. A full
 * bag takes it away, since the bag-full panel carries its own code.
 */
const homeQr = `{% if qr_base == "" and home_qr_base != "" %}<div class="no-shrink" data-home-qr="true">${qrImage(2, 3, 'home_qr_base')}</div>{% endif %}`

/**
 * A full bag in the full layouts (D88): the stories give way to a panel that says the adventure is paused, with a
 * large code straight to the bag. `qr_base` is set on an active hero only for a full bag.
 */
const bagFullPanel = (column: boolean) => `
  <div class="grow h--min-0 flex ${column ? 'flex--col' : 'flex--row'} flex--center-x flex--center-y gap--medium lg:gap--large stretch-x" data-bag-full="true">
    <div class="no-shrink">${qrImage(3, 5)}</div>
    <div class="flex flex--col flex--left gap--small${column ? ' flex--center-x' : ''}">
      <span class="title lg:title--large">Bag full</span>
      <span class="label lg:title--small${column ? ' text--center' : ''}" data-clamp="2">Adventures are paused until you make room.</span>
      <span class="label lg:title--small${column ? ' text--center' : ''}" data-clamp="1">{{ qr_label | escape }}</span>
    </div>
  </div>`

/** One reserved companion entry point per narrow view; an urgent action replaces the standing bag link. */
const bagQr = (scale = 3, largeScale = 4, caption = true) => `
  {% if qr_base != "" or companion_qr_base != "" %}<div class="no-shrink flex flex--col flex--center-x flex--top gap--xsmall" data-companion-qr="true">
    {% if qr_base != "" %}${qrImage(scale, largeScale)}<span class="label lg:title--small text--center" data-clamp="2">{{ qr_label | escape }}</span>
    {% else %}${qrImage(scale, largeScale, 'companion_qr_base')}${caption ? '<span class="label lg:title--small">Your bag</span>' : ''}{% endif %}
  </div>{% endif %}`

/**
 * Equipped gear with its slot named, so a find reads as a weapon or armor at a glance (X only: the OG has no spare line).
 * One line under the HUD rows in both full arrangements, wrapping where the HUD block is short.
 */
const gearName = (field: string) => `<span class="text--bold inline-block">{% if ${field} != "" %}{{ ${field} | escape }}{% else %}None{% endif %}</span>`
const gearLine = `{% assign gear_plain = weapon | default: "None" | append: armor | default: "None" %}<div class="hidden lg:block stretch-x" data-gear-line="true"><span class="title--small text--regular" ${fitClamp('gear_plain', 1, 44)}>Weapon ${gearName('weapon')} · Armor ${gearName('armor')}</span></div>`
/** The gear on two lines, weapon over armor, for the X half's narrow details column (D97). */
const gearLines = `<div class="flex flex--col flex--left gap--xsmall stretch-x" data-gear-line="stacked"><span class="title--small text--regular">Weapon ${gearName('weapon')}</span><span class="title--small text--regular">Armor ${gearName('armor')}</span></div>`
/**
 * The gear behind the attack and defense marks instead of the slot words, for the X side's header: each item keeps its
 * mark, and the armor drops under the weapon where both names don't fit one line.
 */
const gearIcon = (icon: string, field: string) =>
  `<div class="flex flex--row flex--center-y gap--[3px] w--min-0"><img class="${COUNTER_ICON}" src="{{ ${icon} }}" alt=""><span class="title--small text--regular">${gearName(field)}</span></div>`
const gearIcons = `<div class="flex flex--row flex--wrap flex--left flex--center-y gap--small stretch-x" data-gear-line="icons">${gearIcon('hud_sword', 'weapon')}${gearIcon('hud_shield', 'armor')}</div>`
/**
 * The OG's gear line: the attack and defense marks name the slots, since the HUD block has no width for the words, and
 * each name clamps on its own so a long weapon never hides the armor.
 */
const gearItem = (icon: string, field: string, none: string) =>
  `<div class="flex flex--row flex--center-y gap--[3px] w--min-0"><img class="${COUNTER_ICON}" src="{{ ${icon} }}" alt=""><span class="label" data-clamp="1">{% if ${field} != "" %}{{ ${field} | escape }}{% else %}${none}{% endif %}</span></div>`
const gearLineOg = `<div class="lg:hidden flex flex--row flex--left flex--center-y ${COUNTER_GAP} stretch-x" data-gear-line="og">${gearItem('hud_sword', 'weapon', 'No weapon')}${gearItem('hud_shield', 'armor', 'No armor')}</div>`

/**
 * `shortColumn` is the column for the portrait half and `narrowColumn` for the portrait quarter. Neither slot has the
 * height for scene art above the full-size code; the 240-pixel OG quarter also keeps the quadrant's one-line text.
 */
type WelcomeLayout = 'full' | 'halfVertical' | 'halfHorizontal' | 'quadrant' | 'shortColumn' | 'narrowColumn'

/**
 * First-run panel: setup (no active hero) or a brand-new hero before its first
 * adventure. The QR is the main element: the largest code the OG and the X each
 * serve, with a short heading and two or three lines. The panel grows to the
 * title bar and centers its content, so no size leaves a blank band below it.
 * The scan line only appears while a code is on screen (a paused service has
 * none); the OG quarter keeps one short line, the X quarter the full set.
 * The scene sits in a full-width block so the column's centering never lets it overflow a narrow panel.
 */
const welcome = (layout: WelcomeLayout) => {
  const compact = layout === 'quadrant' || layout === 'narrowColumn'
  const title = compact ? 'title title--small lg:title--large' : 'title lg:title--large'
  const column = layout === 'halfVertical' || layout === 'shortColumn' || layout === 'narrowColumn'
  const line = (visibility = '') => `${visibility ? `${visibility} ` : ''}label lg:title--small${column ? ' text--center' : ''}`
  const heading = `{% if status != "unlinked" %}{{ hero_name | escape }} is ready{% elsif data_state == "service_paused" %}Back soon{% else %}Finish setting up{% endif %}`
  const detail = (visibility = '') => `{% if status == "unlinked" %}{% if qr_base != "" %}<span class="${line(visibility)}" data-clamp="2">Scan with your phone to open the companion.</span>{% endif %}
      <span class="${line(visibility)}" data-clamp="3">{{ attention | escape }}</span>{% else %}<span class="${line(visibility)}" data-clamp="2">The first adventure starts within 15 minutes.</span>
      <span class="${line(visibility)}" data-clamp="3">Scan to open your companion: manage gear and pick where to explore.</span>{% endif %}
      <span class="${line(visibility)}">trmnlgames.com</span>`
  const lines = compact
    ? `<span class="${line('lg:hidden')}" data-clamp="2">{% if status != "unlinked" %}First adventure within 15 minutes{% elsif qr_base != "" %}Scan with your phone.{% else %}{{ attention | escape }}{% endif %}</span>
      ${detail('hidden lg:block')}`
    : detail()
  const text = `
    <div class="flex flex--col flex--left gap--small${column ? ' flex--center-x' : ''}">
      <span class="${title}" data-clamp="1">${heading}</span>
      ${lines}
    </div>`
  const code = `{% if qr_base != "" %}<div class="no-shrink">${qrImage(5, 7)}</div>{% endif %}`
  const body = column
    ? `${layout === 'halfVertical' ? `<div class="stretch-x">${scene('scene_url_small')}</div>` : ''}
    <div class="flex flex--col flex--center-x gap--small">
      ${code}${text}
    </div>`
    : `${layout === 'full' ? scene('scene_url') : ''}
    <div class="flex flex--row flex--center-x flex--center-y gap--large lg:gap--xlarge">
      ${code}${text}
    </div>`
  return `
  <div class="grow flex flex--col flex--center-x flex--center-y gap--small lg:gap--medium stretch-x">${body}
  </div>`
}


/**
 * Landscape and portrait arrangements of one view; the framework's `portrait:` classes show the one that matches the
 * device. Each hides itself in the other orientation; showing one with `portrait:flex` would make it a row whose
 * stretch-x children all take an equal share of the height. Each arrangement carries its own title bar because the
 * framework sizes a layout only when the title bar is its next sibling (`.layout:has(+.title_bar)`).
 */
const oriented = (classes: string, landscape: string, portrait: string, bar: string, portraitBar = bar) => `
<div class="${classes} portrait:hidden">${landscape}
</div>${bar.replace('class="title_bar"', 'class="title_bar portrait:hidden"')}
<div class="${classes} landscape:hidden">${portrait}
</div>${portraitBar.replace('class="title_bar"', 'class="title_bar landscape:hidden"')}`

/** A standing companion QR beside its caption, for the narrow portrait columns. */
const qrFooter = (scale = 3, largeScale = 4, classes = '') => `
  {% if qr_base != "" or companion_qr_base != "" %}<div class="${classes}no-shrink flex flex--row flex--left flex--center-y gap--small stretch-x" data-companion-qr="true">
    {% if qr_base != "" %}<div class="no-shrink">${qrImage(scale, largeScale)}</div><span class="label lg:title--small grow" data-clamp="3">{{ qr_label | escape }}</span>
    {% else %}<div class="no-shrink">${qrImage(scale, largeScale, 'companion_qr_base')}</div><span class="label lg:title--small grow">Your bag</span>{% endif %}
  </div>{% endif %}`

/**
 * The full landscape's standing link. On the OG the corner-cut code (D108) hangs out of the flow in the view's top-right
 * corner, the screen's margin standing in for its top and right quiet zone, so the hearts and XP keep clear of it while
 * the gear line runs on underneath; the X keeps its 3x code at the end of the header row.
 */
const cornerQr = `{% if qr_base == "" and home_qr_base != "" %}<div class="hidden lg:block no-shrink" data-home-qr="true"><img class="image" src="{{ home_qr_base }}/3.png" alt=""></div>` +
  `{% if corner_qr_base != "" %}<div class="lg:hidden absolute top--0 right--0" data-home-qr="corner"><img class="image" src="{{ corner_qr_base }}/2.png" alt=""></div>{% endif %}{% endif %}`

/** The portrait's standing link set into the top-right corner of the scene, its quiet zone framing it. */
const sceneQr = homeQr.replace('class="no-shrink" data-home-qr="true"', 'class="absolute top--0 right--0 flex bg--black p--1" data-home-qr="true"')

/**
 * Full, portrait: the landscape's header (hero, status and counters, then the HUD block with the gear line), then the
 * scene across the full width with the standing QR hung in its top-right corner, then the stories take the height with
 * the ranking below a captioned rule; a full bag replaces both with its panel. The OG stacks the HUD under the hero.
 * On the X the HUD slot grows from no basis with a minimum that holds a full hearts row and XP count, so the row breaks
 * only beside the longest names, where the HUD moves under the hero; otherwise it sits against the right edge and its
 * gear line wraps if the slot is short. The framework stretches a wrapping row to the layout's height, so the header
 * sits in a plain block.
 */
const fullPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <div class="no-shrink stretch-x"><div class="flex flex--col lg:flex--row lg:flex--wrap flex--top flex--left lg:flex--between gap--small lg:gap--large" data-hero-header="true">
    <div class="no-shrink flex flex--col flex--left gap--xsmall">
      ${nameRow(`<span class="title lg:hidden w--min-0" data-clamp="1">{{ hero_name | truncate: 16 | escape }}, level {{ level }}</span>
      <span class="hidden lg:inline-block title no-shrink">{{ hero_name | escape }}, level {{ level }}</span>`)}
      ${statusLine(2, 40)}
      ${heroCounters}
    </div>
    <div class="lg:grow lg:basis--0 lg:w--min-96 flex flex--col flex--left lg:flex--right" data-hud-slot="true">
      <div class="pt--2 flex flex--col flex--left gap--xsmall" data-hud-block="true">
        ${hudWide(false)}
        ${gearLine}${gearLineOg}
      </div>
    </div>
  </div></div>
  <div class="no-shrink flex flex--col gap--small stretch-x">
    <div class="relative stretch-x lg:pt--2" data-scene-row="true">${scene('scene_url_medium', 'scene_url')}${sceneQr}</div>
    ${divider}
  </div>
  {% if qr_base != "" %}${bagFullPanel(true)}
  {% else %}
  <div class="grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small stretch-x">
    ${attention('label lg:title--small', 3)}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title lg:title', 24, 40, false, 'lg')}
  </div>
  <div class="no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall lg:gap--small stretch-x pt--1 lg:pt--2" data-rank-panel="true">${rankPanel(true)}</div>
  {% endif %}
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}`

/**
 * The X's own arrangements of the half, side and quarter views (D95). The OG keeps its arrangements, each top-level
 * block marked `lg:hidden`; these blocks are `hidden lg:block` and lay their content out in an inner flex box, since
 * `lg:flex` would bring the framework's default gap over the gap classes. They borrow the X full layout's pieces: the
 * named header, the hearts and XP with their counts, the gear line, a ledger of stories and a ruled board.
 */
const xBlock = (inner: string, classes = 'no-shrink') => `<div class="hidden lg:block ${classes} stretch-x">${inner}</div>`
/**
 * The hero's name and level with the attack and defense marks. Narrow columns clamp a name longer than `clamp`
 * characters to one line; shorter names never clamp, since the clamp measures before the row settles. `wrap` lets the
 * attack and defense marks drop under a name too wide to share their line (the X half's details column, D97).
 */
const xName = (clamp = 0, size = 'title', wrap = false) => {
  const row = nameRow(`<span class="${size} ${clamp ? `w--min-0" data-clamp="{% if hero_name.size > ${clamp} %}1{% else %}0{% endif %}" data-clamp-lg="{% if hero_name.size > ${clamp} %}1{% else %}0{% endif %}` : 'no-shrink'}">{{ hero_name | escape }}, level {{ level }}</span>`)
  return wrap ? row.replace('flex--center-y gap--small stretch-x" data-name-row', 'flex--wrap flex--center-y gap--small stretch-x" data-name-row') : row
}
/**
 * The full layout's header: hero, status and named counters beside the hearts, XP and gear, with a code at the end. As
 * in the full portrait (D93) the HUD slot grows from no basis with a minimum that holds a hearts row and its count, so
 * only the longest names move it under the hero.
 */
const xHeader = (code: string) => `<div class="flex flex--row flex--top gap--large stretch-x">
      <div class="grow w--min-0"><div class="flex flex--row flex--wrap flex--top flex--between gap--large" data-hero-header="x">
        <div class="no-shrink flex flex--col flex--left gap--xsmall">${xName()}${statusLine(2, 56)}${heroCounters}</div>
        <div class="grow basis--0 w--min-80 flex flex--col flex--right" data-hud-slot="true"><div class="pt--2 flex flex--col flex--left gap--xsmall" data-hud-block="true">${hudWide(false)}${gearLine}</div></div>
      </div></div>${code}
    </div>`
/** A column's stacked header: the name line, status and named counters, then the hearts, XP and gear lines. */
const xStackedHeader = (clamp: number, gear = gearLine) => `<div class="flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x" data-hero-header="x">${xName(clamp)}${statusLine(2, 40)}${heroCounters}${hearts(true)}${xpTicks()}${gear}</div>`
/**
 * The X header's code: the urgent code with its label when there is one, else the standing bag code. Unlabelled, as
 * in the full layout's corner (D88).
 */
const xCode = `{% if qr_base != "" or companion_qr_base != "" %}<div class="no-shrink flex flex--col flex--center-x gap--xsmall w--[96px]" data-companion-qr="true">{% if qr_base != "" %}<img class="image" src="{{ qr_base }}/3.png" alt=""><span class="title--small text--center" data-clamp="2">{{ qr_label | escape }}</span>{% else %}<img class="image" src="{{ companion_qr_base }}/3.png" alt="">{% endif %}</div>{% endif %}`
/** The standing bag code hung in a scene's corner, like the full portrait's (D93); an urgent code keeps its own block. */
const xSceneCode = `{% if qr_base == "" and companion_qr_base != "" %}<div class="absolute top--0 right--0 flex bg--black p--1" data-companion-qr="true"><img class="image" src="{{ companion_qr_base }}/3.png" alt=""></div>{% endif %}`
const xScene = (field: SceneField, code = '') => `{% if ${field} != "" %}<div class="relative no-shrink" data-scene-row="x"><img class="image" src="{{ ${field} }}" alt="">${code}</div>{% endif %}`
/**
 * A ruled board of up to `limit` rows under its caption; a hero below them takes the last row's place. The X keeps
 * whole rows at its size, so the narrow columns clamp the name rather than the score.
 */
const xBoard = (limit: number, fit = false) => `<div class="flex flex--col flex--left flex--top flex--stretch-x gap--xsmall stretch-x" data-board-column="x"${fit ? ' data-fit-rows="true"' : ''}>
      ${rankCaption}
      {% unless rank %}{% if rank_status == "dormant" %}<span class="title--small">Not ranked while paused</span>{% else %}<span class="title--small">Ranking within the hour</span>{% endif %}{% endunless %}
      {% assign board_rows = top10 | default: top5 %}{% assign board_limit = ${limit} %}{% if rank and rank > ${limit} %}{% assign board_limit = ${limit - 1} %}{% endif %}
      {% for row in board_rows limit: board_limit %}{% unless forloop.first %}<div class="border--h-30 stretch-x"></div>{% endunless %}${rankRow('row.rank', 'row.score', '', 'rank and row.rank == rank')}{% endfor %}
      {% if rank and rank > ${limit} %}<div class="border--h-30 stretch-x"></div>${rankRow('rank', 'leaderboard_score', '', 'true')}{% endif %}
    </div>`
/**
 * The stories under the attention line, the recap (capped at `recapLines`, none for 0) and the badge. `inline` puts each
 * story on one line with stat columns.
 */
const xLedger = (inline: boolean, recapLines: number) => `<div class="grow w--min-0 h--full flex flex--col flex--left flex--top flex--stretch-x gap--small" data-ledger="x">
      {% if attention %}${attention('title--small', 3)}{% else %}${attention('title--small', 3)}${recapLines ? recapBlock(recapLines) : ''}{% endif %}
      {% unless recap %}${celebrationBadge('title--small')}{% endunless %}${inline ? storyList(2, 'title', 24, 64, false, 'lg') : storyList(2, 'title', 24, 50)}
    </div>`

/**
 * Half, landscape on the X (D97): a details column (the hero, status and named counters over the hearts, XP and gear,
 * then a board fitted to what is left of the column; its counts go by their marks alone, so the stance shares their row, D103) beside the rune rule stood on end; to its right the 3x scene and the
 * code over a thin rule (horizontal room is spare, height is not), then a one-line ledger. The hero block sits tight (D103), so the board shows up to four rows, which the recap ribbon or a long name can shorten.
 */
const xHalfWide = `
  ${xBlock(`<div class="grid h--full stretch-x gap--large">
    <div class="col--span-4 h--full w--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--small" data-fit-bound="true" data-details-column="x">
      <div class="flex flex--col flex--left gap--xsmall stretch-x">
        <div class="flex flex--col flex--left gap--xsmall stretch-x" data-hero-header="x">${xName(12, 'title', true)}${statusLine(2, 56)}${hudRow('data-counters="2"', goldPotions() + bagCount() + stanceCount(), COUNTER_GAP)}</div>
        <div class="flex flex--col flex--left gap--xsmall stretch-x" data-hud-block="true">${hudWide(false)}${gearLines}</div>
      </div>
      ${xBoard(4, true)}
    </div>
    <div class="col--span-8 h--full w--min-0 flex flex--row flex--stretch-y gap--large">
      ${runeRuleV}
      <div class="grow w--min-0 h--full flex flex--col flex--top flex--stretch-x gap--xsmall">
        <div class="no-shrink flex flex--row flex--center-y gap--large stretch-x"><div class="grow w--min-0 flex flex--row flex--center-x">${xScene('scene_url_medium')}</div>${xCode}</div>
        <div class="no-shrink bg--black h--[1px] stretch-x" data-scene-rule="true"></div>
        ${xLedger(true, 0)}
      </div>
    </div>
  </div>`, 'grow h--min-0')}`

/**
 * Half, portrait on the X: the full header, the scene (the bag code hung in its corner, so the header keeps the width
 * for the hero and the HUD side by side) beside a board, a rune rule, then a one-line ledger. An urgent code takes the
 * header's end with its label.
 */
const xHalfTall = `
  ${xBlock(xHeader(`{% if qr_base != "" %}${xCode}{% endif %}`))}
  ${xBlock(`<div class="flex flex--col gap--small stretch-x"><div class="flex flex--row flex--top gap--large stretch-x">${xScene('scene_url_medium', xSceneCode)}<div class="grow w--min-0">${xBoard(5)}</div></div>${divider}</div>`)}
  ${xBlock(`<div class="flex flex--col flex--stretch-x h--full stretch-x">${xLedger(true, 1)}</div>`, 'grow h--min-0')}`

/**
 * Side on the X: the stacked header with the code in its top-right corner, the gear under both behind the attack and
 * defense marks (one line where the slot words would wrap), the scene clear of any code, a rune rule, the stories, the board, then the recap ribbon
 * at the foot as in the full portrait (D104). The portrait column, narrower, keeps the gear words, takes the 2x scene
 * with the recap over the stories, and closes with the bag code instead.
 */
const xSide = (portrait: boolean) => portrait
  ? `
  ${xBlock(xStackedHeader(10))}
  ${xBlock(`<div class="flex flex--col flex--center-x gap--small stretch-x">${xScene('scene_url_small')}${divider}</div>`)}
  ${xBlock(`<div class="flex flex--col flex--stretch-x h--full stretch-x">${xLedger(false, 3)}</div>`, 'grow h--min-0')}
  ${xBlock(xBoard(5))}
  ${xBlock(qrFooter(3, 3))}`
  : `
  ${xBlock(`<div class="flex flex--col flex--stretch-x gap--xsmall stretch-x"><div class="flex flex--row flex--top gap--large stretch-x"><div class="grow w--min-0">${xStackedHeader(12, '')}</div>${xCode}</div>${gearIcons}</div>`)}
  ${xBlock(`<div class="flex flex--col flex--center-x gap--small stretch-x">${xScene('scene_url_medium')}${divider}</div>`)}
  ${xBlock(`<div class="flex flex--col flex--stretch-x h--full stretch-x">${xLedger(false, 0)}</div>`, 'grow h--min-0')}
  ${xBlock(xBoard(4))}
  {% unless attention %}${xBlock(recapRibbon)}{% endunless %}`

/**
 * Quarter on the X: the name line and status beside the bag code, the hearts and XP with their counts under them, then
 * the stories across the width. The landscape's tiny scene beside the code is gone, and its recap is the ribbon at the
 * foot as in the side (D104); the portrait keeps the recap over the stories and closes with the code.
 */
const xQuadrant = (portrait: boolean) => `
  ${xBlock(portrait
    ? `<div class="flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x" data-hero-header="x">${xName(10, 'title--small')}${hearts(true)}${xpTicks()}</div>`
    : `<div class="flex flex--row flex--top gap--medium stretch-x"><div class="grow w--min-0 flex flex--col flex--left flex--stretch-x gap--xsmall" data-hero-header="x">${xName(14, 'title--small')}${statusLine(1, 40)}${hearts(true)}${xpTicks()}</div>${xCode}</div>`)}
  ${xBlock(`<div class="flex flex--col flex--stretch-x h--full stretch-x"><div class="grow w--min-0 h--full flex flex--col flex--left flex--top flex--stretch-x gap--xsmall" data-ledger="x">
      {% if attention %}${attention('title--small', 3)}{% else %}${attention('title--small', 3)}${portrait ? recapBlock(2) : ''}{% endif %}
      ${storyList(2, 'title--small', 16, 40, portrait)}
    </div></div>`, 'grow h--min-0')}
  ${portrait ? xBlock(qrFooter(3, 3)) : `{% unless attention %}${xBlock(recapRibbon)}{% endunless %}`}`

/** Side, portrait: a narrow column. Hero and health first, the stories take the height, the companion QR closes the column. */
const halfVerticalPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <div class="lg:hidden no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">
    <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
    ${statusLine(2, 24)}${hearts(false)}${xpTicks()}${counters()}
  </div>
  <div class="lg:hidden no-shrink stretch-x">${divider}</div>
  <div class="lg:hidden grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--small stretch-x">
    {% if attention %}${attention('label lg:title--small', 4)}{% else %}${attention('label lg:title--small', 4)}${recapBlock()}{% endif %}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(3, 'label lg:title--small', 16, 26, true)}
  </div>
  ${qrFooter(3, 4, 'lg:hidden ')}${xSide(true)}
  {% endif %}`

/** Quarter, portrait: hero line, the stories, then the companion QR across the bottom. */
const quadrantPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('narrowColumn')}
  {% else %}
  <div class="lg:hidden no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">
    <span class="label" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
    ${hearts(false)}
  </div>
  <div class="lg:hidden grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall stretch-x">
    {% if attention %}${attention('label lg:title--small', 3)}{% else %}${attention('label lg:title--small', 3)}${recapBlock(2)}{% endif %}
    ${storyList(3, 'label lg:title--small', 16, 24, true)}
  </div>
  ${qrFooter(3, 4, 'lg:hidden ')}${xQuadrant(true)}
  {% endif %}`

/**
 * Side, landscape: hero and QR side by side, then the recap and stories. A portrait Half has nearly the same proportions
 * but less height, so it uses this arrangement without the scene and with the one-line recap.
 */
const halfVerticalBody = (withScene: boolean) => `
  {% if status == "unlinked" or first_run %}${welcome(withScene ? 'halfVertical' : 'shortColumn')}
  {% else %}
  <div class="lg:hidden grid no-shrink stretch-x gap--small">
    <div class="col--span-8 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall">
      <span class="title title--small" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${statusLine(2, 42)}${hearts(false)}
      ${counters()}
    </div>
    <div class="col--span-4 flex flex--col flex--center-x flex--top">${bagQr()}</div>
  </div>
  <div class="lg:hidden no-shrink stretch-x">${divider}</div>
  <div class="lg:hidden grow h--full h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--small pt--2">
    {% if attention %}${attention('label lg:title--small', 3)}{% else %}${attention('label lg:title--small', 3)}${recapBlock()}{% endif %}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title title--small lg:title', 24, 50)}
  </div>
  ${withScene ? xSide(false) : xHalfTall}
  {% endif %}
`

const halfVerticalLandscape = halfVerticalBody(true)
const halfHorizontalPortrait = halfVerticalBody(false)

export const markupFull = `${glyphAssigns([16, 24])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--xsmall lg:gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('full')}
  {% else %}
  <div class="relative no-shrink flex flex--row flex--top gap--medium stretch-x">
    <div class="grow w--min-0 flex flex--row flex--top flex--between gap--medium lg:gap--large" data-hero-header="true">
      <div class="no-shrink flex flex--col flex--left gap--xsmall">
        ${nameRow(`<span class="title lg:hidden w--min-0" data-clamp="1">{{ hero_name | truncate: 12 | escape }}, level {{ level }}</span>
        <span class="hidden lg:inline-block title no-shrink">{{ hero_name | escape }}, level {{ level }}</span>`)}
        ${statusLine(2, 56)}
        ${heroCounters}
      </div>
      <div class="w--min-0 pt--2 flex flex--col flex--left gap--xsmall" data-hud-block="true">
        <div class="flex flex--col flex--left gap--xsmall pr--16 lg:pr--0">${hudWide(false)}</div>
        ${gearLine}${gearLineOg}
      </div>
    </div>
    ${cornerQr}
  </div>
  <div class="no-shrink flex flex--col gap--small stretch-x">
    <div class="flex flex--row flex--top lg:flex--center-x gap--medium stretch-x" data-scene-row="true">
      {% if scene_url != "" %}<div class="no-shrink">${sceneImage('scene_url_medium')}<img class="image hidden lg:block" src="{{ scene_url_large }}" alt=""></div>{% endif %}
      ${ogBoard}
    </div>
    <div class="grid stretch-x gap--none" data-rune-rule="true">
      <div class="col--span-12 lg:col--span-8 flex flex--row flex--center-y gap--none">${runeRule}</div>
      <div class="hidden lg:flex col--span-4 flex--row flex--center-y">{% if qr_base == "" %}${rankCaption}{% else %}${ruleFill}{% endif %}</div>
    </div>
  </div>
  {% if qr_base != "" %}${bagFullPanel(false)}
  {% else %}
  <div class="grid grow h--full h--min-0 stretch-x gap--small lg:gap--large pt--1 lg:pt--2" data-story-columns="true">
    <div class="col--span-12 lg:col--span-8 flex flex--col flex--left flex--top gap--xsmall lg:gap--small h--full">
      ${attention('label lg:title--small', 2)}
      {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title lg:title', 24, 64, false, 'all', 74)}
    </div>
    <div class="hidden lg:block col--span-4"><div class="flex flex--row flex--stretch-y gap--medium h--full" data-board-column="true">
      ${columnRule}
      <div class="grow w--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall">
        ${rankPanel(false)}
      </div>
    </div></div>
  </div>
  {% endif %}
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}
`, fullPortrait, titleBar)}${fitStories}`

export const markupHalfHorizontal = `${glyphAssigns([16, 24])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('halfHorizontal')}
  {% else %}
  <div class="lg:hidden grid grow h--full h--min-0 stretch-x gap--medium">
    <div class="col--span-4 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall">
      <span class="title title--small" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${statusLine(2, 36)}${hearts(false)}
      ${counters()}
    </div>
    <div class="col--span-6 h--full flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      ${attention('label lg:title--small', 3)}${storyList(2, 'label lg:title--small', 16, 62)}
    </div>
    <div class="col--span-2 flex flex--col flex--center-x flex--top">${bagQr()}</div>
  </div>${xHalfWide}
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}
`, halfHorizontalPortrait, titleBar)}${fitStories}`

export const markupHalfVertical = `${glyphAssigns([16, 24])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--small lg:gap--medium', halfVerticalLandscape, halfVerticalPortrait, titleBar, titleBarNarrow)}${fitStories}`

export const markupQuadrant = `${glyphAssigns([16])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('quadrant')}
  {% else %}
    <div class="lg:hidden no-shrink flex flex--row flex--left flex--center-y gap--small stretch-x">
      <span class="label grow w--min-0" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${hearts(false)}
    </div>
    <div class="lg:hidden grid grow h--full h--min-0 stretch-x gap--small">
      <div class="col--span-8 h--full flex flex--col flex--left flex--top flex--stretch-x gap--xsmall">
        {% if attention %}${attention('label lg:title--small', 3)}{% else %}${attention('label lg:title--small', 3)}${recapBlock(2)}{% endif %}
        ${storyList(2, 'label lg:title--small', 16, 40)}
      </div>
      <div class="col--span-4 flex flex--col flex--center-x flex--top gap--small">${bagQr()}</div>
    </div>${xQuadrant(false)}
  {% endif %}
`, quadrantPortrait, titleBar, titleBarNarrow)}${fitStories}`

export const screenMarkup = {
  markup: markupFull,
  markup_half_horizontal: markupHalfHorizontal,
  markup_half_vertical: markupHalfVertical,
  markup_quadrant: markupQuadrant,
} as const

/** Largest real UTC offsets are -12:00 and +14:00. */
const MAX_UTC_OFFSET_SECONDS = 14 * 3600

/**
 * The `utc_offset` merge variable from TRMNL's `trmnl[user][utc_offset]` form field (seconds). Anything that is not a
 * whole number of seconds within ±14 hours is treated as absent, which omits the next-tick line.
 */
export function parseUtcOffset(raw: string | null): number | null {
  if (raw === null || !/^-?\d{1,5}$/.test(raw.trim())) return null
  const seconds = Number(raw.trim())
  return Math.abs(seconds) <= MAX_UTC_OFFSET_SECONDS ? seconds : null
}
