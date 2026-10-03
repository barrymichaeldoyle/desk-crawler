/**
 * Four TRMNL layouts (trmnl.md, trmnl-experience.md). Deploy-time constants:
 * user text only ever arrives through merge_variables and is escaped here.
 * Each string is self-contained (no shared-template registration). Template
 * version is independent of payload v1.
 */
export const TEMPLATE_VERSION = 3

const titleBar = `
<div class="title_bar">
  <span class="title">Desk Crawler</span>
  <span class="instance">{{ game_as_of_label | escape }}</span>
</div>`

/** Unlinked or service-paused without a hero: one readable setup/status message. */
const setupBlock = (size: 'large' | 'small') => `
  <div class="flex flex--col gap">
    <span class="title${size === 'small' ? ' title--small' : ''}">Desk Crawler</span>
    <span class="description" data-clamp="3">{{ attention | escape }}</span>
    <span class="label label--small label--gray">desk-crawler.grandprixpicks.com</span>
  </div>`

const heroHeader = (titleSize: string) => `
    <span class="title ${titleSize}" data-clamp="1">{{ hero_name | escape }}</span>
    <span class="label label--small">Level {{ level }} Warrior</span>
    <span class="label" data-clamp="2">{{ status_label | escape }}</span>`

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

const bars = `
    <div class="flex flex--col flex--stretch-x gap--small">${hpBar()}${xpBar()}
    </div>`

const attentionLine = `
  {% if attention %}<span class="label label--small label--underline" data-clamp="1">{{ attention | escape }}</span>{% endif %}`

const logItems = (limit: number) => `
      {% if log.size > 0 %}
        {% for entry in log limit: ${limit} %}
        <div class="item">
          <div class="meta"></div>
          <div class="content">
            <span class="description" data-clamp="2">{{ entry.s | escape }}</span>
            <span class="label label--small label--gray">{{ entry.t | escape }}</span>
          </div>
        </div>
        {% endfor %}
      {% else %}
        <span class="description">No adventures yet. The first one starts soon.</span>
      {% endif %}`

const rankPanel = (compact: boolean) => `
      <span class="label label--small">Last 7 days{% if leaderboard_cohort_label != "" %} · {{ leaderboard_cohort_label | escape }}{% endif %}</span>
      {% if rank %}
        <span class="value value--small">#{{ rank }}</span>
        <span class="label label--small">of {{ total_players }}</span>
        ${compact ? '' : `{% for row in top5 %}<span class="label label--small" data-clamp="1">{{ row.rank }}. {{ row.name | escape }} · L{{ row.level }}</span>{% endfor %}`}
      {% else %}
        <span class="label label--small label--gray">{{ leaderboard_as_of_label | escape }}</span>
      {% endif %}`

export const markupFull = `
<div class="layout layout--col layout--top layout--stretch-x gap">
  {% if status == "unlinked" %}${setupBlock('large')}
  {% else %}
  <div class="grid stretch-x">
    <div class="col--span-4 flex flex--col flex--left flex--stretch-x gap">${heroHeader('title--base')}${bars}
    </div>
    <div class="col--span-5 flex flex--col flex--left flex--stretch-x gap--small">${logItems(4)}
    </div>
    <div class="col--span-3 flex flex--col flex--left gap--small">${rankPanel(false)}
    </div>
  </div>${attentionLine}
  {% endif %}
</div>${titleBar}`

export const markupHalfHorizontal = `
<div class="layout layout--col layout--top layout--stretch-x gap">
  {% if status == "unlinked" %}${setupBlock('small')}
  {% else %}
  <div class="grid stretch-x">
    <div class="col--span-4 flex flex--col flex--left flex--stretch-x gap--small">${heroHeader('title--small')}
${hpBar(' progress-bar--small')}
    </div>
    <div class="col--span-5 flex flex--col flex--left flex--stretch-x gap--small">${logItems(2)}
    </div>
    <div class="col--span-3 flex flex--col flex--left gap--small">${rankPanel(true)}
    </div>
  </div>
  {% endif %}
</div>${titleBar}`

export const markupHalfVertical = `
<div class="layout layout--col layout--top layout--stretch-x gap">
  {% if status == "unlinked" %}${setupBlock('small')}
  {% else %}
  <div class="flex flex--col flex--left flex--stretch-x gap">${heroHeader('title--small')}${bars}
  </div>
  <div class="flex flex--col flex--left flex--stretch-x gap--small">${logItems(3)}
  </div>
  <div class="flex flex--col flex--left gap--small">${rankPanel(true)}
  </div>
  {% endif %}
</div>${titleBar}`

export const markupQuadrant = `
<div class="layout layout--col layout--top layout--stretch-x gap--small">
  {% if status == "unlinked" %}${setupBlock('small')}
  {% else %}
    <span class="title title--small" data-clamp="1">{{ hero_name | escape }} · L{{ level }}</span>
    <span class="label label--small" data-clamp="1">{{ status_label | escape }}</span>
${hpBar(' progress-bar--small')}
    {% if log.size > 0 %}<span class="description" data-clamp="2">{{ log[0].s | escape }}</span>{% endif %}
  {% endif %}
</div>${titleBar}`

export const screenMarkup = {
  markup: markupFull,
  markup_half_horizontal: markupHalfHorizontal,
  markup_half_vertical: markupHalfVertical,
  markup_quadrant: markupQuadrant,
} as const
