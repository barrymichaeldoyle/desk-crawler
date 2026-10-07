/**
 * Four self-contained TRMNL layouts. Template v36 reworks the full layout: attack and defense beside the name, the bag
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

export const TEMPLATE_VERSION = 36

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
const RUNE_DIVIDER = runeDivider(600)

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


type SceneField = 'scene_url' | 'scene_url_small'
/** Base scene everywhere, swapped for an integer-scaled larger image on screen--lg (TRMNL X). */
const scene = (field: SceneField, large = field === 'scene_url' ? 'scene_url_large' : 'scene_url_medium') => {
  return `
  {% if ${field} != "" %}<div class="flex flex--row flex--center-x stretch-x"><img class="image lg:hidden" src="{{ ${field} }}" alt=""><img class="image hidden lg:block" src="{{ ${large} }}" alt=""></div>{% endif %}`
}

/** The row stretches so the framework's image max-width keeps the rule inside narrow portrait columns. */
const divider = `
  <div class="flex flex--row flex--center-x stretch-x"><img class="image" src="${RUNE_DIVIDER}" alt=""></div>`
/** The full landscape rule shares its row with the leaderboard caption, above the eight-column story list. */
const storyDivider = `
  <div class="flex flex--row flex--center-x stretch-x"><img class="image" src="${runeDivider(500)}" alt=""></div>`

/**
 * HUD marks assigned once per layout (`hud_heart_full`...). Drawn at twice their grid so the X, where the framework
 * scales pixel classes up, keeps whole pixels; the classes size them on the OG.
 */
const HUD_ASSIGNS =
  `{% assign hud_heart_full = "${hudMarkUri('heartFull', 36, 32)}" %}{% assign hud_heart_half = "${hudMarkUri('heartHalf', 36, 32)}" %}{% assign hud_heart_empty = "${hudMarkUri('heartEmpty', 36, 32)}" %}` +
  `{% assign hud_tick_full = "${hudMarkUri('tickFull', 36, 16)}" %}{% assign hud_tick_half = "${hudMarkUri('tickHalf', 36, 16)}" %}{% assign hud_tick_empty = "${hudMarkUri('tickEmpty', 36, 16)}" %}` +
  `{% assign hud_sword = "${hudMarkUri('sword', 24, 24)}" %}{% assign hud_shield = "${hudMarkUri('shield', 24, 24)}" %}` +
  `{% assign hud_coin = "${hudMarkUri('coin', 24, 24)}" %}{% assign hud_potion = "${hudMarkUri('potion', 24, 24)}" %}{% assign hud_star = "${hudMarkUri('star', 24, 24)}" %}{% assign hud_bag = "${hudMarkUri('bag', 24, 24)}" %}`

/**
 * A HUD row: marks and counts that wrap where a column is too narrow for all of them. It never shrinks, so beside a
 * long hero name (the quarter header) the name clamps instead of the hearts sliding past the panel edge.
 */
const hudRow = (data: string, inner: string) => `<div class="flex flex--row flex--wrap flex--left flex--center-y gap--small no-shrink" ${data}>${inner}</div>`

/** One count with its HUD mark instead of a word: the marks name each count, as in the companion's HUD. */
const COUNTER_ICON = 'w--[16px] h--[16px] no-shrink'
const counter = (icon: string, text: string, classes = '') => `<div class="${classes}flex flex--row flex--center-y gap--xsmall no-shrink"><img class="${COUNTER_ICON}" src="{{ ${icon} }}" alt=""><span class="label lg:title--small">${text}</span></div>`
/** Attack and defense (the companion's ATK/DEF, D60): the level base plus the equipped gear. */
const attackDefense = (classes = '') => counter('hud_sword', '{{ attack }}', classes) + counter('hud_shield', '{{ defense }}', classes)
/** Bag slots in use, always beside the potions (D85). Null (unlinked) shows nothing. */
const bagCount = (classes = '') => `{% if bag_capacity %}${counter('hud_bag', '{{ bag_used }}/{{ bag_capacity }}', classes).replace('<div class="', '<div data-bag-count="true" class="')}{% endif %}`
const goldPotions = (classes = '') => counter('hud_coin', '{{ gold }}', classes) + counter('hud_potion', '{{ potions }}', classes)
/**
 * Gold, potions and bag slots under the hero in the full landscape (D85): marks and counts on the OG, the counts named
 * on the X, which has the width for the words.
 */
const heroCounters =
  hudRow('data-counters="marks"', goldPotions() + bagCount()).replace('class="flex', 'class="lg:hidden flex') +
  hudRow('data-counters="words"', counter('hud_coin', '{{ gold }} gold') + counter('hud_potion', '{{ potions }} {% if potions == 1 %}potion{% else %}potions{% endif %}') + bagCount()).replace('class="flex', 'class="hidden lg:flex')

/**
 * The full layouts' name line (D85): the hero and level, then the attack and defense marks. The name gives way first,
 * so a long name clamps rather than pushing the marks off the line.
 */
const nameRow = (names: string) =>
  `<div class="flex flex--row flex--left flex--center-y gap--small stretch-x" data-name-row="true">${names}` +
  `<div class="flex flex--row flex--center-y gap--small no-shrink" data-attack-defense="true">${attackDefense()}</div></div>`

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
  hudRow(`data-hearts="{{ heart_halves }}"`, `<div class="flex flex--row gap--[2px] no-shrink">{% for i in (1..10) %}{% assign heart_right = i | times: 2 %}{% assign heart_left = heart_right | minus: 1 %}<img class="${HEART_CLASSES}" src="{% if heart_halves >= heart_right %}{{ hud_heart_full }}{% elsif heart_halves >= heart_left %}{{ hud_heart_half }}{% else %}{{ hud_heart_empty }}{% endif %}" alt="">{% endfor %}</div>${count ? hpCount : ''}${extra}`)

/**
 * XP as ten half-step ticks the width of the hearts, the thin bar directly under them with the numbers at the end
 * (D74): the same 5% steps and the same floor as the hearts, so liquidjs and Ruby Liquid agree. Wide rows add the
 * coin and potion counts after the numbers (`extra`); the 240-pixel portrait columns wrap the numbers under the ticks.
 */
const TICK_CLASSES = 'w--[18px] h--[8px] no-shrink'
const xpTicks = (extra = '') =>
  `{% assign xp_halves = xp_pct | default: 0 | times: 20 | plus: 50 | divided_by: 100 | floor %}` +
  hudRow(`data-xp-ticks="{{ xp_halves }}"`, `<div class="flex flex--row gap--[2px] no-shrink">{% for i in (1..10) %}{% assign tick_right = i | times: 2 %}{% assign tick_left = tick_right | minus: 1 %}<img class="${TICK_CLASSES}" src="{% if xp_halves >= tick_right %}{{ hud_tick_full }}{% elsif xp_halves >= tick_left %}{{ hud_tick_half }}{% else %}{{ hud_tick_empty }}{% endif %}" alt="">{% endfor %}</div><span class="label lg:title--small no-shrink" data-xp-count="true">{{ xp }}/{{ xp_to_next }} XP</span>${extra}`)

/**
 * The wide HUD (full landscape and portrait): hearts and the HP count on one row; XP ticks and count on the next
 * (attack and defense sit in the name row, D85). The portrait adds coins, potions and bag slots after the XP; the
 * landscape keeps them under the hero (`heroCounters`).
 */
const hudWide = (withCounters: boolean) => `${hearts(true)}
    ${xpTicks(withCounters ? goldPotions() + bagCount() : '')}`

/**
 * Narrow columns (side, half, their portrait forms): the hearts alone fill the width, so the HP count leads a combat
 * row with attack and defense (a full heart marks it), and coins and potions take a row of their own.
 */
const counters = () => `${hudRow('data-counters="true"', counter('hud_heart_full', '{{ hp }}/{{ max_hp }}') + attackDefense())}${hudRow('data-counters="2"', goldPotions() + bagCount())}`

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

/**
 * One story as a ledger line: the glyph, the story, and its HH:MM at the end of the line; the stat changes follow as
 * outlined chips, one per change, indented to the story's edge. The glyph sits two pixels down so it centres on the
 * letters rather than hugging the rule above the entry. The chips sit in a block so they wrap like words when
 * a narrow column cannot hold them all; the 240-pixel portrait columns put the time there too (`timeBelow`), where the
 * story line has no room for it. A zero-gap grid keeps the chips directly beneath the story.
 */
const logLine = (entry: string, classes: string, clamp: number, size: number, fit: number, wrapper = 'block', timeBelow = false) => {
  const time = `{% if utc_offset != nil %}<span class="label lg:title--small no-shrink" data-story-time="true">{{ ${entry}.u | plus: utc_offset | date: "%H:%M" }}</span>{% endif %}`
  const changes = `{% assign line_changes = ${entry}.d | default: "" | split: " · " %}{% for change in line_changes %} <span class="label lg:title--small label--outline">{{ change | escape }}</span>{% endfor %}`
  const hasChanges = `${entry}.d != nil and ${entry}.d != ""`
  return `{% assign line_story = ${entry}.n | default: ${entry}.s %}{% assign line_plain = ${plainOf('line_story')} %}<div class="${wrapper} stretch-x"><div class="grid grid--cols-1 gap--none">${entry === 'log[0]' ? '' : '{% unless forloop.first %}<div class="border--h-30 stretch-x"></div>{% endunless %}'}<div class="flex flex--row flex--left flex--top gap--xsmall"><div class="no-shrink pt--0.5">${logIcon(`${entry}.k`, size)}</div><span class="${classes} grow" ${fitClamp('line_plain', clamp, Math.max(0, fit - (timeBelow ? 0 : 14)))}>${storyText}</span>${timeBelow ? '' : time}</div>{% if ${timeBelow ? `utc_offset != nil or ${hasChanges}` : hasChanges} %}<div class="flex flex--row flex--left flex--top gap--xsmall pt--1" data-story-changes="true"><div class="no-shrink w--[${size}px]"></div><div class="grow w--min-0">${timeBelow ? time : ''}${changes}</div></div>{% endif %}</div></div>`
}

/** The status line, its clamp fitted like log lines. */
const statusLine = (clamp: number, fit: number) =>
  `{% if status_eta_at and utc_offset != nil %}{% assign status_plain = ${plainOf('status_eta_label')} | append: " 00:00" %}{% else %}{% assign status_plain = ${plainOf('status_label')} %}{% endif %}<span class="label lg:title--small" ${fitClamp('status_plain', clamp, fit)}>${statusText}</span>`

/** A big moment (level-up, elite win, jackpot, rare find) gets an inverted badge above the newest story. */
const celebrationBadge = (classes: string) => `
      {% if celebration %}<span class="${classes} label--inverted">{{ celebration | escape }}</span>{% endif %}`

/** Whole story/stat pairs; the fitter keeps the longest newest-first prefix that fits. */
const storyList = (clamp: number, classes: string, size = 16, fit = 60, timeBelow = false) => `
  <div class="grow stretch-x" data-story-list="true">
    {% for entry in log %}{% unless attention and forloop.index > 1 %}{% if forloop.first %}${logLine('entry', classes, clamp, size, fit, 'block', timeBelow)}{% else %}${logLine('entry', 'label lg:title--small', 1, 16, 28, 'block pt--1', timeBelow)}{% endif %}{% endunless %}{% endfor %}
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
 * The seven-day own-group board (D74): the Top 5 as rows, the hero's own row inverted where it appears, and appended
 * after the list when it sits below the rows a device shows. The rank is no longer repeated above the list, since the
 * marked row says it. The OG keeps three rows so every row stays at a readable size; the X shows all five.
 * `heading` puts the period and group line inside the panel; the full landscape carries it in the divider row instead.
 */
/** The row itself is the label, so an inverted own row keeps its text white: a `.label` child would set its own colour. */
const rankRow = (text: string, score: string, classes: string, own: string) =>
  `<div class="${classes}label lg:title--small flex flex--row flex--between flex--center-y stretch-x gap--small{% if ${own} %} label--inverted{% endif %}" data-rank-row="{{ ${text === 'rank' ? 'rank' : 'row.rank'} }}">` +
  `<span class="grow w--min-0" data-clamp="1">{{ ${text} }}. {{ ${text === 'rank' ? 'owner_name' : 'row.name'} | escape }}</span>` +
  `<span class="no-shrink">{{ ${score} }}&nbsp;XP</span></div>`
const rankHeading = `This week{% if leaderboard_cohort_label != "" %} · {{ leaderboard_cohort_label | escape }}{% endif %}`
const rankPanel = (heading: boolean) => `
      ${heading ? `<span class="label lg:title--small text--bold" data-clamp="1">${rankHeading}</span>` : ''}
      {% unless rank %}{% if rank_status == "dormant" %}<span class="label lg:title--small">Not ranked while paused</span>{% else %}<span class="label lg:title--small">Ranking within the hour</span>{% endif %}{% endunless %}
      {% for row in top5 %}${rankRow('row.rank', 'row.score', '{% if forloop.index > 3 %}hidden lg:flex {% endif %}', 'rank and row.rank == rank')}{% endfor %}
      {% if rank and rank > 3 %}${rankRow('rank', 'leaderboard_score', 'lg:hidden ', 'true')}{% endif %}
      {% if rank and rank > 5 %}${rankRow('rank', 'leaderboard_score', 'hidden lg:flex ', 'true')}{% endif %}`

/** Period and group caption in the divider row, flanked by rules like the bag caption; the OG shortens "Levels" to "Lv". */
const rankCaption = `<div class="flex flex--row flex--center-y gap--xsmall stretch-x"><div class="border--h-30 grow"></div><span class="label lg:title--small no-shrink lg:hidden">This week{% if leaderboard_cohort_label != "" %} · {{ leaderboard_cohort_label | replace: "Levels ", "Lv " | escape }}{% endif %}</span><span class="hidden lg:inline-block label lg:title--small no-shrink">${rankHeading}</span><div class="border--h-30 grow"></div></div>`

/**
 * The one quiet attention message (service, delay, death, inventory sleep): never clipped, shown in every size. A
 * notice (D78: the merchant) takes the same slot as an outlined chip but leaves the stories and recap alone.
 */
const attention = (classes: string, clamp: number) => `
      {% if attention %}<span class="${classes} label--underline no-shrink" data-clamp="${clamp}">{{ attention | escape }}</span>{% elsif notice %}<div class="no-shrink pt--1"><span class="${classes} label--outline" data-clamp="${clamp}">{{ notice | escape }}</span></div>{% endif %}`

/** Integer-scaled assets keep every QR module crisp on monochrome displays. */
const qrImage = (scale: number, largeScale: number, field = 'qr_base') =>
  `<img class="image lg:hidden" src="{{ ${field} }}/${scale}.png" alt=""><img class="image hidden lg:block" src="{{ ${field} }}/${largeScale}.png" alt="">`

/**
 * The full layouts' standing link (D85): a small unlabelled code to the companion home in the top-right corner. A full
 * bag takes it away, since the bag-full panel carries its own code.
 */
const homeQr = `{% if qr_base == "" and home_qr_base != "" %}<div class="no-shrink" data-home-qr="true">${qrImage(2, 3, 'home_qr_base')}</div>{% endif %}`

/**
 * A full bag in the full layouts (D85): the stories give way to a panel that says the adventure is paused, with a
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
 * One line under the HUD rows in the full landscape, so the header stays three rows; the portrait keeps the two
 * stacked slots. Plain blocks, not a flex column: the framework's flex gap outranks gap--none and left the caption floating.
 */
const gearSlot = (slot: string, field: string) => `
      <div class="hidden lg:block text--center"><div><span class="label">${slot}</span></div><div><span class="title--small" data-clamp="2">{% if ${field} != "" %}{{ ${field} | escape }}{% else %}None{% endif %}</span></div></div>`
const gearName = (field: string) => `<span class="text--bold inline-block">{% if ${field} != "" %}{{ ${field} | escape }}{% else %}None{% endif %}</span>`
const gearLine = `{% assign gear_plain = weapon | default: "None" | append: armor | default: "None" %}<div class="hidden lg:block stretch-x" data-gear-line="true"><span class="title--small text--regular" ${fitClamp('gear_plain', 1, 44)}>Weapon ${gearName('weapon')} · Armor ${gearName('armor')}</span></div>`

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
const qrFooter = (scale = 3, largeScale = 4) => `
  {% if qr_base != "" or companion_qr_base != "" %}<div class="no-shrink flex flex--row flex--left flex--center-y gap--small stretch-x" data-companion-qr="true">
    {% if qr_base != "" %}<div class="no-shrink">${qrImage(scale, largeScale)}</div><span class="label lg:title--small grow" data-clamp="3">{{ qr_label | escape }}</span>
    {% else %}<div class="no-shrink">${qrImage(scale, largeScale, 'companion_qr_base')}</div><span class="label lg:title--small grow">Your bag</span>{% endif %}
  </div>{% endif %}`

/**
 * Full, portrait: name, attack and defense and status beside the corner QR, HP and XP, the scene, then the stories
 * take the height with the ranking below them; a full bag replaces both with its panel.
 */
const fullPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <div class="no-shrink flex flex--row flex--top gap--small stretch-x">
    <div class="grow w--min-0 flex flex--col flex--left gap--xsmall">
      ${nameRow(`<span class="title lg:hidden w--min-0" data-clamp="1">{{ hero_name | truncate: 16 | escape }}, level {{ level }}</span>
      <span class="hidden lg:inline-block title lg:title--large w--min-0" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>`)}
      ${statusLine(2, 40)}
    </div>
    ${homeQr}
  </div>
  <div class="no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall lg:gap--small stretch-x">
    ${hudWide(true)}
  </div>
  <div class="hidden lg:block no-shrink stretch-x"><div class="grid grid--cols-2 gap--large">${gearSlot('Weapon', 'weapon')}${gearSlot('Armor', 'armor')}</div></div>
  <div class="no-shrink flex flex--col gap--small stretch-x">${scene('scene_url_small', 'scene_url_medium')}${divider}</div>
  {% if qr_base != "" %}${bagFullPanel(true)}
  {% else %}
  <div class="grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small stretch-x">
    ${attention('label lg:title--small', 3)}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title lg:title', 24, 40)}
  </div>
  <div class="no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">${rankPanel(true)}</div>
  {% endif %}
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}`

/** Side, portrait: a narrow column. Hero and health first, the stories take the height, the companion QR closes the column. */
const halfVerticalPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('halfVertical')}
  {% else %}
  <div class="no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">
    <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
    ${statusLine(2, 24)}${hearts(false)}${xpTicks()}${counters()}
  </div>
  <div class="no-shrink stretch-x"><div class="hidden lg:block">${scene('scene_url_small')}</div>${divider}</div>
  <div class="grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--small stretch-x">
    {% if attention %}${attention('label lg:title--small', 4)}{% else %}${attention('label lg:title--small', 4)}${recapBlock()}{% endif %}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(3, 'label lg:title--small', 16, 26, true)}
  </div>
  ${qrFooter()}
  {% endif %}`

/** Quarter, portrait: hero line, the stories, then the companion QR across the bottom. */
const quadrantPortrait = `
  {% if status == "unlinked" or first_run %}${welcome('narrowColumn')}
  {% else %}
  <div class="no-shrink flex flex--col flex--left flex--stretch-x gap--xsmall stretch-x">
    <span class="label lg:title--small" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
    ${hearts(false)}
  </div>
  <div class="grow h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small stretch-x">
    {% if attention %}${attention('label lg:title--small', 3)}{% else %}${attention('label lg:title--small', 3)}${recapBlock(2)}{% endif %}
    ${storyList(3, 'label lg:title--small', 16, 24, true)}
  </div>
  ${qrFooter()}
  {% endif %}`

/**
 * Side, landscape: hero and QR side by side, then the recap and stories. A portrait Half has nearly the same proportions
 * but less height, so it uses this arrangement without the scene and with the one-line recap.
 */
const halfVerticalBody = (withScene: boolean) => `
  {% if status == "unlinked" or first_run %}${welcome(withScene ? 'halfVertical' : 'shortColumn')}
  {% else %}
  <div class="grid no-shrink stretch-x gap--small">
    <div class="col--span-8 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${statusLine(2, 42)}${hearts(false)}
      <div class="hidden lg:block stretch-x">${xpTicks()}</div>
      ${counters()}
    </div>
    <div class="col--span-4 flex flex--col flex--center-x flex--top">${bagQr()}</div>
  </div>
  <div class="no-shrink stretch-x">${withScene ? `<div class="hidden lg:block">${scene('scene_url_small')}</div>` : ''}${divider}</div>
  <div class="grow h--full h--min-0 flex flex--col flex--left flex--top flex--stretch-x gap--small pt--2">
    {% if attention %}${attention('label lg:title--small', 3)}{% else %}${attention('label lg:title--small', 3)}${recapBlock()}{% endif %}
    {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title title--small lg:title', 24, 50)}
  </div>
  {% endif %}
`

const halfVerticalLandscape = halfVerticalBody(true)
const halfHorizontalPortrait = halfVerticalBody(false)

export const markupFull = `${glyphAssigns([16, 24])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--xsmall lg:gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('full')}
  {% else %}
  <div class="no-shrink flex flex--row flex--top gap--medium stretch-x">
    <div class="grid grow w--min-0 gap--medium">
      <div class="col--span-5 flex flex--col flex--left gap--xsmall">
        ${nameRow(`<span class="title lg:hidden w--min-0" data-clamp="1">{{ hero_name | truncate: 12 | escape }}, level {{ level }}</span>
        <span class="hidden lg:inline-block title w--min-0" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>`)}
        ${statusLine(2, 56)}
        ${heroCounters}
      </div>
      <div class="col--span-7 flex flex--col flex--left flex--stretch-x gap--xsmall">
        ${hudWide(false)}
        ${gearLine}
      </div>
    </div>
    ${homeQr}
  </div>
  <div class="no-shrink flex flex--col gap--small stretch-x">${scene('scene_url_small', 'scene_url_large')}
    <div class="grid stretch-x gap--small">
      <div class="col--span-8">${storyDivider}</div>
      <div class="col--span-4 flex flex--col flex--center-y">{% if qr_base == "" %}${rankCaption}{% else %}<div class="border--h-30 stretch-x"></div>{% endif %}</div>
    </div>
  </div>
  {% if qr_base != "" %}${bagFullPanel(false)}
  {% else %}
  <div class="grid grow h--full h--min-0 stretch-x gap--small pt--1 lg:pt--2" data-story-columns="true">
    <div class="col--span-8 flex flex--col flex--left flex--top gap--xsmall lg:gap--small h--full">
      ${attention('label lg:title--small', 2)}
      {% unless recap %}${celebrationBadge('label lg:title--small')}{% endunless %}${storyList(2, 'title lg:title', 24, 64)}
    </div>
    <div class="col--span-4 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      ${rankPanel(false)}
    </div>
  </div>
  {% endif %}
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}
`, fullPortrait, titleBar)}${fitStories}`

export const markupHalfHorizontal = `${glyphAssigns([16, 24])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('halfHorizontal')}
  {% else %}
  <div class="grid grow h--full h--min-0 stretch-x gap--medium">
    <div class="col--span-4 flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      <span class="title title--small lg:title" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${statusLine(2, 36)}${hearts(false)}
      <div class="hidden lg:block stretch-x">${xpTicks()}</div>
      ${counters()}
      <div class="hidden lg:block">${scene('scene_url_small')}</div>
    </div>
    <div class="col--span-6 h--full flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
      ${attention('label lg:title--small', 3)}${storyList(2, 'label lg:title--small', 16, 62)}
    </div>
    <div class="col--span-2 flex flex--col flex--center-x flex--top">${bagQr()}</div>
  </div>
  {% unless attention %}${recapRibbon}{% endunless %}
  {% endif %}
`, halfHorizontalPortrait, titleBar)}${fitStories}`

export const markupHalfVertical = `${glyphAssigns([16, 24])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--small lg:gap--medium', halfVerticalLandscape, halfVerticalPortrait, titleBar, titleBarNarrow)}${fitStories}`

export const markupQuadrant = `${glyphAssigns([16])}${HUD_ASSIGNS}${oriented('layout layout--col layout--top layout--stretch-x gap--small', `
  {% if status == "unlinked" or first_run %}${welcome('quadrant')}
  {% else %}
    <div class="no-shrink flex flex--row flex--left flex--center-y gap--small stretch-x">
      <span class="label lg:title--small grow w--min-0" data-clamp="1">{{ hero_name | escape }}, level {{ level }}</span>
      ${hearts(false)}
    </div>
    <div class="grid grow h--full h--min-0 stretch-x gap--small">
      <div class="col--span-8 h--full flex flex--col flex--left flex--top flex--stretch-x gap--xsmall lg:gap--small">
        {% if attention %}${attention('label lg:title--small', 3)}{% else %}${attention('label lg:title--small', 3)}${recapBlock(2)}{% endif %}
        ${storyList(2, 'label lg:title--small', 16, 40)}
      </div>
      <div class="col--span-4 flex flex--col flex--center-x flex--top gap--small">${bagQr()}
        <div class="hidden lg:block stretch-x">${scene('scene_url_small')}</div>
      </div>
    </div>
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
