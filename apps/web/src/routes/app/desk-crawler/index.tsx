import { convexQuery } from '@convex-dev/react-query'
import { useQuery } from '@tanstack/react-query'
import { Link, createFileRoute } from '@tanstack/react-router'
import { usePaginatedQuery } from 'convex/react'
import { api } from '@trmnl-games/backend/api'
import { seo } from '../../../lib/seo'
import { artUrl, useIntent } from '../../../lib/intent'
import { Button, Card, ErrorNote, Meter } from '../../../lib/ui'
import { ReturnRecap } from './-recap'
import { preload } from '../../../lib/preload'

export const Route = createFileRoute('/app/desk-crawler/')({ head: () => seo({ title: 'Hero', index: false }), loader: ({ context }) => preload(context, convexQuery(api.heroes.mine, {}), convexQuery(api.heroes.returnSummary, {})), component: HeroHome })

const STATUS_TEXT: Record<string, (hero: { biomeName: string; targetName: string }) => string> = {
  exploring: (h) => `Exploring the ${h.biomeName}`,
  resting: (h) => `Resting in the ${h.biomeName}`,
  travelling: (h) => `Travelling to the ${h.targetName}`,
  dead: () => 'Knocked out.',
  paused: () => 'Paused by you',
  sleeping: () => 'Bag full. Make room to resume.',
}

function HeroHome() {
  const { data: hero } = useQuery(convexQuery(api.heroes.mine, {}))
  const travel = useIntent(api.heroes.changeBiome)
  const potion = useIntent(api.inventory.usePotion)
  const pause = useIntent(api.heroes.pause)
  const resume = useIntent(api.heroes.resume)
  if (!hero) return <p role="status" className="text-stone-600 dark:text-stone-400">Loading your hero…</p>

  const biomeName = hero.biomes.find((b: { id: string }) => b.id === hero.biomeId)?.name ?? ''
  const targetName = hero.biomes.find((b: { id: string }) => b.id === hero.targetBiomeId)?.name ?? ''
  const canAct = hero.status === 'exploring' || hero.status === 'resting'
  const ticksTo = (deadline: number | null) => (deadline === null ? null : Math.max(0, deadline - hero.lastTick))

  return (
    <>
      <div className="overflow-hidden rounded-lg border-2 border-stone-900 bg-white dark:border-stone-300">
        <img src={artUrl(hero.scenePath)} alt={`${hero.name} in the ${biomeName}`} className="block w-full [image-rendering:pixelated]" width={760} height={200} />
      </div>

      <ReturnRecap />

      <Card>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-2xl font-bold">{hero.name}</h1>
          <span className="text-sm text-stone-600 dark:text-stone-400">Level {hero.level} Warrior</span>
        </div>
        <p className="mt-1 font-semibold" aria-live="polite">
          {STATUS_TEXT[hero.status]?.({ biomeName, targetName })}
          {hero.status === 'dead' && ticksTo(hero.reviveAtTick) !== null ? ` Revives in ${ticksTo(hero.reviveAtTick)} ticks.` : ''}
        </p>
        {hero.simulationState === 'quarantined' ? <p className="mt-2 text-sm">Paused for a service check. Nothing is lost.</p> : null}
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <Meter label="HP" value={hero.hp} max={hero.maxHp} />
          <Meter label="XP" value={hero.xp} max={hero.xpToNext} />
        </div>
        <dl className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <dt className="text-stone-600 dark:text-stone-400">Attack</dt>
            <dd className="text-lg font-bold tabular-nums">{hero.attack}</dd>
          </div>
          <div>
            <dt className="text-stone-600 dark:text-stone-400">Defense</dt>
            <dd className="text-lg font-bold tabular-nums">{hero.defense}</dd>
          </div>
          <div>
            <dt className="text-stone-600 dark:text-stone-400">Gold</dt>
            <dd className="text-lg font-bold tabular-nums">{hero.gold}</dd>
          </div>
        </dl>
        <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">Gold will be spendable once the merchant arrives in a later update.</p>
        <div className="mt-4 flex flex-wrap gap-2">
          {hero.status === 'sleeping' ? (
            <Link to="/app/desk-crawler/inventory" className="inline-flex min-h-11 items-center rounded-md bg-stone-900 px-4 font-semibold text-white dark:bg-stone-100 dark:text-stone-900">
              Open bag
            </Link>
          ) : null}
          {canAct ? (
            <Button variant="secondary" disabled={potion.pending || hero.hp >= hero.maxHp} onClick={() => potion.run({})}>
              Drink potion
            </Button>
          ) : null}
          {canAct ? (
            <Button variant="secondary" disabled={pause.pending} onClick={() => pause.run({})}>
              Pause adventures
            </Button>
          ) : null}
          {hero.status === 'paused' ? (
            <Button disabled={resume.pending} onClick={() => resume.run({})}>
              Resume adventures
            </Button>
          ) : null}
        </div>
        <ErrorNote message={potion.error ?? pause.error ?? resume.error} />
      </Card>

      <Card title="Where to explore">
        <p className="mb-3 text-sm text-stone-600 dark:text-stone-400">Travel takes one tick. Harder areas give more XP and better gear, and hit harder.</p>
        <ul className="flex flex-col gap-2">
          {hero.biomes.map((biome: { id: string; name: string; unlocked: boolean; unlockLevel: number }) => (
            <li key={biome.id} className="flex items-center justify-between gap-2">
              <span>
                <span className="font-semibold">{biome.name}</span>
                {!biome.unlocked ? <span className="ml-2 text-sm text-stone-600 dark:text-stone-400">Unlocks at level {biome.unlockLevel}</span> : null}
                {biome.id === hero.biomeId ? <span className="ml-2 text-sm text-stone-600 dark:text-stone-400">You are here</span> : null}
              </span>
              {biome.unlocked && biome.id !== hero.biomeId ? (
                <Button variant="secondary" disabled={!canAct || travel.pending} onClick={() => travel.run({ biomeId: biome.id })}>
                  Travel
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
        <ErrorNote message={travel.error} />
      </Card>

      <AdventureLog />
    </>
  )
}

function AdventureLog() {
  const { results, status, loadMore } = usePaginatedQuery(api.heroes.recentLog, {}, { initialNumItems: 15 })
  return (
    <Card title="Adventure log">
      <ol className="flex flex-col divide-y divide-stone-200 dark:divide-stone-800">
        {results.map((entry: { id: string; at: number; summary: string; kind: string }) => (
          <li key={entry.id} className="py-2">
            <p>{entry.summary}</p>
            <time className="text-xs text-stone-600 dark:text-stone-400" dateTime={new Date(entry.at).toISOString()}>
              {new Date(entry.at).toLocaleString(undefined, { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
            </time>
          </li>
        ))}
      </ol>
      {status === 'CanLoadMore' ? (
        <Button variant="quiet" onClick={() => loadMore(15)}>
          Load older entries
        </Button>
      ) : null}
      {status === 'Exhausted' ? <p className="mt-2 text-xs text-stone-600 dark:text-stone-400">Detailed history is kept for three days.</p> : null}
    </Card>
  )
}
