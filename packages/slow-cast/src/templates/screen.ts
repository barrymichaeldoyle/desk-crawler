/**
 * Slow Cast screen markup (slow-cast.md "Device"). TRMNL framework 3.4 Liquid over the flat payload. TRMNL wraps
 * each layout in its own `.view`, so markup starts at the layout and closes with the title bar (the framework sizes a
 * layout only when the title bar is its next sibling). Each layout has a landscape and a portrait arrangement; images
 * are whole-number scales of 1-bit art (`scene_base` and `qr_base` plus `/<scale>.png`), chosen per size and screen so
 * every pixel stays crisp: `lg:` swaps in the TRMNL X's larger scales. User text arrives only as escaped variables.
 *
 * Template v2 (2026-10-10) brings the screen up to Desk Crawler's HUD: marks instead of words for the counters
 * (cooler, bait, gold, logbook), XP as ten half-step ticks, the time of day and weather as marks, a glyph before every
 * story, the attention line inverted behind its mark, the board's 7-day XP, and the recap as facts behind their marks.
 * The OG's full landscape shows five stories where three left the foot empty; the X's sets its stories beside the board.
 */
import { markUri, STORY_GLYPHS, type ScMark } from '../art/marks'

export const TEMPLATE_VERSION = 2

const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`

/** Title-bar icon: a float on a ripple. Inline, so it never needs the network. */
const TITLE_ICON = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="square">' +
    '<path d="M12 3v4"/><circle cx="12" cy="11" r="4"/><path d="M12 9v4" stroke="black"/><path d="M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>',
)

/** Every mark a layout uses, assigned once at its top so the markup repeats a variable rather than the SVG. */
const MARKS: readonly ScMark[] = ['cooler', 'hook', 'coin', 'book', 'pin', 'trophy', 'star', 'day', 'dawn', 'dusk', 'night', 'clear', 'overcast', 'rain', 'wind', 'fog', 'tickEmpty', 'tickHalf', 'tickFull', ...STORY_GLYPHS]
const ASSIGNS = MARKS.map((mark) => `{% assign m_${mark} = "${mark.startsWith('tick') ? markUri(mark, 36, 16) : markUri(mark, 32)}" %}`).join('')

/** 16px on the OG; 20px on the X, where the text beside it is larger. */
const ICON = 'w--[16px] h--[16px] lg:w--[20px] lg:h--[20px] no-shrink'
const LABEL = 'label lg:title--small'

/** One count behind its mark; the mark sits three pixels from its text. Counts are short and their row wraps, so none clamps. */
const counter = (mark: string, text: string, data = '') => `<div class="flex flex--row flex--center-y gap--[3px] no-shrink"${data}><img class="${ICON}" src="{{ ${mark} }}" alt=""><span class="${LABEL}">${text}</span></div>`

/** A wrapping row of counters a medium gap apart, so each number reads as its own mark's. */
const row = (inner: string, data: string) => `<div class="flex flex--row flex--wrap flex--left flex--center-y gap--medium stretch-x" ${data}>${inner}</div>`

/** The time of day and the weather, each behind its mark ("Dusk", "Overcast"). */
const conditionMarks =
  `{% if band %}{% case band %}{% when "dawn" %}{% assign m_band = m_dawn %}{% when "dusk" %}{% assign m_band = m_dusk %}{% when "night" %}{% assign m_band = m_night %}{% else %}{% assign m_band = m_day %}{% endcase %}` +
  `{% case weather %}{% when "overcast" %}{% assign m_weather = m_overcast %}{% when "rain" %}{% assign m_weather = m_rain %}{% when "wind" %}{% assign m_weather = m_wind %}{% when "fog" %}{% assign m_weather = m_fog %}{% else %}{% assign m_weather = m_clear %}{% endcase %}` +
  `${counter('m_band', '{{ band | capitalize }}', ' data-band="{{ band }}"')}${counter('m_weather', '{{ weather | capitalize }}', ' data-weather="{{ weather }}"')}{% endif %}`

/** Where the angler is: the one counter that can be long ("Heading to the Harbour Pier"), so it may wrap to two lines. */
const place = `<div class="flex flex--row flex--top gap--[3px] w--min-0" data-place="true"><img class="${ICON} mt--[1px]" src="{{ m_pin }}" alt=""><span class="${LABEL} w--min-0" data-clamp="2">{{ status_label | escape }}</span></div>`

/** Where the angler is, then the conditions. */
const statusRow = (withConditions = true) => row(`${place}${withConditions ? conditionMarks : ''}`, 'data-status-row="true"')

/**
 * Cooler, bait, gold and logbook. `short` drops the logbook for the half-height column; `compact` also drops the bait
 * for the narrowest columns.
 */
const counters = (fit: 'all' | 'short' | 'compact' = 'all') =>
  `{% if cooler_label %}${row(
    counter('m_cooler', '{{ cooler_label }}', ' data-cooler="{{ cooler_label }}"') +
      (fit === 'compact' ? '' : counter('m_hook', '{% if bait_count %}{{ bait_name | escape }} {{ bait_count }}{% else %}Bare hook{% endif %}', ' data-bait="true"')) +
      counter('m_coin', '{{ gold }}') +
      (fit === 'all' ? counter('m_book', '{{ species_logged }}/{{ species_total }}', ' data-logbook="true"') : ''),
    'data-counters="true"',
  )}{% endif %}`

/** XP as ten half-step ticks with the numbers after them, Desk Crawler's bar (same rounding, so both Liquids agree). */
const xpTicks = (count = true) =>
  `{% if xp_to_next %}{% assign xp_halves = xp_pct | default: 0 | times: 20 | plus: 50 | divided_by: 100 | floor %}<div class="flex flex--row flex--wrap flex--left flex--center-y gap--small no-shrink" data-xp-ticks="{{ xp_halves }}"><div class="flex flex--row gap--[2px] no-shrink">{% for i in (1..10) %}{% assign tick_right = i | times: 2 %}{% assign tick_left = tick_right | minus: 1 %}<img class="w--[18px] h--[8px] lg:w--[22px] lg:h--[10px] no-shrink" src="{% if xp_halves >= tick_right %}{{ m_tickFull }}{% elsif xp_halves >= tick_left %}{{ m_tickHalf }}{% else %}{{ m_tickEmpty }}{% endif %}" alt="">{% endfor %}</div>${count ? `<span class="${LABEL} no-shrink">{{ xp }}/{{ xp_to_next }} XP</span>` : ''}</div>{% endif %}`

/**
 * The title bar with the weekly fly code. A narrow portrait column (side, quarter) cannot fit the name beside the
 * code, so while a code shows it takes the name's place there with the short label, as Desk Crawler's keepsake does.
 */
const titleBar = (orientation: 'landscape' | 'portrait', narrow = false) => `
<div class="title_bar ${orientation === 'landscape' ? 'portrait:hidden' : 'landscape:hidden'}">
  <img class="image image-stroke" src="${TITLE_ICON}" alt="">
  <span class="title${narrow ? '{% if fly_code %} hidden lg:inline-block{% endif %}' : ''}">Slow Cast</span>
  {% if fly_code %}<span class="instance">${narrow ? 'Fly' : 'Fly code'} {{ fly_code | escape }}</span>{% endif %}
</div>`

/** One layout in both orientations, each followed by its own title bar; the marks are assigned once ahead of both. */
const oriented = (classes: string, landscape: string, portrait: string, narrowPortrait = false) => `${ASSIGNS}
<div class="${classes} portrait:hidden">${landscape}
</div>${titleBar('landscape')}
<div class="${classes} landscape:hidden">${portrait}
</div>${titleBar('portrait', narrowPortrait)}`

/** The scene at an OG scale and a larger X scale. */
const scene = (og: number, x: number, classes = 'stretch-x') =>
  `{% if scene_base != "" %}<div class="${classes} no-shrink flex flex--row flex--center-x"><img class="image lg:hidden" src="{{ scene_base }}/${og}.png" alt=""><img class="image hidden lg:block" src="{{ scene_base }}/${x}.png" alt=""></div>{% endif %}`

const qr = (og: number, x: number) =>
  `{% if qr_base != "" %}<div class="no-shrink" data-companion-qr="true"><img class="image lg:hidden" src="{{ qr_base }}/${og}.png" alt=""><img class="image hidden lg:block" src="{{ qr_base }}/${x}.png" alt=""></div>{% endif %}`

/** The angler's name, then the level beside it. */
const nameLine = (classes = 'title title--small lg:title') =>
  `<span class="${classes} w--min-0" data-clamp="1">{{ alias | escape }}</span>{% if level %}<span class="${LABEL} no-shrink">Level {{ level }}</span>{% endif %}`

/** The cooler, bait or service line, inverted behind its mark so it reads first. */
const attention = (clamp = 2) =>
  `{% if attention %}{% case attention_kind %}{% when "cooler" %}{% assign m_attention = m_cooler %}{% when "bait" %}{% assign m_attention = m_bait_out %}{% else %}{% assign m_attention = m_system %}{% endcase %}` +
  `<div class="flex flex--row flex--left flex--center-y gap--small no-shrink stretch-x" data-attention="{{ attention_kind }}"><img class="${ICON}" src="{{ m_attention }}" alt=""><span class="${LABEL} label--inverted" data-clamp="${clamp}">{{ attention | escape }}</span></div>{% endif %}`

/** One story's glyph: its kind's, a star for a level-up, a dot for anything else. */
const storyGlyph = `{% case story.kind %}${STORY_GLYPHS.filter((kind) => kind !== 'system')
  .map((kind) => `{% when "${kind}" %}{% assign m_story = m_${kind} %}`)
  .join('')}{% when "levelup" %}{% assign m_story = m_star %}{% else %}{% assign m_story = m_system %}{% endcase %}`

/** The newest stories, each behind its glyph. */
const stories = (limit: number, clamp = 1, classes = 'description lg:title--small') =>
  `<div class="flex flex--col flex--left gap--xsmall stretch-x h--min-0" data-stories="true">{% for story in stories limit:${limit} %}${storyGlyph}<div class="flex flex--row flex--top gap--small stretch-x" data-story="{{ story.kind }}"><img class="${ICON} mt--[1px]" src="{{ m_story }}" alt=""><span class="${classes} grow w--min-0" data-clamp="${clamp}">{{ story.summary | escape }}</span></div>{% endfor %}</div>`

/**
 * The seven-day board of the angler's level group: the trophy and group, the angler's rank, then each row's name and
 * 7-day XP. Each row is itself the label, so an inverted own row keeps its text white (a `.label` child would set its
 * own colour), as Desk Crawler's board does. An own row appended below the top shows its level.
 */
const board = (rows: number) =>
  `{% if board %}<div class="no-shrink flex flex--col gap--xsmall w--full" data-board="true">` +
  `<div class="flex flex--row flex--center-y gap--[3px] w--full"><img class="${ICON}" src="{{ m_trophy }}" alt=""><span class="${LABEL} grow w--min-0" data-clamp="1">{{ board.label | escape }}</span></div>` +
  `<span class="${LABEL} w--full" data-clamp="1">{{ board.rank_label | escape }}</span>` +
  `{% for row in board.rows limit:${rows} %}<div class="${LABEL} flex flex--row flex--between flex--center-y gap--small w--full{% if row.own %} label--inverted{% endif %}" data-rank-row="{{ row.rank }}"><span class="grow w--min-0" data-clamp="1">{{ row.rank }}. {{ row.name | escape }}</span><span class="no-shrink">{% if row.score %}{{ row.score }}{% else %}L{{ row.level }}{% endif %}</span></div>{% endfor %}</div>{% endif %}`

/**
 * The twelve-hour recap as Desk Crawler's ribbon: a rule, then its name in bold and each fact behind its mark. Each
 * piece is unbreakable, so a narrow column wraps between facts rather than inside one. A spacer ahead of it holds it
 * at the foot of the layout.
 */
const recap = () =>
  `{% if recap_items %}<div class="grow"></div><div class="no-shrink stretch-x" data-recap="true"><div class="border--h-30 stretch-x"></div>` +
  `<div class="pt--2 flex flex--row flex--wrap flex--left flex--center-y gap--small stretch-x"><span class="${LABEL} text--bold no-shrink">Last 12 hours</span>` +
  `{% for item in recap_items %}{% case item.k %}{% when "best" %}{% assign m_recap = m_trophy %}{% when "got_away" %}{% assign m_recap = m_got_away %}{% else %}{% assign m_recap = m_catch %}{% endcase %}` +
  `<div class="flex flex--row flex--center-y gap--[3px] no-shrink" data-recap-item="{{ item.k }}"><img class="${ICON}" src="{{ m_recap }}" alt=""><span class="${LABEL}">{{ item.text | escape }}</span></div>{% endfor %}</div></div>{% endif %}`

/**
 * The newest fish among the stories shown: its sprite beside its name and weight, "Released" when the cooler was full.
 * Only the layouts with room for it show it (the X, and the full portrait).
 */
const catchPanel = (og: number, x: number) =>
  `{% if newest_catch %}<div class="flex flex--row flex--left flex--center-y gap--medium stretch-x no-shrink" data-catch="true">` +
  `{% if newest_catch.fish_base != "" %}<div class="no-shrink"><img class="image lg:hidden" src="{{ newest_catch.fish_base }}/${og}.png" alt=""><img class="image hidden lg:block" src="{{ newest_catch.fish_base }}/${x}.png" alt=""></div>{% endif %}` +
  `<div class="flex flex--col flex--left gap--xsmall grow w--min-0"><span class="${LABEL}">{% if newest_catch.released %}Released{% else %}Newest catch{% endif %}</span>` +
  `<span class="title title--small lg:title" data-clamp="1">{{ newest_catch.name | escape }}</span>{% if newest_catch.weight_label %}<span class="${LABEL}">{{ newest_catch.weight_label }}</span>{% endif %}</div></div>{% endif %}`

/** Before activation: what to do next and the code to the companion. */
const welcome = (compact: boolean) => `
  <div class="flex flex--${compact ? 'row' : 'col'} flex--center-x flex--center-y gap--medium stretch-x grow">
    ${qr(compact ? 2 : 3, compact ? 3 : 5)}
    <div class="flex flex--col flex--center-x gap--xsmall">
      <span class="${compact ? 'title title--small' : 'title'} lg:title--large">{% if status == "pending" %}{{ alias | escape }} is ready to fish{% elsif data_state == "service_paused" %}Back soon{% else %}Finish setting up{% endif %}</span>
      <span class="label lg:title--small text--center" data-clamp="3">{% if status == "pending" %}Save the plugin in TRMNL. The first cast is within 15 minutes.{% else %}{{ attention | escape }}{% endif %}</span>
      <span class="label lg:title--small">trmnlgames.com</span>
    </div>
  </div>`

const ready = (body: string, compact = false) => `{% if status == "unlinked" or status == "pending" %}${welcome(compact)}{% else %}${body}{% endif %}`

/** The full header: name, level and XP; where and when; the counters; the code in the corner. */
const header = (qrOg: number, qrX: number) => `
    <div class="no-shrink flex flex--row flex--between flex--top gap--small stretch-x">
      <div class="flex flex--col flex--left gap--xsmall grow w--min-0">
        <div class="flex flex--row flex--wrap flex--left flex--center-y gap--small stretch-x" data-name-row="true">${nameLine()}${xpTicks()}</div>
        ${statusRow()}
        ${counters()}
      </div>
      ${qr(qrOg, qrX)}
    </div>`

const full = oriented(
  'layout layout--col layout--top layout--stretch-x gap--small lg:gap--large',
  ready(`${header(2, 4)}
    <div class="lg:hidden no-shrink stretch-x">{% if board %}<div class="flex flex--row flex--top gap--medium stretch-x">${scene(4, 4, '')}<div class="grow w--min-0">${board(5)}</div></div>{% else %}${scene(5, 5)}{% endif %}</div>
    <div class="lg:hidden flex flex--col flex--left flex--top gap--small stretch-x no-shrink">${attention(1)}{% if attention %}${stories(4)}{% else %}${stories(5)}{% endif %}</div>
    <div class="hidden lg:flex flex--col flex--left flex--top gap--medium stretch-x no-shrink">${scene(6, 6)}${attention(1)}
      <div class="flex flex--row flex--top gap--large stretch-x"><div class="grow w--min-0">${stories(5, 2)}</div><div class="no-shrink w--[38%] flex flex--col flex--left gap--medium">${board(6)}{% assign board_rows = board.rows | size %}{% if attention == nil and board_rows < 6 %}${catchPanel(4, 5)}{% endif %}</div></div>
    </div>
    ${recap()}`),
  ready(`${header(2, 4)}
    ${scene(3, 8)}
    ${attention(3)}
    ${stories(5, 2, 'label lg:title')}
    ${catchPanel(3, 8)}
    ${board(6)}
    ${recap()}`),
)

const halfHorizontal = oriented(
  'layout layout--row layout--left layout--stretch-y gap--medium',
  ready(`
    <div class="no-shrink flex flex--col flex--center-y gap--small">${scene(2, 4)}</div>
    <div class="flex flex--col flex--left gap--xsmall grow w--min-0 h--full">
      <div class="flex flex--row flex--wrap flex--left flex--center-y gap--small stretch-x">${nameLine()}${xpTicks()}</div>
      ${statusRow()}
      ${counters('short')}
      {% if attention %}${attention(1)}{% else %}${stories(1, 1)}{% endif %}
    </div>
    ${qr(2, 4)}`, true),
  ready(`
    <div class="flex flex--col flex--left gap--small grow w--min-0 h--full">
      <div class="flex flex--row flex--center-y gap--small stretch-x"><div class="flex flex--row flex--left flex--center-y gap--small grow w--min-0">${nameLine()}</div>${qr(2, 4)}</div>
      ${scene(2, 6)}
      ${statusRow()}
      ${counters()}
      {% if attention %}${attention()}{% else %}${stories(2, 2)}{% endif %}
    </div>`),
)

const halfVertical = oriented(
  'layout layout--col layout--top layout--stretch-x gap--small',
  ready(`
    <div class="no-shrink flex flex--row flex--center-y gap--small stretch-x"><div class="flex flex--row flex--left flex--center-y gap--small grow w--min-0">${nameLine()}</div>${qr(2, 4)}</div>
    ${scene(2, 5)}
    ${xpTicks()}
    ${statusRow()}
    ${counters()}
    ${attention()}
    ${stories(3, 2)}
    ${recap()}`),
  ready(`
    <div class="no-shrink flex flex--row flex--left flex--center-y gap--small stretch-x">${nameLine('title title--small')}</div>
    ${scene(1, 4)}
    ${xpTicks()}
    ${statusRow()}
    ${counters('short')}
    ${attention(3)}
    ${stories(3, 3, 'description')}
    ${board(5)}
    <div class="grow"></div>
    <div class="no-shrink flex flex--row flex--center-x stretch-x">${qr(2, 4)}</div>`),
  true,
)

const quadrant = oriented(
  'layout layout--col layout--top layout--stretch-x gap--small',
  ready(`
    <div class="no-shrink flex flex--row flex--top gap--small stretch-x">
      <div class="flex flex--col flex--left gap--xsmall grow w--min-0">
        <div class="flex flex--row flex--left flex--center-y gap--small stretch-x">${nameLine('title title--small lg:title')}</div>
        ${statusRow(false)}
        ${counters('compact')}
      </div>
      ${qr(2, 4)}
    </div>
    {% if attention %}${attention(2)}{% else %}${stories(1, 2)}{% endif %}`, true),
  ready(`
    <div class="no-shrink flex flex--row flex--left flex--center-y gap--small stretch-x">${nameLine('title title--small')}</div>
    ${statusRow(false)}
    ${counters('compact')}
    {% if attention %}${attention(3)}{% else %}${stories(2, 3, 'description')}{% endif %}
    <div class="grow"></div>
    <div class="no-shrink flex flex--row flex--center-x stretch-x">${qr(2, 4)}</div>`, true),
  true,
)

export const screenMarkup = {
  markup: full,
  markup_half_horizontal: halfHorizontal,
  markup_half_vertical: halfVertical,
  markup_quadrant: quadrant,
} as const
