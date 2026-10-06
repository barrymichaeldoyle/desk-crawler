import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useRef, useState } from 'react'
import { POTION_HEAL_PCT } from '@trmnl-games/desk-crawler/content/sustain'
import { pctOf } from '@trmnl-games/desk-crawler/sim/core/stats'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../../lib/seo'
import { artUrl, useIntent } from '../../../lib/intent'
import { ActionFeedback, BUTTON_PRIMARY, Button, LoadingState } from '../../../lib/ui'
import { BIOME_SWATCH } from '../../../lib/palette'
import { preload } from '../../../lib/preload'
import { ReturnRecap } from './-recap'
import { GameScreen } from './-gameScreen'
import { AdventureLog } from './-log'
import { Records } from './-records'
import { Achievements } from './-achievements'

const DevicePreview = lazy(() => import('./-devicePreview').then((module) => ({ default: module.DevicePreview })))

export const Route = createFileRoute('/app/desk-crawler/')({
  head: () => seo({ title: 'Hero', index: false }),
  loader: ({ context }) =>
    preload(context, convexQuery(api.heroes.mine, {}), convexQuery(api.inventory.mine, {}), convexQuery(api.heroes.returnSummary, {}), convexQuery(api.leaderboard.view, {}), convexQuery(api.achievements.mine, {})),
  component: HeroHome,
})

type Biome = { id: string; name: string; unlocked: boolean; unlockLevel: number }

/**
 * The game screen leads: the hero's scene in colour under a platformer HUD,
 * then the few commands the game asks for, the world map, the quest log and
 * what the owner's TRMNL is showing.
 */
function HeroHome() {
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  if (!hero) return <LoadingState label="Loading your hero…" />
  const biomeName = hero.biomes.find((b: Biome) => b.id === hero.biomeId)?.name ?? ''
  const targetName = hero.biomes.find((b: Biome) => b.id === hero.targetBiomeId)?.name ?? ''

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <GameScreen hero={{ ...hero, biomeName, targetName }} />
      <HeroSheet hero={hero} />
      <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
        <div className="flex min-w-0 flex-col gap-8">
          <div className="flex flex-col gap-3">
            <ReturnRecap />
            <LiveGain hero={hero} />
          </div>
          <section aria-labelledby="trmnl-title" className="flex flex-col gap-3">
            <h2 id="trmnl-title" className="font-display text-3xl font-bold">On your TRMNL</h2>
            <Suspense fallback={<div className="aspect-[4/3] overflow-hidden rounded-[1.4rem] border-[12px] border-[#3a3566] bg-white"><img src={artUrl(hero.scenePath)} alt={`${hero.name}'s current scene`} width={760} height={200} className="mt-[15%] w-full [image-rendering:pixelated]" /></div>}>
              <DevicePreview sceneUrl={artUrl(hero.scenePath)} heroName={hero.name} />
            </Suspense>
            <Link to="/app/desk-crawler/settings" hash="desk-keepsakes" className="inline-flex min-h-11 items-center text-sm underline underline-offset-4">Enter a keepsake code</Link>
          </section>
        </div>
        <div className="flex min-w-0 flex-col gap-8">
          <AdventureLog />
          <Records counters={hero.counters} lifetimeXp={hero.lifetimeXp} stopped={hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === null)} />
          <Achievements />
        </div>
      </div>
    </div>
  )
}

/**
 * The recap above stays frozen for the visit (D25); this line counts what
 * arrives while the page is open, from the live hero subscription.
 */
function LiveGain({ hero }: { hero: { lifetimeXp: number; level: number; counters: { combatWins: number; goldEarned: number; itemsFound: number; deaths: number } } }) {
  const start = useRef(hero)
  const gained = (
    [
      ['XP', hero.lifetimeXp - start.current.lifetimeXp],
      ['level', hero.level - start.current.level],
      ['fight won', hero.counters.combatWins - start.current.counters.combatWins],
      ['gold', hero.counters.goldEarned - start.current.counters.goldEarned],
      ['item found', hero.counters.itemsFound - start.current.counters.itemsFound],
      ['knockout', hero.counters.deaths - start.current.counters.deaths],
    ] as const
  ).filter(([, value]) => value > 0)
  if (gained.length === 0) return null
  const label = (unit: string, value: number) => (unit === 'XP' || unit === 'gold' || value === 1 ? unit : unit.replace(/^(\w+)/, '$1s'))
  return (
    <p role="status" className="hud border-[3px] border-gold px-3 py-2 text-hud-sm text-gold-ink">
      While you've been here: {gained.map(([unit, value]) => `+${value.toLocaleString()} ${label(unit, value)}`).join(', ')}
    </p>
  )
}

// heroes.mine is validated as v.any(), so its shape is read structurally here.
type HeroView = {
  name: string
  level: number
  status: string
  hp: number
  maxHp: number
  xp: number
  xpToNext: number
  attack: number
  defense: number
  gold: number
  biomeId: string
  targetBiomeId: string | null
  simulationState: string
  biomes: Biome[]
}

function HeroSheet({ hero }: { hero: HeroView }) {
  const { data: bag } = useQuery(convexQuery(api.inventory.mine, {}))
  const travel = useIntent(api.heroes.changeBiome)
  const potion = useIntent(api.inventory.usePotion)
  const pause = useIntent(api.heroes.pause)
  const resume = useIntent(api.heroes.resume)
  const [action, setAction] = useState<'potion' | 'pause' | 'resume' | null>(null)
  const feedback = action ? { potion, pause, resume }[action] : null
  const healthy = hero.simulationState !== 'quarantined'
  const canAct = healthy && (hero.status === 'exploring' || hero.status === 'resting')
  const busy = travel.pending || potion.pending || pause.pending || resume.pending
  const healing = Math.min(hero.maxHp - hero.hp, pctOf(hero.maxHp, POTION_HEAL_PCT))
  const potionLabel = !bag ? 'Drink potion' : !bag.potions ? 'No potions' : hero.hp >= hero.maxHp ? `Drink potion (${bag.potions})` : `Drink potion +${healing} HP (${bag.potions})`

  const stopNote = hero.status === 'paused' ? 'Resume adventures to travel.' : hero.status === 'sleeping' ? 'Make room in your bag to travel.' : hero.status === 'dead' ? 'Travel opens again once your hero is back on their feet.' : null

  return (
    <div className="flex min-w-0 flex-col gap-8">
      <section aria-label="Commands" className="flex flex-col gap-2">
        {canAct || hero.status === 'paused' || hero.status === 'sleeping' ? (
          <div className="flex flex-wrap gap-2">
            {hero.status === 'sleeping' ? (
              <Link to="/app/desk-crawler/inventory" className={`inline-flex min-h-11 items-center px-4 ${BUTTON_PRIMARY}`}>
                Open bag
              </Link>
            ) : null}
            {hero.status === 'paused' ? (
              <Button pending={resume.pending} busyLabel="Resuming…" disabled={!healthy || busy} onClick={() => { setAction('resume'); return resume.run({}, 'Adventures resumed. Your hero joins the next adventure.') }}>
                Resume adventures
              </Button>
            ) : null}
            {canAct ? (
              <Button variant={hero.hp < hero.maxHp && bag?.potions ? 'primary' : 'secondary'} pending={potion.pending} busyLabel="Drinking…" disabled={busy || hero.hp >= hero.maxHp || !bag?.potions} onClick={() => { setAction('potion'); return potion.run({}, `Potion drunk, +${healing} HP.`) }}>
                {potionLabel}
              </Button>
            ) : null}
            {canAct ? (
              <Button variant="secondary" pending={pause.pending} busyLabel="Pausing…" disabled={busy} onClick={() => { setAction('pause'); return pause.run({}, 'Adventures paused.') }}>
                Pause adventures
              </Button>
            ) : null}
          </div>
        ) : null}
        {!healthy ? <p className="text-sm">Paused for a service check. <Link to="/support" className="underline underline-offset-4">Contact support</Link> if it lasts.</p> : null}
        <ActionFeedback error={feedback?.error ?? null} message={feedback?.message ?? null} />
      </section>

      <section aria-labelledby="map-title">
        <h2 id="map-title" className="font-display text-3xl font-bold">World map</h2>
        <ol className="mt-4 grid gap-3 sm:grid-cols-3 sm:gap-[15px]">
          {hero.biomes.map((biome, index) => {
            const here = biome.id === hero.biomeId
            const onTheWay = biome.id === hero.targetBiomeId
            return (
              <li key={biome.id} aria-current={here ? 'location' : undefined} className={`relative flex min-w-0 flex-col gap-1 p-4 sm:not-last:after:absolute sm:not-last:after:top-1/2 sm:not-last:after:-right-[15px] sm:not-last:after:w-[15px] sm:not-last:after:border-t-4 sm:not-last:after:border-dashed sm:not-last:after:border-gold sm:not-last:after:content-[''] ${biome.unlocked ? `border-[3px] border-night ${BIOME_SWATCH[biome.id] ?? 'bg-panel'}` : 'border-[3px] border-dashed border-faint bg-panel text-muted'} ${here ? 'outline-4 outline-gold' : ''}`}>
                <span className="flex items-center gap-2 font-display text-2xl font-bold">
                  <span aria-label={`World ${index + 1}`} className="hud grid size-7 shrink-0 place-items-center border-[3px] border-night bg-night text-hud-sm text-gold-ink">{index + 1}</span>
                  {biome.name}
                </span>
                <span className="text-sm font-semibold">{biome.unlocked ? (here ? 'Exploring' : onTheWay ? 'Arriving next adventure' : 'Unlocked') : `Locked until level ${biome.unlockLevel}`}</span>
                {biome.unlocked && !here && !onTheWay ? (
                  <Button className="mt-2 self-start" pending={travel.pending} busyLabel="Travelling…" aria-label={`Travel to ${biome.name}`} disabled={!canAct || busy} onClick={() => travel.run({ biomeId: biome.id }, `Travelling to ${biome.name}. Arrive on the next adventure.`)}>
                    Travel
                  </Button>
                ) : null}
              </li>
            )
          })}
        </ol>
        {!canAct && hero.status !== 'travelling' && stopNote ? <p className="mt-3 text-sm text-muted">{stopNote}</p> : null}
        <ActionFeedback {...travel} />
      </section>
    </div>
  )
}
