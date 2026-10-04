/**
 * Four TRMNL layouts built around the scene window (revision 13, template v17 adds the standing bag QR, v18 the ordinal rank and compact QR v3;
 * trmnl-experience.md priorities: setup/service message, hero and the living
 * scene, newest story, HP/level, service warnings, then rank).
 * Deploy-time constants: user text only arrives through merge_variables and is
 * escaped here. Each string is self-contained (no shared-template registration).
 */
export const TEMPLATE_VERSION = 18

const svgDataUri = (svg: string) => `data:image/svg+xml;base64,${btoa(svg)}`

/** Title-bar icon: an upright letter-opener blade with a spark. Inline, so it never needs the network. */
const TITLE_ICON = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="black" stroke-width="2" stroke-linecap="square">' +
    '<path d="M12 2v13"/><path d="M8 15h8"/><path d="M12 15v4"/><path d="M10 21h4"/>' +
    '<path d="M19 4v4M17 6h4"/><path d="M5 9v2M4 10h2"/></svg>',
)

/** Rune divider between the scene and the story: a thin rule with a diamond and runic ticks. */
const RUNE_DIVIDER = svgDataUri(
  '<svg xmlns="http://www.w3.org/2000/svg" width="600" height="12" viewBox="0 0 600 12" fill="black">' +
    '<rect x="0" y="5" width="270" height="2"/><rect x="330" y="5" width="270" height="2"/>' +
    '<path d="M300 0l6 6-6 6-6-6z"/><rect x="280" y="2" width="2" height="8"/><rect x="318" y="2" width="2" height="8"/>' +
    '<rect x="262" y="3" width="2" height="6"/><rect x="336" y="3" width="2" height="6"/></svg>',
)

const titleBar = `
<div class="title_bar">
  <img class="image image-stroke" src="${TITLE_ICON}" alt="">
  <span class="title">Desk Crawler</span>
</div>`


type SceneField = 'scene_url' | 'scene_url_small'
/** Base scene everywhere, swapped for an integer-scaled larger image on screen--lg (TRMNL X). */
const scene = (field: SceneField) => {
  const large = field === 'scene_url' ? 'scene_url_large' : 'scene_url_medium'
  return `
  {% if ${field} != "" %}<div class="flex flex--row flex--center-x"><img class="image lg:hidden" src="{{ ${field} }}" alt=""><img class="image hidden lg:block" src="{{ ${large} }}" alt=""></div>{% endif %}`
}

const divider = `
  <div class="flex flex--row flex--center-x"><img class="image" src="${RUNE_DIVIDER}" alt=""></div>`

/**
 * Framework 3.4 progress bar: content + track + fill. The fill width is the one
 * documented inline-style exception (P18), always a server-clamped 0-100 integer.
 * The numbers lead and the unit follows ("118/148 HP"). `outline` gives the
 * track a strong edge so an empty bar still reads as a bar (the framework's own
 * track border is a muted gray on the X).
 * Nothing on screen goes below the regular label size: label--small renders in
 * the 1-bit pixel font and is unreadable on the OG.
 */
const progress = (label: string, value: string, pct: string, size = '') => `
      <div class="progress-bar${size}">
        <div class="content">
          <span><span class="value value--xsmall lg:value--small">${value}</span> <span class="label lg:title--small">${label}</span></span>
        </div>
        <div class="track outline"><div class="fill" style="width: {{ ${pct} | default: 0 }}%"></div></div>
      </div>`

const hpBar = (size = '') => progress('HP', '{{ hp }}/{{ max_hp }}', 'hp_pct', size)
const xpBar = (size = '') => progress('XP', '{{ xp }}/{{ xp_to_next }}', 'xp_pct', size)

/**
 * D42: next tick as 24-hour HH:MM in the owner's TRMNL timezone, no zone label.
 * TRMNL renders Liquid in UTC. Third-party markup only sees merge_variables (not the `trmnl` object), so the screen
 * route copies the request's `trmnl[user][utc_offset]` into the `utc_offset` merge variable; without it the line is omitted.
 */
const nextTick = (classes: string) => `
      {% if next_tick_at and utc_offset != nil %}<span class="${classes}">Next adventure {{ next_tick_at | plus: utc_offset | date: "%H:%M" }}</span>{% endif %}`

/** Full layout: on the OG the next tick (D42) sits in the title bar's instance slot; the body has no spare line for it. */
const titleBarFull = `
<div class="title_bar">
  <img class="image image-stroke" src="${TITLE_ICON}" alt="">
  <span class="title">Desk Crawler</span>{% unless status == "unlinked" or first_run %}${nextTick('instance lg:hidden')}{% endunless %}
</div>`

const newestStory = (clamp: number, classes: string) => `
      {% if log.size > 0 %}<span class="${classes}" data-clamp="${clamp}">{{ log[0].s | escape }}</span>{% else %}<span class="${classes}">The first adventure starts soon.</span>{% endif %}`

/**
 * Older log lines, newest first. No timestamps: the device focuses on the story.
 * Lines wrap to two rows so a whole outcome stays readable. `extra` lines only
 * appear on large screens.
 */
const olderStories = (count: number, extra = 0) => `
      {% for entry in log offset: 1 limit: ${count} %}<span class="label lg:title--small" data-clamp="2">{{ entry.s | escape }}</span>{% endfor %}${
        extra > 0
          ? `
      {% for entry in log offset: ${1 + count} limit: ${extra} %}<span class="hidden lg:block label lg:title--small" data-clamp="2">{{ entry.s | escape }}</span>{% endfor %}`
          : ''
      }`

const rankLine = `
      {% if rank %}<span class="label">Rank {{ rank }} of {{ total_players }}, {{ leaderboard_cohort_label | escape }}</span>{% elsif rank_status == "dormant" %}<span class="label 4bit:label--gray">Not ranked while paused</span>{% else %}<span class="label 4bit:label--gray">Ranking within the hour</span>{% endif %}`

/** English ordinal suffix for `rank` (1st, 2nd, 3rd, 4th, 11th-13th, 21st...), assigned to `rank_suffix`. */
const rankSuffix = `{% assign rank_mod100 = rank | modulo: 100 %}{% assign rank_mod10 = rank | modulo: 10 %}{% if rank_mod100 >= 11 and rank_mod100 <= 13 %}{% assign rank_suffix = "th" %}{% elsif rank_mod10 == 1 %}{% assign rank_suffix = "st" %}{% elsif rank_mod10 == 2 %}{% assign rank_suffix = "nd" %}{% elsif rank_mod10 == 3 %}{% assign rank_suffix = "rd" %}{% else %}{% assign rank_suffix = "th" %}{% endif %}`

/**
 * Own rank as a big "3rd" with its context stacked beside it ("of 41 this week" over the level group).
 * Top 5 is cut to three rows on the OG so every row stays at a readable size.
 */
const rankPanel = `
      {% if rank %}${rankSuffix}<div class="flex flex--row flex--left flex--center-y gap--small"><span class="value value--small lg:value--large">{{ rank }}{{ rank_suffix }}</span><div><div><span class="label lg:title--small">of {{ total_players }} this week</span></div>{% if leaderboard_cohort_label != "" %}<div><span class="label lg:title--small 4bit:label--gray" data-clamp="1">{{ leaderboard_cohort_label | escape }}</span></div>{% endif %}</div></div>
      {% else %}<span class="label lg:title--small">This week{% if leaderboard_cohort_label != "" %}, {{ leaderboard_cohort_label | escape }}{% endif %}</span>
      {% if rank_status == "dormant" %}<span class="label 4bit:label--gray">Not ranked while paused</span>{% else %}<span class="label 4bit:label--gray">Ranking within the hour</span>{% endif %}{% endif %}
      {% for row in top5 %}<div class="{% if forloop.index > 3 %}hidden lg:flex {% endif %}flex flex--row flex--between stretch-x gap--small"><span class="label lg:title--small grow" data-clamp="1">{{ row.rank }}. {{ row.name | escape }}</span><span class="label lg:title--small no-shrink">{{ row.score }}&nbsp;XP</span></div>{% endfor %}`

/** The one quiet attention message (service, delay, death, inventory sleep): never clipped, shown in every size. */
const attention = (classes: string, clamp: number) => `
      {% if attention %}<span class="${classes} label--underline" data-clamp="${clamp}">{{ attention | escape }}</span>{% endif %}`

/**
 * QR back to the companion (setup, full bag). The payload leaves qr_url empty when nothing needs doing.
 * On the OG the caption sits beside the code: stacked, it ran under the title bar in the full layout.
 */
const qr = `
      {% if qr_url != "" %}<div class="lg:hidden flex flex--row flex--center-y gap--small"><span class="label" data-clamp="3">{{ qr_label | escape }}</span><img class="image no-shrink" src="{{ qr_url }}" alt=""></div><div class="hidden lg:flex flex--col flex--center-x gap--xsmall no-shrink"><img class="image" src="{{ qr_url_large }}" alt=""><span class="label lg:title--small">{{ qr_label | escape }}</span></div>{% endif %}`

/** QR image at a per-layout scale, swapped for a larger one on screen--lg (TRMNL X). */
const qrImage = (scale: number, largeScale: number, field = 'qr_base') =>
  `<img class="image lg:hidden" src="{{ ${field} }}/${scale}.png" alt=""><img class="image hidden lg:block" src="{{ ${field} }}/${largeScale}.png" alt="">`

/**
 * Equipped gear with its slot named, so a find reads as a weapon or armor at a glance (X only: the OG has no spare line).
 * Plain blocks, not a flex column: the framework's flex gap outranks gap--none and left the caption floating.
 */
const gearSlot = (slot: string, field: string) => `
      <div class="hidden lg:block"><div><span class="label 4bit:label--gray">${slot}</span></div><div><span class="title--small" data-clamp="2">{% if ${field} != "" %}{{ ${field} | escape }}{% else %}None{% endif %}</span></div></div>`

/**
 * The standing companion link beside the rank panel: opens the bag to inspect gear and potions.
 * An action QR (setup, full bag) takes over the whole panel instead.
 */
const companionQr = `
      {% if companion_qr_base != "" %}<div class="no-shrink flex flex--col flex--center-x gap--xsmall">${qrImage(3, 5, 'companion_qr_base')}<span class="hidden lg:block label lg:title--small">Your bag</span></div>{% endif %}`

type WelcomeLayout = 'full' | 'halfVertical' | 'halfHorizontal' | 'quadrant'

/**
 * First-run panel: setup (no active hero) or a brand-new hero before its first
 * adventure. The QR is the main element, sized per layout; text stays short.
 */
const welcome = (layout: WelcomeLayout) => {
  const compact = layout === 'quadrant'
  const title = compact ? 'title title--small lg:title' : 'title lg:title--large'
  const line = layout === 'halfVertical' ? 'label lg:title--small text--center' : 'label lg:title--small'
  const heading = `{% if status == "unlinked" %}Finish setting up{% else %}{{ hero_name | escape }} is ready{% endif %}`
  const lines = compact
    ? `<span class="${line}" data-clamp="2">{% if status == "unlinked" %}Scan to finish setup{% else %}First adventure within 15 minutes{% endif %}</span>`
    : `{% if status == "unlinked" %}<span class="${line}" data-clamp="2">Scan with your phone to open the companion.</span>
      <span class="${line}" data-clamp="2">{{ attention | escape }}</span>{% else %}<span class="${line}" data-clamp="2">The first adventure starts within 15 minutes.</span>
      <span class="${line}" data-clamp="3">Scan to open your companion, where you manage gear and pick where to explore.</span>{% endif %}
      <span class="${line} 4bit:label--gray">trmnlgames.com</span>`
  const text = `
    <div class="flex flex--col flex--left gap--small${layout === 'halfVertical' ? ' flex--center-x' : ''}">
      <span class="${title}" data-clamp="1">${heading}</span>
      ${lines}
    </div>`
  const scales: Record<WelcomeLayout, [number, number]> = { full: [4, 7], halfVertical: [4, 5], halfHorizontal: [3, 5], quadrant: [3, 4] }
  const [scale, largeScale] = scales[layout]
  const code = `{% if qr_base != "" %}<div class="no-shrink">${qrImage(scale, largeScale)}</div>{% endif %}`
  if (layout === 'halfVertical') {
    return `${scene('scene_url_small')}
  <div class="flex flex--col flex--center-x gap--small">
    ${code}${text}
  </div>`
  }
  const row = `
  <div class="flex flex--row flex--center-x flex--center-y gap--large lg:gap--xlarge">
    ${code}${text}
  </div>`
  return layout === 'full' ? `${scene('scene_url')}${row}` : row
}

export const markupFull = `
<div class="layout layout--col layout--top layout--stretch-x gap--small lg:gap--medium">
  {% if status == "unlinked" or first_run %}${welcome('full')}
  {% else %}
  <div class="grid stretch-x gap--medium">
    <div class="col--span-5 lg:col--span-4 flex flex--col flex--left gap--xsmall">
      <span class="title lg:title--large" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      <span class="label lg:title--small" data-clamp="2">{{ status_label | escape }}</span>${nextTick('hidden lg:block label lg:title--small')}
      <span class="hidden lg:block label lg:title--small">{{ gold }} gold · {{ potions }} {% if potions == 1 %}potion{% else %}potions{% endif %}</span>
    </div>
    <div class="col--span-7 lg:col--span-8">
      <div class="grid grid--cols-2 gap--medium lg:gap--large">
        <div>${hpBar(' lg:progress-bar--large')}
        </div>
        <div>${xpBar(' lg:progress-bar--large')}
        </div>${gearSlot('Weapon', 'weapon')}${gearSlot('Armor', 'armor')}
      </div>
    </div>
  </div>
  <div class="flex flex--col gap--small">${scene('scene_url')}${divider}
  </div>
  <div class="grid stretch-x gap--large lg:gap--xlarge">
    <div class="{% if qr_url == "" and companion_qr_base != "" %}col--span-6{% else %}col--span-7{% endif %} flex flex--col flex--left flex--top gap--small lg:gap--medium">${newestStory(2, 'title lg:title')}
      {% if attention %}${attention('label lg:title--small', 2)}${olderStories(0, 1)}{% else %}${olderStories(1, 2)}{% endif %}
    </div>
    {% if qr_url != "" %}<div class="col--span-5 flex flex--col flex--left flex--stretch-x gap--xsmall lg:gap--small">${qr}
    </div>{% else %}<div class="{% if companion_qr_base != "" %}col--span-6{% else %}col--span-5{% endif %} flex flex--row flex--top gap--medium">
      <div class="grow flex flex--col flex--left flex--stretch-x gap--xsmall lg:gap--small">${rankPanel}
      </div>${companionQr}
    </div>{% endif %}
  </div>
  {% endif %}
</div>${titleBarFull}`

export const markupHalfHorizontal = `
<div class="layout layout--col layout--stretch-x">
  {% if status == "unlinked" or first_run %}${welcome('halfHorizontal')}
  {% else %}
  <div class="flex flex--row flex--center-y stretch-x gap--medium">
    <div class="no-shrink">${scene('scene_url_small')}
    </div>
    <div class="grow flex flex--col flex--left flex--stretch-x gap--small">
      <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      <span class="label lg:title--small" data-clamp="1">{{ status_label | escape }}</span>${nextTick('label lg:title--small')}${hpBar(' progress-bar--small')}
      <div class="hidden lg:block">${xpBar(' progress-bar--small')}
      </div>
      {% if attention %}${attention('label lg:title--small', 1)}${newestStory(1, 'label lg:title--small')}{% else %}${newestStory(2, 'label lg:title--small')}{% endif %}${olderStories(0, 2)}
    </div>
  </div>
  {% endif %}
</div>${titleBar}`

export const markupHalfVertical = `
<div class="layout layout--col layout--top layout--stretch-x gap--small lg:gap--medium">
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <div class="flex flex--col flex--left flex--stretch-x gap--small">
    <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
    <span class="label lg:title--small" data-clamp="1">{{ status_label | escape }}</span>${nextTick('label lg:title--small')}${attention('label lg:title--small', 2)}${hpBar(' progress-bar--small')}${xpBar(' progress-bar--small')}
  </div>${scene('scene_url_small')}${divider}
  <div class="flex flex--col flex--left gap--small">${newestStory(2, 'title title--small lg:title')}${olderStories(1, 1)}${rankLine}
  </div>
  {% endif %}
</div>${titleBar}`

export const markupQuadrant = `
<div class="layout layout--col layout--stretch-x gap--xsmall lg:gap--small">
  {% if status == "unlinked" or first_run %}${welcome('quadrant')}
  {% else %}
    <span class="label lg:title--small" data-clamp="1">{{ hero_name | escape }}, level {{ level }} · HP {{ hp }}/{{ max_hp }}</span>${scene('scene_url_small')}
    {% if attention %}${attention('label lg:title--small', 2)}{% else %}${newestStory(2, 'label lg:title--small')}{% endif %}
  {% endif %}
</div>${titleBar}`

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
