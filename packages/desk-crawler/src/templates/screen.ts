/**
 * Four self-contained TRMNL layouts. Template v30 adds a portrait arrangement
 * of every view beside the unchanged landscape one (v29: a companion QR in
 * every view, more room for complete stories on compact OG screens).
 * User text arrives only through escaped merge_variables; scenes and QR codes
 * use existing integer-scaled artwork. No shared-template registration.
 */
import { GLYPHS, glyphRows } from '../art/glyphs'

export const TEMPLATE_VERSION = 30

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

/** Device-envelope-only code: no code in owner/public preview payloads. Fits the existing footer height. */
const keepsakeFooter = `{% if desk_keepsake_code %}<span class="instance">Keepsake {{ desk_keepsake_code | escape }}</span>{% endif %}`

const titleBar = `
<div class="title_bar">
  <img class="image image-stroke" src="${TITLE_ICON}" alt="">
  <span class="title">Desk Crawler</span>
  ${keepsakeFooter}
</div>`


type SceneField = 'scene_url' | 'scene_url_small'
/** Base scene everywhere, swapped for an integer-scaled larger image on screen--lg (TRMNL X). */
const scene = (field: SceneField, large = field === 'scene_url' ? 'scene_url_large' : 'scene_url_medium') => {
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

/**
 * Portrait bars: ten pixel segments from framework classes, black when earned and grey (dithered on the OG) when not.
 * TRMNL caps inline styles at six per plugin; the landscape bars use them, so portrait draws its bars without any.
 */
const segmentBar = (label: string, value: string, pct: string, large = false) => `
      <div class="flex flex--col flex--left gap--xsmall stretch-x">
        <span><span class="value value--xsmall lg:value--small">${value}</span> <span class="label lg:title--small">${label}</span></span>
        {% assign seg_on = ${pct} | default: 0 | plus: 5 | divided_by: 10 %}<div class="flex flex--row gap--xsmall stretch-x">{% for i in (1..10) %}<div class="grow h--[10px] ${large ? 'lg:h--[24px]' : 'lg:h--[16px]'} {% if i <= seg_on %}bg--black{% else %}bg--gray-50{% endif %}"></div>{% endfor %}</div>
      </div>`

const hpSegments = (large = false) => segmentBar('HP', '{{ hp }}/{{ max_hp }}', 'hp_pct', large)
const xpSegments = (large = false) => segmentBar('XP', '{{ xp }}/{{ xp_to_next }}', 'xp_pct', large)

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
  ${keepsakeFooter}
</div>`

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

/** Story uses an icon-sized gutter; a zero-gap grid keeps its stats directly beneath it. */
const logLine = (entry: string, classes: string, clamp: number, size: number, fit: number, wrapper = 'block') =>
  `{% assign line_story = ${entry}.n | default: ${entry}.s %}{% assign line_plain = ${plainOf('line_story')} %}<div class="${wrapper} stretch-x"><div class="grid grid--cols-1 gap--none">${entry === 'log[0]' ? '' : '{% unless forloop.first %}<div class="border--h-30 stretch-x"></div>{% endunless %}'}<div class="flex flex--row flex--left flex--top gap--xsmall"><div class="no-shrink">${logIcon(`${entry}.k`, size)}</div><span class="${classes} grow" ${fitClamp('line_plain', clamp, Math.max(0, fit - 10))}>${storyText}</span></div>{% if utc_offset != nil or ${entry}.d != nil and ${entry}.d != "" %}<div class="flex flex--row flex--left flex--top gap--xsmall">{% if utc_offset != nil %}<span class="label lg:title--small no-shrink">{{ ${entry}.u | plus: utc_offset | date: "%H:%M" }}</span>{% endif %}{% if ${entry}.d != nil and ${entry}.d != "" %}<span class="label lg:title--small grow">{{ ${entry}.d | escape }}</span>{% endif %}</div>{% endif %}</div></div>`

/** The status line, its clamp fitted like log lines. */
const statusLine = (clamp: number, fit: number) =>
  `{% if status_eta_at and utc_offset != nil %}{% assign status_plain = ${plainOf('status_eta_label')} | append: " 00:00" %}{% else %}{% assign status_plain = ${plainOf('status_label')} %}{% endif %}<span class="label lg:title--small" ${fitClamp('status_plain', clamp, fit)}>${statusText}</span>`

/** A big moment (level-up, elite win, jackpot, rare find) gets an inverted badge above the newest story. */
const celebrationBadge = (classes: string) => `
      {% if celebration %}<span class="${classes} label--inverted">{{ celebration | escape }}</span>{% endif %}`

/** Whole story/stat pairs; the fitter keeps the longest newest-first prefix that fits. */
const storyList = (clamp: number, classes: string, size = 16, fit = 60) => `
  <div class="grow stretch-x" data-story-list="true">
    {% for entry in log %}{% unless attention and forloop.index > 1 %}{% if forloop.first %}${logLine('entry', classes, clamp, size, fit)}{% else %}${logLine('entry', 'label lg:title--small', 1, 16, 28, 'block pt--1')}{% endif %}{% endunless %}{% endfor %}
    {% if log.size == 0 %}<span class="label lg:title--small">The first adventure starts soon.</span>{% endif %}
  </div>`

/**
 * Pinned framework 3.4 emits its final stats before signalling readiness. Fit the
 * actual rich-text boxes at that point, reserving the footer and following rank
 * line. Only visibility changes; there are no styles, network calls or writes.
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
    const layoutBottom = Math.min(footer.getBoundingClientRect().top, layout.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(layout).paddingBottom) || 0));
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

/** Device recap is read-only and uses its own window, independent of the recent-story list. */
const recapBlock = (compact = false) => `
  {% if recap %}<div class="flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">
    ${compact ? `<span class="label lg:title--small" data-clamp="2">{{ recap.label | escape }}: {{ recap.compact | escape }}</span>` : `<span class="label lg:title--small text--bold">{{ recap.label | escape }}</span>
    <span class="label lg:hidden" data-clamp="1">{{ recap.compact | escape }}</span>
    {% if recap.gains != "" %}<span class="hidden lg:block label lg:title--small">{{ recap.gains | escape }}</span>{% endif %}
    <span class="hidden lg:block label lg:title--small">{{ recap.activity | escape }}</span>
    {% if recap.highlights != "" %}<span class="hidden lg:block label lg:title--small text--bold">{{ recap.highlights | escape }}</span>{% endif %}`}
    <div class="border--h-30 stretch-x"></div>
  </div>{% endif %}`

/** A separate bottom recap with breathing room above its text, fitted to one line. */
const recapRibbon = `
  {% if recap %}<div class="no-shrink stretch-x" data-recap-ribbon="true">
    <div class="border--h-30 stretch-x"></div>
    <div class="pt--2"><span class="label text--regular inline-block lg:hidden" data-fit-value="true">{{ recap.label | escape }}: {{ recap.compact | escape }}</span><span class="hidden lg:inline-block title title--small text--regular" data-fit-value="true">{{ recap.label | escape }}: {% if recap.gains != "" %}{{ recap.gains | escape }} · {% endif %}{{ recap.activity | escape }}{% if recap.highlights != "" %} · {{ recap.highlights | escape }}{% endif %}</span></div>
  </div>{% endif %}`

/** English ordinal suffix for `rank` (1st, 2nd, 3rd, 4th, 11th-13th, 21st...), assigned to `rank_suffix`. */
const rankSuffix = `{% assign rank_mod100 = rank | modulo: 100 %}{% assign rank_mod10 = rank | modulo: 10 %}{% if rank_mod100 >= 11 and rank_mod100 <= 13 %}{% assign rank_suffix = "th" %}{% elsif rank_mod10 == 1 %}{% assign rank_suffix = "st" %}{% elsif rank_mod10 == 2 %}{% assign rank_suffix = "nd" %}{% elsif rank_mod10 == 3 %}{% assign rank_suffix = "rd" %}{% else %}{% assign rank_suffix = "th" %}{% endif %}`

/**
 * Own rank as a big "3rd" with its context stacked beside it ("of 41 this week" over the level group).
 * Top 5 is cut to three rows on the OG so every row stays at a readable size.
 */
const rankPanel = `
      {% if rank %}${rankSuffix}<span class="label lg:hidden">{{ rank }}{{ rank_suffix }} of {{ total_players }} this week</span>{% if leaderboard_cohort_label != "" %}<span class="label lg:hidden" data-clamp="1">{{ leaderboard_cohort_label | escape }}</span>{% endif %}<div class="hidden lg:flex flex--row flex--left flex--center-y gap--small"><div class="grow w--min-0"><span class="value value--small lg:value--large inline-block" data-fit-value="true">{{ rank }}{{ rank_suffix }}</span></div><div class="no-shrink"><div><span class="label lg:title--small">of {{ total_players }} this week</span></div>{% if leaderboard_cohort_label != "" %}<div><span class="label lg:title--small" data-clamp="1">{{ leaderboard_cohort_label | escape }}</span></div>{% endif %}</div></div>
      {% else %}<span class="label lg:title--small">This week{% if leaderboard_cohort_label != "" %}, {{ leaderboard_cohort_label | escape }}{% endif %}</span>
      {% if rank_status == "dormant" %}<span class="label">Not ranked while paused</span>{% else %}<span class="label">Ranking within the hour</span>{% endif %}{% endif %}
      {% for row in top5 %}<div class="{% if forloop.index > 3 %}hidden lg:flex {% endif %}flex flex--row flex--between stretch-x gap--small"><span class="label lg:title--small grow" data-clamp="1">{{ row.rank }}. {{ row.name | escape }}</span><span class="label lg:title--small no-shrink">{{ row.score }}&nbsp;XP</span></div>{% endfor %}`

/** The one quiet attention message (service, delay, death, inventory sleep): never clipped, shown in every size. */
const attention = (classes: string, clamp: number) => `
      {% if attention %}<span class="${classes} label--underline" data-clamp="${clamp}">{{ attention | escape }}</span>{% endif %}`

/** Integer-scaled assets keep every QR module crisp on monochrome displays. */
const qrImage = (scale: number, largeScale: number, field = 'qr_base') =>
  `<img class="image lg:hidden" src="{{ ${field} }}/${scale}.png" alt=""><img class="image hidden lg:block" src="{{ ${field} }}/${largeScale}.png" alt="">`

/** One reserved companion entry point per view; an urgent action replaces the standing bag link. */
const bagQr = (scale = 3, largeScale = 4, caption = true) => `
  {% if qr_base != "" or companion_qr_base != "" %}<div class="no-shrink flex flex--col flex--center-x flex--top gap--xsmall" data-companion-qr="true">
    {% if qr_base != "" %}${qrImage(scale, largeScale)}<span class="label lg:title--small text--center" data-clamp="2">{{ qr_label | escape }}</span>
    {% else %}${qrImage(scale, largeScale, 'companion_qr_base')}${caption ? '<span class="label lg:title--small">Your bag</span>' : ''}{% endif %}
  </div>{% endif %}`

/**
 * Equipped gear with its slot named, so a find reads as a weapon or armor at a glance (X only: the OG has no spare line).
 * Plain blocks, not a flex column: the framework's flex gap outranks gap--none and left the caption floating.
 */
const gearSlot = (slot: string, field: string) => `
      <div class="hidden lg:block text--center"><div><span class="label">${slot}</span></div><div><span class="title--small" data-clamp="2">{% if ${field} != "" %}{{ ${field} | escape }}{% else %}None{% endif %}</span></div></div>`

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
      <span class="${line}">trmnlgames.com</span>`
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


/**
 * Landscape and portrait arrangements of one view; the framework's `portrait:` classes show the one that matches the
 * device. Each hides itself in the other orientation; showing one with `portrait:flex` would make it a row whose
 * stretch-x children all take an equal share of the height. Each arrangement carries its own title bar because the
 * framework sizes a layout only when the title bar is its next sibling (`.layout:has(+.title_bar)`).
 */
const oriented = (classes: string, landscape: string, portrait: string, bar: string) => `
<div class="${classes} portrait:hidden">${landscape}
</div>${bar.replace('class="title_bar"', 'class="title_bar portrait:hidden"')}
<div class="${classes} landscape:hidden">${portrait}
</div>${bar.replace('class="title_bar"', 'class="title_bar landscape:hidden"')}`

/** A standing companion QR beside its caption, for the narrow portrait columns. */
const qrFooter = (scale = 3, largeScale = 4) => `
  {% if qr_base != "" or companion_qr_base != "" %}<div class="no-shrink flex flex--row flex--left flex--center-y gap--small stretch-x" data-companion-qr="true">
    {% if qr_base != "" %}<div class="no-shrink">${qrImage(scale, largeScale)}</div><span class="label lg:title--small grow" data-clamp="3">{{ qr_label | escape }}</span>
    {% else %}<div class="no-shrink">${qrImage(scale, largeScale, 'companion_qr_base')}</div><span class="label lg:title--small grow">Your bag</span>{% endif %}
  </div>{% endif %}`

/**
 * Full, portrait: name and status, HP and XP side by side, the scene, then the
 * stories take the height, with the ranking and companion QR on the last row.
 */
const fullPortrait = `
  {% if status == "unlinked" or first_run %}<div class="grow flex flex--col flex--center-x flex--center-y stretch-x">${welcome('halfVertical')}</div>
  {% else %}
  <div class="no-shrink flex flex--col flex--left gap--xsmall stretch-x">
    <span class="title lg:hidden" data-clamp="1">{{ hero_name | truncate: 16 | escape }}, level {{ level }}</span>
    <span class="hidden lg:inline-block title lg:title--large" data-fit-value="true">{{ hero_name | escape }}, level {{ level }}</span>
    ${statusLine(2, 40)}${nextTick('hidden lg:block label lg:title--small')}
    <span class="hidden lg:block label lg:title--small">{{ gold }} gold · {{ potions }} {% if potions == 1 %}potion{% else %}potions{% endif %}</span>
  </div>
  <div class="no-shrink grid grid--cols-2 gap--medium lg:gap--large stretch-x">
    <div>${hpSegments(true)}</div>
    <div>${xpSegments(true)}</div>
  </div>
  <div class="hidden lg:block no-shrink stretch-x"><div class="grid grid--cols-2 gap--large">${gearSlot('Weapon', 'weapon')}${gearSlot('Armor', 'armor')}</div></div>
  <div class="no-shrink flex flex--col gap--small stretch-x">${scene('scene_url_small', 'scene_url_large')}${divider}</div>
  <div class="grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small stretch-x">
    ${attention('label lg:title--small', 3)}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title lg:title', 24, 40)}
  </div>
  <div class="no-shrink flex flex--row flex--left flex--top gap--medium stretch-x">
    <div class="grow w--min-0 flex flex--col flex--left flex--stretch-x gap--xsmall">{% if qr_base == "" %}${rankPanel}{% endif %}</div>
    ${bagQr(3, 4, true)}
  </div>
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}`

/** Side, portrait: a narrow column. Hero and health first, the stories take the height, the companion QR closes the column. */
const halfVerticalPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <div class="no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">
    <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
    ${statusLine(2, 24)}${nextTick('label lg:title--small')}${hpSegments()}${xpSegments()}
  </div>
  <div class="no-shrink stretch-x"><div class="hidden lg:block">${scene('scene_url_small')}</div>${divider}</div>
  <div class="grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--small stretch-x">
    {% if attention %}${attention('label lg:title--small', 4)}{% else %}${recapBlock(true)}{% endif %}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(3, 'label lg:title--small', 16, 26)}
  </div>
  ${qrFooter()}
  {% endif %}`

/** Quarter, portrait: hero line, the stories, then the companion QR across the bottom. */
const quadrantPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <span class="no-shrink label lg:title--small" data-clamp="2">{{ hero_name | escape }}, level {{ level }} · HP {{ hp }}/{{ max_hp }}</span>
  <div class="grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small stretch-x">
    {% if attention %}${attention('label lg:title--small', 3)}{% else %}${recapBlock(true)}{% endif %}
    ${storyList(3, 'label lg:title--small', 16, 24)}
  </div>
  ${qrFooter()}
  {% endif %}`

/**
 * Side, landscape: hero and QR side by side, then the recap and stories. A portrait Half has nearly the same proportions
 * but less height, so it uses this arrangement without the scene and with the one-line recap.
 */
const halfVerticalBody = (withScene: boolean) => `
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <div class="grid no-shrink stretch-x gap--small">
    <div class="col--span-8 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${statusLine(2, 42)}${nextTick('label lg:title--small')}${withScene ? hpBar(' progress-bar--small') : hpSegments()}
      <div class="hidden lg:block stretch-x">${withScene ? xpBar(' progress-bar--small') : xpSegments()}</div>
    </div>
    <div class="col--span-4 flex flex--col flex--center-x flex--top">${bagQr()}</div>
  </div>
  <div class="no-shrink stretch-x">${withScene ? `<div class="hidden lg:block">${scene('scene_url_small')}</div>` : ''}${divider}</div>
  <div class="grow h--full h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--small pt--2">
    {% if attention %}${attention('label lg:title--small', 3)}{% else %}${recapBlock(!withScene)}{% endif %}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title title--small lg:title', 24, 50)}
  </div>
  {% endif %}
`

const halfVerticalLandscape = halfVerticalBody(true)
const halfHorizontalPortrait = halfVerticalBody(false)

export const markupFull = `${glyphAssigns([16, 24])}${oriented('layout layout--col layout--top layout--stretch-x gap--xsmall lg:gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('full')}
  {% else %}
  <div class="grid no-shrink stretch-x gap--medium">
    <div class="col--span-5 flex flex--col flex--left gap--xsmall">
      <span class="title lg:hidden" data-clamp="1">{{ hero_name | truncate: 12 | escape }}, level {{ level }}</span>
      <span class="hidden lg:inline-block title lg:title--large" data-fit-value="true">{{ hero_name | escape }}, level {{ level }}</span>
      ${statusLine(2, 56)}${nextTick('hidden lg:block label lg:title--small')}
      <span class="hidden lg:block label lg:title--small">{{ gold }} gold · {{ potions }} {% if potions == 1 %}potion{% else %}potions{% endif %}</span>
    </div>
    <div class="col--span-7">
      <div class="grid grid--cols-1 gap--small">
        <div class="grid grid--cols-2 gap--medium lg:gap--large">
          <div>${hpBar(' lg:progress-bar--large')}</div>
          <div>${xpBar(' lg:progress-bar--large')}</div>
        </div>
        <div class="hidden lg:block"><div class="grid grid--cols-2 gap--large">${gearSlot('Weapon', 'weapon')}${gearSlot('Armor', 'armor')}</div></div>
      </div>
    </div>
  </div>
  <div class="no-shrink flex flex--col gap--small stretch-x">${scene('scene_url_small', 'scene_url_large')}
    <div class="grid stretch-x gap--small">
      <div class="col--span-10">${divider}</div>
      <div class="col--span-2 flex flex--row flex--center-y gap--xsmall"><div class="border--h-30 grow"></div><span class="label lg:title--small no-shrink">{% if qr_base != "" %}Companion{% else %}Your bag{% endif %}</span><div class="border--h-30 grow"></div></div>
    </div>
  </div>
  <div class="grid grow h--full h--min-0 stretch-x gap--small pt--1 lg:pt--2" data-story-columns="true">
    <div class="col--span-7 lg:col--span-6 flex flex--col flex--left flex--top gap--xsmall lg:gap--small h--full">
      ${attention('label lg:title--small', 2)}
      {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title lg:title', 24, 56)}
    </div>
    <div class="col--span-3 lg:col--span-4 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      {% if qr_base == "" %}${rankPanel}{% endif %}
    </div>
    <div class="col--span-2 flex flex--col flex--center-x flex--top gap--small">${bagQr(3, 4, false)}</div>
  </div>
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}
`, fullPortrait, titleBarFull)}${fitStories}`

export const markupHalfHorizontal = `${glyphAssigns([16, 24])}${oriented('layout layout--col layout--top layout--stretch-x gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('halfHorizontal')}
  {% else %}
  <div class="grid grow h--full h--min-0 stretch-x gap--medium">
    <div class="col--span-3 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${statusLine(2, 28)}${nextTick('label lg:title--small')}${hpBar(' progress-bar--small')}
      <div class="hidden lg:block">${scene('scene_url_small')}</div>
    </div>
    <div class="col--span-7 h--full flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      ${attention('label lg:title--small', 3)}${storyList(2, 'label lg:title--small', 16, 62)}
    </div>
    <div class="col--span-2 flex flex--col flex--center-x flex--top">${bagQr()}</div>
  </div>
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}
`, halfHorizontalPortrait, titleBar)}${fitStories}`

export const markupHalfVertical = `${glyphAssigns([16, 24])}${oriented('layout layout--col layout--top layout--stretch-x gap--small lg:gap--medium', halfVerticalLandscape, halfVerticalPortrait, titleBar)}${fitStories}`

export const markupQuadrant = `${glyphAssigns([16])}${oriented('layout layout--col layout--top layout--stretch-x gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('quadrant')}
  {% else %}
    <span class="no-shrink label lg:title--small" data-clamp="1">{{ hero_name | escape }}, level {{ level }} · HP {{ hp }}/{{ max_hp }}</span>
    <div class="grid grow h--full h--min-0 stretch-x gap--small">
      <div class="col--span-8 h--full flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
        {% if attention %}${attention('label lg:title--small', 3)}{% else %}${recapBlock(true)}{% endif %}
        ${storyList(2, 'label lg:title--small', 16, 40)}
      </div>
      <div class="col--span-4 flex flex--col flex--center-x flex--top gap--small">${bagQr()}
        <div class="hidden lg:block stretch-x">${scene('scene_url_small')}</div>
      </div>
    </div>
  {% endif %}
`, quadrantPortrait, titleBar)}${fitStories}`

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
