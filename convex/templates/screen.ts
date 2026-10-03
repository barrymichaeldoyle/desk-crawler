/**
 * Four TRMNL layouts built around the scene window (revision 12;
 * trmnl-experience.md priorities: setup/service message, hero and the living
 * scene, newest story, HP/level, dated freshness, then rank).
 * Deploy-time constants: user text only arrives through merge_variables and is
 * escaped here. Each string is self-contained (no shared-template registration).
 */
export const TEMPLATE_VERSION = 6

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
  <span class="instance">{{ game_as_of_label | escape }}</span>
</div>`

const scene = (field: 'scene_url' | 'scene_url_small') => `
  {% if ${field} != "" %}<div class="flex flex--row flex--center-x"><img class="image" src="{{ ${field} }}" alt=""></div>{% endif %}`

const divider = `
  <div class="flex flex--row flex--center-x"><img class="image" src="${RUNE_DIVIDER}" alt=""></div>`

/**
 * Framework 3.4 progress bar: content + track + fill. The fill width is the one
 * documented inline-style exception (P18), always a server-clamped 0-100 integer.
 */
const progress = (label: string, value: string, pct: string, size = '') => `
      <div class="progress-bar${size}">
        <div class="content">
          <span class="label label--small">${label}</span>
          <span class="value value--xxsmall">${value}</span>
        </div>
        <div class="track"><div class="fill" style="width: {{ ${pct} | default: 0 }}%"></div></div>
      </div>`

const hpBar = (size = '') => progress('HP', '{{ hp }}/{{ max_hp }}', 'hp_pct', size)
const xpBar = (size = '') => progress('XP', '{{ xp }}/{{ xp_to_next }}', 'xp_pct', size)

const newestStory = (clamp: number, size: string) => `
      {% if log.size > 0 %}<span class="${size}" data-clamp="${clamp}">{{ log[0].s | escape }}</span>{% else %}<span class="description">The first adventure starts soon.</span>{% endif %}`

const olderStories = (count: number) => `
      {% for entry in log offset: 1 limit: ${count} %}<span class="label label--small label--gray" data-clamp="1">{{ entry.t | escape }} · {{ entry.s | escape }}</span>{% endfor %}`

const rankLine = `
      {% if rank %}<span class="label label--small">#{{ rank }} of {{ total_players }} · {{ leaderboard_cohort_label | escape }}</span>{% elsif rank_status == "dormant" %}<span class="label label--small label--gray">Unranked while adventures are stopped</span>{% else %}<span class="label label--small label--gray">{{ leaderboard_as_of_label | escape }}</span>{% endif %}`

const rankPanel = `
      <span class="label label--small">Last 7 days{% if leaderboard_cohort_label != "" %} · {{ leaderboard_cohort_label | escape }}{% endif %}</span>
      {% if rank %}<span class="value value--xsmall">#{{ rank }} <span class="label label--small">of {{ total_players }}</span></span>
      {% elsif rank_status == "dormant" %}<span class="label label--small label--gray">Unranked while adventures are stopped</span>
      {% else %}<span class="label label--small label--gray">{{ leaderboard_as_of_label | escape }}</span>{% endif %}
      {% for row in top5 %}<span class="label label--small" data-clamp="1">{{ row.rank }}. {{ row.name | escape }} · {{ row.score }} XP</span>{% endfor %}`

const attentionLine = `
  {% if attention %}<span class="label label--small label--underline" data-clamp="1">{{ attention | escape }}</span>{% endif %}`

const setup = (field: 'scene_url' | 'scene_url_small') => `${scene(field)}
  <div class="flex flex--col flex--center-x gap--small">
    <span class="title title--small">A hero is waiting for you</span>
    <span class="description" data-clamp="3">{{ attention | escape }}</span>
    <span class="label label--small label--gray">desk-crawler.grandprixpicks.com</span>
  </div>`

export const markupFull = `
<div class="layout layout--col layout--top layout--stretch-x gap--small">
  {% if status == "unlinked" %}${setup('scene_url')}
  {% else %}${scene('scene_url')}${divider}
  <div class="grid stretch-x">
    <div class="col--span-5 flex flex--col flex--left gap--small">${newestStory(3, 'title')}${olderStories(1)}
    </div>
    <div class="col--span-3 flex flex--col flex--left flex--stretch-x gap--small">
      <span class="title title--small" data-clamp="1">{{ hero_name | escape }} · L{{ level }}</span>
      <span class="label" data-clamp="2">{{ status_label | escape }}</span>${hpBar()}${xpBar()}
    </div>
    <div class="col--span-4 flex flex--col flex--left gap--xsmall">${rankPanel}
    </div>
  </div>${attentionLine}
  {% endif %}
</div>${titleBar}`

export const markupHalfHorizontal = `
<div class="layout layout--col layout--top layout--stretch-x">
  {% if status == "unlinked" %}${setup('scene_url_small')}
  {% else %}
  <div class="grid stretch-x">
    <div class="col--span-5 flex flex--col flex--center-x">${scene('scene_url_small')}
    </div>
    <div class="col--span-7 flex flex--col flex--left flex--stretch-x gap--small">
      <span class="label" data-clamp="1">{{ hero_name | escape }} · L{{ level }} · {{ status_label | escape }}</span>${hpBar(' progress-bar--xsmall')}${newestStory(2, 'description')}
    </div>
  </div>
  {% endif %}
</div>${titleBar}`

export const markupHalfVertical = `
<div class="layout layout--col layout--top layout--stretch-x gap--small">
  {% if status == "unlinked" %}${setup('scene_url_small')}
  {% else %}${scene('scene_url_small')}
  <div class="flex flex--col flex--left flex--stretch-x gap--small">
    <span class="label" data-clamp="1">{{ hero_name | escape }} · Level {{ level }} Warrior</span>
    <span class="label label--small" data-clamp="1">{{ status_label | escape }}</span>${hpBar(' progress-bar--small')}${xpBar(' progress-bar--small')}
  </div>${divider}
  <div class="flex flex--col flex--left gap--small">${newestStory(3, 'description')}${olderStories(1)}${rankLine}
  </div>
  {% endif %}
</div>${titleBar}`

export const markupQuadrant = `
<div class="layout layout--col layout--top layout--stretch-x gap--xsmall">
  {% if status == "unlinked" %}${setup('scene_url_small')}
  {% else %}${scene('scene_url_small')}
    <span class="label label--small" data-clamp="1">{{ hero_name | escape }} · L{{ level }} · HP {{ hp }}/{{ max_hp }}</span>${newestStory(1, 'label label--small')}
  {% endif %}
</div>${titleBar}`

export const screenMarkup = {
  markup: markupFull,
  markup_half_horizontal: markupHalfHorizontal,
  markup_half_vertical: markupHalfVertical,
  markup_quadrant: markupQuadrant,
} as const
