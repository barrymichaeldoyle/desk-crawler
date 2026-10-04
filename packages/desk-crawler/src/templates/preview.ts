/**
 * Browser preview shell for the TRMNL templates: the pinned framework 3.4 CSS/JS,
 * a device screen class and the mashup wrapper for each layout. Used by the
 * local layout matrix and the companion's live preview. This approximates
 * TRMNL's renderer; real-device renders stay the acceptance gate.
 */
export const FRAMEWORK_VERSION = '3.4.0'

/** OG (800x480, 1-bit) and X (4-bit) screen classes from framework 3.4; sizes are the framework's CSS layout boxes (X lays out at 1872x1404). */
export const PREVIEW_DEVICES = {
  og: { label: 'TRMNL OG', width: 800, height: 480, classes: 'screen screen--og screen--md screen--1bit screen--landscape' },
  x: { label: 'TRMNL X', width: 1872, height: 1404, classes: 'screen screen--v2 screen--lg screen--4bit screen--landscape' },
} as const
export type PreviewDevice = keyof typeof PREVIEW_DEVICES

export const PREVIEW_LAYOUTS = {
  markup: { label: 'Full', wrapper: (inner: string) => `<div class="view view--full">${inner}</div>` },
  markup_half_horizontal: {
    label: 'Half',
    wrapper: (inner: string) => `<div class="mashup mashup--1Tx1B"><div class="view view--half_horizontal">${inner}</div><div class="view view--half_horizontal"></div></div>`,
  },
  markup_half_vertical: {
    label: 'Side',
    wrapper: (inner: string) => `<div class="mashup mashup--1Lx1R"><div class="view view--half_vertical">${inner}</div><div class="view view--half_vertical"></div></div>`,
  },
  markup_quadrant: {
    label: 'Quarter',
    wrapper: (inner: string) =>
      `<div class="mashup mashup--2x2"><div class="view view--quadrant">${inner}</div><div class="view view--quadrant"></div><div class="view view--quadrant"></div><div class="view view--quadrant"></div></div>`,
  },
} as const
export type PreviewLayout = keyof typeof PREVIEW_LAYOUTS

/** Mashup slots this plugin does not own: a dither field labelled as the owner's other plugins. */
const OTHER_SLOTS_STYLE = `.trmnl .screen .mashup .view:empty{background:conic-gradient(#000 25%,#fff 0 50%,#000 0 75%,#fff 0) 0 0/12px 12px !important;opacity:.35}`

/**
 * A standalone HTML document for one rendered layout on one device class.
 * `<base>` points relative framework URLs (its bitmap fonts) at trmnl.com, which
 * a file or srcdoc document could not otherwise resolve.
 */
export function previewDocument(renderedMarkup: string, device: PreviewDevice, layout: PreviewLayout, title = 'Desk Crawler', options: { shadeOtherSlots?: boolean } = {}): string {
  return `<!doctype html><html><head><meta charset="utf-8"><title>${title}</title><base href="https://trmnl.com/">
<link rel="stylesheet" href="https://trmnl.com/css/${FRAMEWORK_VERSION}/plugins.css"><script src="https://trmnl.com/js/${FRAMEWORK_VERSION}/plugins.js"></script>
<style>html,body{margin:0;overflow:hidden}${options.shadeOtherSlots ? OTHER_SLOTS_STYLE : ''}</style>
</head><body class="environment trmnl"><div class="${PREVIEW_DEVICES[device].classes}">${PREVIEW_LAYOUTS[layout].wrapper(renderedMarkup)}</div></body></html>`
}
