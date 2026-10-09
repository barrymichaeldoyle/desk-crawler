import { describe, expect, it } from 'vitest'
import { Liquid } from 'liquidjs'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { buildPayload } from '@trmnl-games/slow-cast/payload'
import { parseScenePath, renderSlowCastArt, sceneBase, SCENE_SCALES } from '@trmnl-games/slow-cast/art/route'
import { composeScene, poseFor, STAGE_HEIGHT, STAGE_WIDTH } from '@trmnl-games/slow-cast/art/scene'
import { FISH_TRAITS, fishSprite } from '@trmnl-games/slow-cast/art/fish'
import { screenMarkup } from '@trmnl-games/slow-cast/templates/screen'
import { previewScenarios, PREVIEW_NOW } from '@trmnl-games/slow-cast/templates/previewScenarios'

const ART = 'https://art.example'
const scenarios = previewScenarios(ART)

describe('Slow Cast fish art', () => {
  it('has traits for every species and draws each at both sizes within bounds', () => {
    for (const species of contentV1.species) {
      expect(FISH_TRAITS[species.id], species.id).toBeDefined()
      for (const [w, h] of [[30, 12], [15, 7]] as const) {
        const sprite = fishSprite(species.id, w, h)
        expect(sprite.rows).toHaveLength(h)
        expect(sprite.rows.every((row) => row.length === w)).toBe(true)
        expect(sprite.rows.join('')).toMatch(/#/)
      }
    }
  })
})

describe('Slow Cast scenes and codes', () => {
  it('composes a stage for every water, band, weather and pose', () => {
    for (const water of ['millpond', 'river_bend', 'harbour_pier'] as const)
      for (const band of ['dawn', 'day', 'dusk', 'night'] as const)
        for (const weather of ['clear', 'overcast', 'rain', 'wind', 'fog'] as const)
          for (const pose of ['waiting', 'casting', 'reeling', 'holding', 'paused'] as const) {
            const canvas = composeScene({ water, band, weather, pose, fish: pose === 'holding' ? 'roach' : null })
            expect(canvas.width).toBe(STAGE_WIDTH)
            expect(canvas.height).toBe(STAGE_HEIGHT)
          }
  })

  it('round-trips scene paths and refuses anything off the allowlist', () => {
    const base = sceneBase({ water: 'river_bend', band: 'dusk', weather: 'rain', pose: 'holding', fish: 'salmon' })
    expect(base).toBe('/art/sc/scene/v1/river_bend/dusk/rain/holding/salmon')
    expect(parseScenePath(`${base}/5.png`)).toMatchObject({ water: 'river_bend', fish: 'salmon', scale: 5 })
    expect(sceneBase({ water: 'millpond', band: 'day', weather: 'clear', pose: 'waiting', fish: 'roach' })).toBe('/art/sc/scene/v1/millpond/day/clear/waiting/none')
    for (const bad of [`${base}/7.png`, '/art/sc/scene/v1/ocean/day/clear/waiting/none/5.png', '/art/sc/scene/v1/millpond/day/clear/waiting/shark/5.png', '/art/sc/scene/v2/millpond/day/clear/waiting/none/5.png', '/art/sc/qr/v1/anything/3.png'])
      expect(renderSlowCastArt(bad, 'https://trmnlgames.com'), bad).toBeNull()
    expect(renderSlowCastArt('/art/sc/qr/v1/home/3.png', 'https://trmnlgames.com')?.immutable).toBe(false)
    expect(renderSlowCastArt(`${base}/2.png`, 'https://trmnlgames.com')?.immutable).toBe(true)
    expect([...SCENE_SCALES]).toEqual([1, 2, 3, 4, 5, 6, 8, 10])
  })

  it('holds up a kept or released fish, bends the rod for one that got away', () => {
    expect(poseFor('fishing', 'catch')).toBe('holding')
    expect(poseFor('fishing', 'release')).toBe('holding')
    expect(poseFor('fishing', 'got_away')).toBe('reeling')
    expect(poseFor('fishing', 'ambient')).toBe('waiting')
    expect(poseFor('paused', 'catch')).toBe('paused')
  })
})

describe('Slow Cast payload', () => {
  it('shows the newest catch in the scene, the counters and a recap', () => {
    const payload = buildPayload(scenarios.catch!)
    expect(payload).toMatchObject({
      status: 'fishing',
      status_label: 'Casting at River Bend',
      conditions_label: 'dusk, overcast',
      cooler_label: '7/18',
      bait_label: 'Maggots 34',
      attention: null,
      latest_catch: { species_id: 'barbel', name: 'Barbel', weight_label: '1.9 kg' },
      scene_base: `${ART}/art/sc/scene/v1/river_bend/dusk/overcast/holding/barbel`,
      qr_base: `${ART}/art/sc/qr/v1/home`,
      recap: 'Last 12 hours: 3 fish, best 1.9 kg Barbel, 1 got away',
    })
  })

  it('says what needs a hand, most urgent first', () => {
    expect(buildPayload(scenarios.coolerFull!)).toMatchObject({ cooler_full: true, attention: 'Cooler full: sell in the companion.', qr_base: `${ART}/art/sc/qr/v1/cooler` })
    expect(buildPayload(scenarios.bareHook!)).toMatchObject({ bait_label: 'Bare hook', attention: 'Out of maggots: bare hook.' })
    expect(buildPayload(scenarios.stale!).attention).toBe('Updates delayed. Nothing is lost.')
    expect(buildPayload(scenarios.servicePaused!)).toMatchObject({ data_state: 'service_paused', attention: 'Paused for a service check. Nothing is lost.' })
    expect(buildPayload(scenarios.travelling!)).toMatchObject({ status: 'travelling', status_label: 'Heading to Harbour Pier' })
    expect(buildPayload(scenarios.paused!).scene_base).toContain('/paused/none')
  })

  it('asks for setup before the angler is active', () => {
    expect(buildPayload(scenarios.pending!)).toMatchObject({ status: 'pending', status_label: 'Waiting for TRMNL Save', alias: 'Barry', scene_base: '' })
    expect(buildPayload(scenarios.unlinked!)).toMatchObject({ status: 'unlinked', alias: null })
  })

  it('leaves image fields empty without an art origin', () => {
    expect(buildPayload({ ...scenarios.catch!, artBaseUrl: null })).toMatchObject({ scene_base: '', qr_base: '' })
  })

  it('drops stories older than twelve hours from the recap', () => {
    const old = { ...scenarios.catch!, stories: scenarios.catch!.stories.map((s) => ({ ...s, at: PREVIEW_NOW - 13 * 3_600_000 })) }
    expect(buildPayload(old).recap).toBeNull()
  })
})

describe('Slow Cast markup', () => {
  const liquid = new Liquid({ timezoneOffset: 0 })

  it('uses no inline style and starts at the layout, not a second view', () => {
    for (const markup of Object.values(screenMarkup)) {
      expect(markup).not.toMatch(/style=/)
      expect(markup).not.toMatch(/class="view/)
      expect(markup).toMatch(/class="title_bar portrait:hidden"/)
    }
  })

  it('escapes the public name in every layout', async () => {
    const payload = { ...buildPayload({ ...scenarios.catch!, angler: { ...scenarios.catch!.angler!, alias: '<b>x</b>' } }), fly_code: null }
    for (const markup of Object.values(screenMarkup)) {
      const html = await liquid.parseAndRender(markup, payload)
      expect(html).not.toContain('<b>x</b>')
      expect(html).toContain('&lt;b&gt;x&lt;/b&gt;')
    }
  })

  it('renders every preview state in every layout without Liquid errors', async () => {
    for (const input of Object.values(scenarios)) for (const markup of Object.values(screenMarkup)) await liquid.parseAndRender(markup, { ...buildPayload(input), fly_code: null })
  })
})
