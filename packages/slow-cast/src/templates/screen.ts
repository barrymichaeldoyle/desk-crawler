/**
 * Slow Cast screen markup v1 (slow-cast.md "Device"). TRMNL framework 3.4 Liquid over the flat payload. TRMNL wraps
 * each layout in its own `.view`, so markup starts at the layout and closes with the title bar (the framework sizes a
 * layout only when the title bar is its next sibling). Each layout has a landscape and a portrait arrangement; images
 * are whole-number scales of 1-bit art (`scene_base` and `qr_base` plus `/<scale>.png`), chosen per size and screen so
 * every pixel stays crisp: `lg:` swaps in the TRMNL X's larger scales. User text arrives only as escaped variables.
 */
export const TEMPLATE_VERSION = 1

const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`

/** Title-bar icon: a float on a ripple. Inline, so it never needs the network. */
const TITLE_ICON = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="square">' +
    '<path d="M12 3v4"/><circle cx="12" cy="11" r="4"/><path d="M12 9v4" stroke="black"/><path d="M3 19c2-2 4-2 6 0s4 2 6 0 4-2 6 0"/></svg>',
)

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

/** One layout in both orientations, each followed by its own title bar. */
const oriented = (classes: string, landscape: string, portrait: string, narrowPortrait = false) => `
<div class="${classes} portrait:hidden">${landscape}
</div>${titleBar('landscape')}
<div class="${classes} landscape:hidden">${portrait}
</div>${titleBar('portrait', narrowPortrait)}`

/** The scene at an OG scale and a larger X scale. */
const scene = (og: number, x: number, classes = 'stretch-x') =>
  `{% if scene_base != "" %}<div class="${classes} no-shrink flex flex--row flex--center-x"><img class="image lg:hidden" src="{{ scene_base }}/${og}.png" alt=""><img class="image hidden lg:block" src="{{ scene_base }}/${x}.png" alt=""></div>{% endif %}`

const qr = (og: number, x: number) =>
  `{% if qr_base != "" %}<div class="no-shrink" data-companion-qr="true"><img class="image lg:hidden" src="{{ qr_base }}/${og}.png" alt=""><img class="image hidden lg:block" src="{{ qr_base }}/${x}.png" alt=""></div>{% endif %}`

const nameLine = (classes = 'title title--small lg:title') =>
  `<span class="${classes} grow w--min-0" data-clamp="1">{{ alias | escape }}{% if level %}, level {{ level }}{% endif %}</span>`

const status = (classes = 'label lg:title--small') =>
  `<span class="${classes} w--full" data-clamp="1">{{ status_label | escape }}{% if conditions_label %} · {{ conditions_label | escape }}{% endif %}</span>`

/** The counters line: cooler, bait, gold and logbook. Wraps rather than clipping on narrow columns. */
const counters = (classes = 'label lg:title--small') =>
  `{% if cooler_label %}<div class="flex flex--row flex--wrap flex--left gap--xsmall stretch-x" data-counters="true"><span class="${classes}">Cooler {{ cooler_label }} ·</span><span class="${classes}">{{ bait_label | escape }} ·</span><span class="${classes}">{{ gold }} gold ·</span><span class="${classes}">Logbook {{ species_logged }}/{{ species_total }}</span></div>{% endif %}`

const xpLine = (classes = 'label lg:title--small') => `{% if xp_to_next %}<span class="${classes} no-shrink">XP {{ xp }}/{{ xp_to_next }}</span>{% endif %}`

const attention = (classes = 'label lg:title--small', clamp = 2) =>
  `{% if attention %}<span class="${classes} label--underline no-shrink" data-clamp="${clamp}">{{ attention | escape }}</span>{% endif %}`

/**
 * The seven-day Top 5 of the angler's level group. Each row is itself the label, so an inverted own row keeps its
 * text white (a `.label` child would set its own colour), as Desk Crawler's board does.
 */
const board = (rows: number) => `{% if board %}<div class="no-shrink flex flex--col gap--xsmall w--full" data-board="true"><span class="label lg:title--small w--full" data-clamp="2">{{ board.label | escape }} · {{ board.rank_label | escape }}</span>{% for row in board.rows limit:${rows} %}<div class="label lg:title--small flex flex--row flex--between flex--center-y gap--small w--full{% if row.own %} label--inverted{% endif %}" data-rank-row="{{ row.rank }}"><span class="grow w--min-0" data-clamp="1">{{ row.rank }}. {{ row.name | escape }}</span><span class="no-shrink">L{{ row.level }}</span></div>{% endfor %}</div>{% endif %}`

/** The twelve-hour recap, outlined at the foot of the tall layouts. */
const recap = (classes = 'label lg:title--small') => `{% if recap %}<span class="${classes} label--outline no-shrink" data-clamp="1" data-recap="true">{{ recap | escape }}</span>{% endif %}`

const stories = (limit: number, classes = 'description lg:title--small', clamp = 2) =>
  `<div class="flex flex--col flex--left gap--xsmall stretch-x h--min-0" data-stories="true">{% for story in stories limit:${limit} %}<span class="${classes}" data-clamp="${clamp}">{{ story.summary | escape }}</span>{% endfor %}</div>`

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

const header = (qrOg: number, qrX: number) => `
    <div class="no-shrink flex flex--row flex--between flex--top gap--small stretch-x">
      <div class="flex flex--col flex--left gap--xsmall grow w--min-0">
        <div class="flex flex--row flex--center-y gap--small stretch-x">${nameLine()}${xpLine()}</div>
        ${status()}
        ${counters()}
      </div>
      ${qr(qrOg, qrX)}
    </div>`

const full = oriented(
  'layout layout--col layout--top layout--stretch-x gap--small',
  ready(`${header(2, 4)}
    <div class="lg:hidden no-shrink stretch-x">{% if board %}<div class="flex flex--row flex--top gap--small stretch-x">${scene(4, 4, '')}<div class="grow w--min-0">${board(6)}</div></div>{% else %}${scene(5, 5)}{% endif %}</div>
    <div class="hidden lg:flex flex--col gap--small stretch-x no-shrink">${scene(6, 6)}${board(6)}</div>
    ${attention()}
    ${stories(3, 'description lg:title--small', 1)}
    ${recap()}`),
  ready(`${header(2, 4)}
    ${scene(3, 8)}
    ${attention('label lg:title--small', 3)}
    ${stories(4)}
    ${board(6)}
    ${recap()}`),
)

const halfHorizontal = oriented(
  'layout layout--row layout--left layout--stretch-y gap--medium',
  ready(`
    <div class="no-shrink flex flex--col flex--center-y gap--small">${scene(2, 4)}</div>
    <div class="flex flex--col flex--left gap--xsmall grow w--min-0 h--full">
      <div class="flex flex--row flex--center-y gap--small stretch-x">${nameLine()}${xpLine()}</div>
      ${status()}
      ${counters()}
      {% if attention %}${attention('label lg:title--small', 1)}{% else %}${stories(1, 'description lg:title--small', 2)}{% endif %}
    </div>
    ${qr(2, 4)}`, true),
  ready(`
    <div class="flex flex--col flex--left gap--small grow w--min-0 h--full">
      <div class="flex flex--row flex--center-y gap--small stretch-x">${nameLine()}${qr(2, 4)}</div>
      ${scene(2, 6)}
      ${status()}
      ${counters()}
      {% if attention %}${attention()}{% else %}${stories(2)}{% endif %}
    </div>`),
)

const halfVertical = oriented(
  'layout layout--col layout--top layout--stretch-x gap--small',
  ready(`
    <div class="no-shrink flex flex--row flex--center-y gap--small stretch-x">${nameLine()}${qr(2, 4)}</div>
    ${scene(2, 5)}
    ${status('label lg:title--small')}
    ${counters()}
    ${attention()}
    ${stories(3)}
    ${recap()}`),
  ready(`
    <div class="no-shrink flex flex--row flex--center-y gap--small stretch-x">${nameLine('title title--small')}</div>
    ${scene(1, 4)}
    ${status('label')}
    ${counters('label')}
    ${attention('label', 3)}
    ${stories(4, 'description', 3)}
    <div class="grow"></div>
    <div class="no-shrink flex flex--row flex--center-x stretch-x">${qr(2, 4)}</div>`),
  true,
)

const quadrant = oriented(
  'layout layout--col layout--top layout--stretch-x gap--small',
  ready(`
    <div class="no-shrink flex flex--row flex--top gap--small stretch-x">
      <div class="flex flex--col flex--left gap--xsmall grow w--min-0">
        ${nameLine('title title--small lg:title')}
        ${status('label lg:title--small')}
        <span class="label lg:title--small">{% if cooler_label %}Cooler {{ cooler_label }} · {{ gold }} gold{% endif %}</span>
      </div>
      ${qr(2, 4)}
    </div>
    {% if attention %}${attention('label lg:title--small', 2)}{% else %}${stories(1, 'description lg:title--small', 2)}{% endif %}`, true),
  ready(`
    <div class="no-shrink flex flex--row stretch-x">${nameLine('title title--small')}</div>
    ${status('label')}
    <span class="label">{% if cooler_label %}Cooler {{ cooler_label }} · {{ gold }} gold{% endif %}</span>
    {% if attention %}${attention('label', 3)}{% else %}${stories(2, 'description', 3)}{% endif %}
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
