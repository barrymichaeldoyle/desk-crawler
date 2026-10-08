import { describe, expect, it } from 'vitest'
import { Liquid } from 'liquidjs'
import { buildPayload } from '@trmnl-games/desk-crawler/payload'
import { screenMarkup } from '@trmnl-games/desk-crawler/templates/screen'
import { PREVIEW_DEVICES, PREVIEW_LAYOUTS, previewDocument, type PreviewDevice, type PreviewLayout } from '@trmnl-games/desk-crawler/templates/preview'
import { previewScenarios, withOvernightRecap } from '@trmnl-games/desk-crawler/templates/previewScenarios'

const { groups, overnightEntries } = previewScenarios('https://art.example')
const scenarios = Object.values(groups).flatMap((group) => Object.entries(group))

describe('preview scenarios', () => {
  it('have unique names across groups, so gallery links stay unambiguous', () => {
    const names = scenarios.map(([name]) => name)
    expect(new Set(names).size).toBe(names.length)
  })

  // Every scenario twice in four large templates: each template is parsed once, and the bulk render gets more time
  // than the default five seconds, which a slower build machine exceeded once the X mashup blocks arrived (D95).
  it('render every layout with and without the overnight recap', async () => {
    const liquid = new Liquid({ timezoneOffset: 0 })
    const layouts = Object.keys(PREVIEW_LAYOUTS) as PreviewLayout[]
    const templates = Object.fromEntries(layouts.map((layout) => [layout, liquid.parse(screenMarkup[layout])]))
    for (const [name, input] of scenarios) {
      for (const recap of [false, true]) {
        const payload = buildPayload(recap ? withOvernightRecap(input, overnightEntries) : input)
        for (const layout of layouts) {
          const html = await liquid.render(templates[layout]!, { ...payload, utc_offset: 7200 })
          expect(html.trim(), `${name} ${layout}`).not.toBe('')
        }
      }
    }
  }, 30_000)

  it('shade other mashup slots, including the X card layer, and swap orientation classes for portrait', () => {
    for (const device of Object.keys(PREVIEW_DEVICES) as PreviewDevice[]) {
      const html = previewDocument('<p>x</p>', device, 'markup_quadrant', 't', { shadeOtherSlots: true, portrait: true })
      expect(html).toContain('.view:empty::before')
      expect(html).toContain('screen--portrait')
      expect(html).not.toContain('screen--landscape')
    }
  })
})
