import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { lazy, Suspense, useRef, useState } from 'react'
import { POTION_HEAL_PCT } from '@trmnl-games/desk-crawler/content/sustain'
import { pctOf } from '@trmnl-games/desk-crawler/sim/core/stats'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../../lib/seo'
import { artUrl, useIntent } from '../../../lib/intent'
import { ActionFeedback, BUTTON_PRIMARY, Button, LoadingState, Meter } from '../../../lib/ui'
import { BIOME_SWATCH } from '../../../lib/palette'
import { preload } from '../../../lib/preload'
import { ReturnRecap } from './-recap'
import { Pulse } from './-pulse'
import { AdventureLog } from './-log'
import { Records } from './-records'

const DevicePreview = lazy(() => import('./-devicePreview').then((module) => ({ default: module.DevicePreview })))

export const Route = createFileRoute('/app/desk-crawler/')({
  head: () => seo({ title: 'Hero', index: false }),
  loader: ({ context }) =>
    preload(context, convexQuery(api.heroes.mine, {}), convexQuery(api.inventory.mine, {}), convexQuery(api.heroes.returnSummary, {}), convexQuery(api.leaderboard.view, {})),
  component: HeroHome,
})

type Biome = { id: string; name: string; unlocked: boolean; unlockLevel: number }

/**
 * Desk and feed: the TRMNL screen anchors the page (pinned left on wide
 * screens); the feed beside it tells how the hero got there and offers the
 * few decisions the game asks for.
 */
function HeroHome() {
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  if (!hero) return <LoadingState label="Loading your hero…" />
  const biomeName = hero.biomes.find((b: Biome) => b.id === hero.biomeId)?.name ?? ''
  const targetName = hero.biomes.find((b: Biome) => b.id === hero.targetBiomeId)?.name ?? ''

  return (
    <div className="grid gap-x-10 gap-y-6 lg:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <header className="flex min-w-0 flex-wrap items-center justify-between gap-x-4 gap-y-1 lg:col-span-2">
        <div className="flex min-w-0 items-center gap-4">
          <img src="/games/desk-crawler/icon-192.png" alt="" width={64} height={64} className="window size-16 shrink-0 p-0 [image-rendering:pixelated] sm:size-[4.5rem]" />
          <h1 className="min-w-0 font-display text-5xl font-bold">{hero.name}</h1>
        </div>
        <p className="text-sm text-muted"><span className="font-semibold text-gold-ink">Level {hero.level}</span> Warrior · {biomeName}</p>
      </header>
      <div className="grid grid-cols-2 gap-4 lg:hidden">
        <Meter label="Health" tone="hp" value={hero.hp} max={hero.maxHp} />
        <Meter label="Level XP" tone="xp" value={hero.xp} max={hero.xpToNext} />
      </div>
      <div className="flex flex-col lg:sticky lg:top-16 lg:self-start">
        <div className="mb-4">
          <Pulse hero={{ ...hero, biomeName, targetName }} />
        </div>
        <Suspense fallback={<div className="aspect-[4/3] overflow-hidden rounded-[1.4rem] border-[12px] border-night bg-white dark:border-[#2b3474]"><img src={artUrl(hero.scenePath)} alt={`${hero.name}'s current scene`} width={760} height={200} className="mt-[15%] w-full [image-rendering:pixelated]" /></div>}>
          <DevicePreview sceneUrl={artUrl(hero.scenePath)} heroName={hero.name} />
        </Suspense>
        <Link to="/app/desk-crawler/settings" hash="desk-keepsakes" className="mt-3 inline-flex min-h-11 items-center text-sm underline underline-offset-4">Spot a keepsake code on your TRMNL? Add it to your desk collection.</Link>
      </div>

      <div className="flex flex-col gap-10">
        <HeroSheet hero={hero} />
        <div className="flex flex-col gap-3">
          <ReturnRecap />
          <LiveGain hero={hero} />
        </div>
        <AdventureLog />
        <Records counters={hero.counters} lifetimeXp={hero.lifetimeXp} stopped={hero.status === 'paused' || (hero.status === 'sleeping' && hero.wakeAtTick === null)} />
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
    <p role="status" className="border-y-2 border-gold py-2 font-semibold tabular-nums text-gold-ink">
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

  return (
    <div className="flex min-w-0 flex-col gap-6">
    <section aria-labelledby="status-title" className="window flex min-w-0 flex-col gap-5 px-4 pt-3 pb-4 sm:px-5">
      <h2 id="status-title" className="-mb-2 font-display text-xl font-semibold text-gold-ink">Status</h2>

      <div className="hidden grid-cols-2 gap-4 lg:grid">
        <Meter label="Health" tone="hp" value={hero.hp} max={hero.maxHp} />
        <Meter label="Level XP" tone="xp" value={hero.xp} max={hero.xpToNext} />
      </div>

      <dl className="flex flex-wrap gap-x-8 gap-y-2">
        {(
          [
            ['Attack', hero.attack],
            ['Defense', hero.defense],
            ['Gold', hero.gold],
          ] as const
        ).map(([label, value]) => (
          <div key={label} className="flex items-baseline gap-2">
            <dt className="caps text-sm text-muted">{label}</dt>
            <dd className={`text-xl font-bold tabular-nums ${label === 'Gold' ? 'text-gold-ink' : ''}`}>{value.toLocaleString()}</dd>
          </div>
        ))}
      </dl>
      <p className="-mt-3 text-sm text-muted">Gold is saved for later updates. There’s nothing to buy yet.</p>

      {canAct || hero.status === 'paused' || hero.status === 'sleeping' ? (
        <div className="flex flex-wrap gap-2">
          {hero.status === 'sleeping' ? (
            <Link to="/app/desk-crawler/inventory" className={`inline-flex min-h-11 items-center px-4 font-semibold ${BUTTON_PRIMARY}`}>
              Open bag
            </Link>
          ) : null}
          {hero.status === 'paused' ? (
            <Button pending={resume.pending} busyLabel="Resuming…" disabled={!healthy || busy} onClick={() => { setAction('resume'); return resume.run({}, 'Adventures resumed. Your hero joins the next adventure.') }}>
              Resume adventures
            </Button>
          ) : null}
          {canAct ? (
            <Button variant={hero.hp < hero.maxHp && bag?.potions ? 'primary' : 'secondary'} pending={potion.pending} busyLabel="Drinking…" disabled={busy || hero.hp >= hero.maxHp || !bag?.potions} onClick={() => { setAction('potion'); return potion.run({}, 'Potion used. Your health is updated.') }}>
              Drink potion{bag ? ` (${bag.potions})` : ''}
            </Button>
          ) : null}
          {canAct ? (
            <Button variant="secondary" pending={pause.pending} busyLabel="Pausing…" disabled={busy} onClick={() => { setAction('pause'); return pause.run({}, 'Adventures paused. Resume whenever you’re ready.') }}>
              Pause adventures
            </Button>
          ) : null}
        </div>
      ) : null}
      {canAct ? <p className="-mt-3 text-sm text-muted">{hero.hp >= hero.maxHp ? 'Your hero is at full health.' : bag?.potions ? `A potion restores ${healing} HP. Your hero also drinks them automatically when needed.` : bag ? 'No potions left. Your hero can find more while exploring and rests to recover health.' : 'Checking potions…'}</p> : null}
      {!healthy ? <p className="text-sm">Your hero is paused for a service check. Progress is safe. <Link to="/support" className="underline underline-offset-4">Get help</Link>.</p> : null}
      <ActionFeedback error={feedback?.error ?? null} message={feedback?.message ?? null} />
    </section>

      <section aria-labelledby="explore-title" className="window min-w-0 px-4 pt-3 pb-4 sm:px-5">
        <h2 id="explore-title" className="font-display text-xl font-semibold text-gold-ink">Where to explore</h2>
        <p className="mt-1 text-sm text-muted">Arrive on the next adventure, without an encounter on arrival. Harder areas offer more XP and better gear, but hit harder.</p>
        <ul className="mt-3 border-t-2 border-edge">
          {hero.biomes.map((biome) => (
            <li key={biome.id} className="flex min-h-12 items-center justify-between gap-3 border-b border-rule py-1">
              <span className={`flex min-w-0 flex-wrap items-center gap-x-2 ${biome.unlocked ? '' : 'text-faint'}`}>
                <span aria-hidden="true" className={`size-3 shrink-0 border-2 border-night ${biome.unlocked ? (BIOME_SWATCH[biome.id] ?? 'bg-muted') : 'dither'}`} />
                <span className="font-semibold">{biome.name}</span>
                {biome.id === hero.biomeId ? <span className="text-sm font-semibold text-gold-ink">You are here</span> : null}
                {biome.id === hero.targetBiomeId ? <span className="text-sm font-semibold text-sky-ink">On the way</span> : null}
                {!biome.unlocked ? <span className="border-2 border-dashed border-faint px-1.5 text-xs font-semibold tracking-wide text-muted uppercase">Locked · level {biome.unlockLevel}</span> : null}
              </span>
              {biome.unlocked && biome.id !== hero.biomeId && biome.id !== hero.targetBiomeId ? (
                <Button pending={travel.pending} busyLabel="Travelling…" aria-label={`Travel to ${biome.name}`} disabled={!canAct || busy} onClick={() => travel.run({ biomeId: biome.id }, `Travelling to ${biome.name}. Arrive on the next adventure.`)}>
                  Travel
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        {!canAct && hero.status !== 'travelling' ? (
          <p className="mt-2 text-sm text-muted">
            {hero.status === 'paused' ? 'Resume adventures to travel.' : hero.status === 'sleeping' ? 'Make room in your bag to travel.' : hero.status === 'dead' ? 'Travel opens again once your hero is back on their feet.' : null}
          </p>
        ) : null}
        <ActionFeedback {...travel} />
      </section>
    </div>
  )
}
