/**
 * Four TRMNL layouts built around the scene window (revision 13;
 * trmnl-experience.md priorities: setup/service message, hero and the living
 * scene, newest story, HP/level, service warnings, then rank).
 * Deploy-time constants: user text only arrives through merge_variables and is
 * escaped here. Each string is self-contained (no shared-template registration).
 */
export const TEMPLATE_VERSION = 11

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
 * Nothing on screen goes below the regular label size: label--small renders in
 * the 1-bit pixel font and is unreadable on the OG.
 */
const progress = (label: string, value: string, pct: string, size = '') => `
      <div class="progress-bar${size}">
        <div class="content">
          <span class="label lg:title--small">${label}</span>
          <span class="value value--xsmall lg:value--small">${value}</span>
        </div>
        <div class="track"><div class="fill" style="width: {{ ${pct} | default: 0 }}%"></div></div>
      </div>`

const hpBar = (size = '') => progress('HP', '{{ hp }}/{{ max_hp }}', 'hp_pct', size)
const xpBar = (size = '') => progress('XP', '{{ xp }}/{{ xp_to_next }}', 'xp_pct', size)

const newestStory = (clamp: number, classes: string) => `
      {% if log.size > 0 %}<span class="${classes}" data-clamp="${clamp}">{{ log[0].s | escape }}</span>{% else %}<span class="${classes}">The first adventure starts soon.</span>{% endif %}`

/**
 * Older log lines, newest first. No timestamps: the device focuses on the story.
 * Lines wrap to two rows so a whole outcome stays readable. `extra` lines only
 * appear on large screens.
 */
const olderStories = (count: number, extra = 0) => `
      {% for entry in log offset: 1 limit: ${count} %}<span class="label 4bit:label--gray lg:title--small" data-clamp="2">{{ entry.s | escape }}</span>{% endfor %}${
        extra > 0
          ? `
      {% for entry in log offset: ${1 + count} limit: ${extra} %}<span class="hidden lg:block label 4bit:label--gray lg:title--small" data-clamp="2">{{ entry.s | escape }}</span>{% endfor %}`
          : ''
      }`

const rankLine = `
      {% if rank %}<span class="label">Rank {{ rank }} of {{ total_players }}, {{ leaderboard_cohort_label | escape }}</span>{% elsif rank_status == "dormant" %}<span class="label 4bit:label--gray">Not ranked while paused</span>{% else %}<span class="label 4bit:label--gray">Ranking within the hour</span>{% endif %}`

/** Top 5 is cut to three rows on the OG so every row stays at a readable size. */
const rankPanel = `
      <span class="label lg:title--small">This week{% if leaderboard_cohort_label != "" %}, {{ leaderboard_cohort_label | escape }}{% endif %}</span>
      {% if rank %}<span class="value value--small lg:value--large">#{{ rank }}<span class="label lg:title--small"> of {{ total_players }}</span></span>
      {% elsif rank_status == "dormant" %}<span class="label 4bit:label--gray">Not ranked while paused</span>
      {% else %}<span class="label 4bit:label--gray">Ranking within the hour</span>{% endif %}
      {% for row in top5 %}<div class="{% if forloop.index > 3 %}hidden lg:flex {% endif %}flex flex--row flex--between stretch-x gap--small"><span class="label lg:title--small grow" data-clamp="1">{{ row.rank }}. {{ row.name | escape }}</span><span class="label lg:title--small">{{ row.score }} XP</span></div>{% endfor %}`

/** The one quiet attention message (service, delay, death, inventory sleep): never clipped, shown in every size. */
const attention = (classes: string, clamp: number) => `
      {% if attention %}<span class="${classes} label--underline" data-clamp="${clamp}">{{ attention | escape }}</span>{% endif %}`

/** QR back to the companion (setup, full bag). The payload leaves qr_url empty when nothing needs doing. */
const qr = `
      {% if qr_url != "" %}<div class="flex flex--col flex--center-x gap--xsmall no-shrink"><img class="image lg:hidden" src="{{ qr_url }}" alt=""><img class="image hidden lg:block" src="{{ qr_url_large }}" alt=""><span class="label lg:title--small">{{ qr_label | escape }}</span></div>{% endif %}`

/** QR image at a per-layout scale, swapped for a larger one on screen--lg (TRMNL X). */
const qrImage = (scale: number, largeScale: number) =>
  `<img class="image lg:hidden" src="{{ qr_base }}/${scale}.png" alt=""><img class="image hidden lg:block" src="{{ qr_base }}/${largeScale}.png" alt="">`

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
      <span class="${line} 4bit:label--gray">desk-crawler.grandprixpicks.com</span>`
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
<div class="layout layout--col layout--top layout--stretch-x gap--small lg:gap--xxlarge">
  {% if status == "unlinked" or first_run %}${welcome('full')}
  {% else %}
  <div class="flex flex--col gap--small">${scene('scene_url')}${divider}
  </div>
  <div class="grid stretch-x">
    <div class="col--span-5 flex flex--col flex--left flex--top gap--small lg:gap--medium">${newestStory(3, 'title lg:title--large')}
      {% if attention %}${attention('label lg:title--small', 2)}${olderStories(0, 2)}{% else %}${olderStories(1, 3)}{% endif %}
    </div>
    <div class="col--span-3 flex flex--col flex--left flex--stretch-x gap--small lg:gap--medium">
      <span class="title title--small lg:title--large" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      <span class="label lg:title--small" data-clamp="2">{{ status_label | escape }}</span>${hpBar(' lg:progress-bar--large')}${xpBar(' lg:progress-bar--large')}
      <div class="hidden lg:flex flex--col flex--left gap--xsmall">
        {% if weapon != "" %}<span class="title--small" data-clamp="1">Weapon: {{ weapon | escape }}</span>{% endif %}
        {% if armor != "" %}<span class="title--small" data-clamp="1">Armor: {{ armor | escape }}</span>{% endif %}
        <span class="title--small" data-clamp="1">{{ gold }} gold, {{ potions }} {% if potions == 1 %}potion{% else %}potions{% endif %}</span>
      </div>
    </div>
    <div class="col--span-4 flex flex--col flex--left flex--stretch-x gap--xsmall lg:gap--small">
      {% if qr_url != "" %}${qr}{% else %}${rankPanel}{% endif %}
    </div>
  </div>
  {% endif %}
</div>${titleBar}`

export const markupHalfHorizontal = `
<div class="layout layout--col layout--stretch-x">
  {% if status == "unlinked" or first_run %}${welcome('halfHorizontal')}
  {% else %}
  <div class="flex flex--row flex--center-y stretch-x gap--medium">
    <div class="no-shrink">${scene('scene_url_small')}
    </div>
    <div class="grow flex flex--col flex--left flex--stretch-x gap--small">
      <span class="label lg:title--small" data-clamp="1">{{ hero_name | escape }}, level {{ level }}. {{ status_label | escape }}</span>${hpBar(' progress-bar--small')}
      <div class="hidden lg:block">${xpBar(' progress-bar--small')}
      </div>
      {% if attention %}${attention('label lg:title--small', 1)}${newestStory(1, 'label lg:title--small')}{% else %}${newestStory(2, 'label lg:title--small')}{% endif %}${olderStories(0, 2)}
    </div>
  </div>
  {% endif %}
</div>${titleBar}`

export const markupHalfVertical = `
<div class="layout layout--col layout--stretch-x {% if status == "unlinked" or first_run %}gap--medium{% else %}gap--distribute{% endif %}">
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}${scene('scene_url_small')}
  <div class="flex flex--col flex--left flex--stretch-x gap--small">
    <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
    <span class="label lg:title--small" data-clamp="1">{{ status_label | escape }}</span>${attention('label lg:title--small', 2)}${hpBar(' progress-bar--small')}${xpBar(' progress-bar--small')}
  </div>${divider}
  <div class="flex flex--col flex--left gap--small">${newestStory(3, 'title title--small lg:title')}${olderStories(2, 2)}${rankLine}
  </div>
  {% endif %}
</div>${titleBar}`

export const markupQuadrant = `
<div class="layout layout--col layout--stretch-x gap--xsmall lg:gap--small">
  {% if status == "unlinked" or first_run %}${welcome('quadrant')}
  {% else %}${scene('scene_url_small')}
    <span class="label lg:title--small" data-clamp="1">{{ hero_name | escape }}, level {{ level }}. HP {{ hp }}/{{ max_hp }}</span>
    <div class="hidden lg:block">${hpBar(' progress-bar--small')}
    </div>
    {% if attention %}${attention('label lg:title--small', 2)}{% else %}${newestStory(2, 'label lg:title--small')}{% endif %}${olderStories(0, 2)}
  {% endif %}
</div>${titleBar}`

export const screenMarkup = {
  markup: markupFull,
  markup_half_horizontal: markupHalfHorizontal,
  markup_half_vertical: markupHalfVertical,
  markup_quadrant: markupQuadrant,
} as const
