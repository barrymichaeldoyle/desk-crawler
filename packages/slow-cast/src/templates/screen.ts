/**
 * Slow Cast screen markup (slow-cast.md "Device"), TRMNL framework Liquid over the payload's flat
 * merge variables. S2 ships readable text layouts for all four sizes; S3 replaces them with the
 * pixel scene and the full layout rules.
 */
const header = `<div class="title_bar"><span class="title">Slow Cast</span><span class="instance">{{ alias }}{% if level %} · Level {{ level }}{% endif %}</span></div>`

const statusBlock = `<div class="item"><div class="content"><span class="title title--small">{{ status_label }}</span>{% if conditions_label %}<span class="label label--small">{{ conditions_label }}</span>{% endif %}</div></div>`

const attentionBlock = `{% if attention %}<div class="item"><div class="content"><span class="label label--inverted">{{ attention }}</span></div></div>{% endif %}`

const stories = (limit: number) => `{% for story in stories limit:${limit} %}<div class="item"><div class="content"><span class="description">{{ story.summary }}</span></div></div>{% endfor %}`

const stats = `{% if cooler_label %}<div class="item"><div class="content"><span class="label">Cooler {{ cooler_label }} · {{ bait_label }} · {{ gold }} gold</span></div></div>{% endif %}`

const view = (body: string, size: string) => `<div class="view view--${size}"><div class="layout layout--col gap--small">${body}</div>${header}</div>`

export const screenMarkup = {
  markup: view(statusBlock + attentionBlock + stories(4) + stats, 'full'),
  markup_half_horizontal: view(statusBlock + attentionBlock + stories(1) + stats, 'half_horizontal'),
  markup_half_vertical: view(statusBlock + attentionBlock + stories(2) + stats, 'half_vertical'),
  markup_quadrant: view(statusBlock + attentionBlock + stories(1), 'quadrant'),
} as const
