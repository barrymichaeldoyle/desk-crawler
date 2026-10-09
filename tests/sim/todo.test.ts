import { describe, expect, it } from 'vitest'
import { catalogs } from '@trmnl-games/desk-crawler/content'
import { validateCatalog } from '@trmnl-games/desk-crawler/content/validate'
import { applyItemChanges } from '@trmnl-games/desk-crawler/sim/core/apply'
import { simulateHero, SIMULATION_VERSION } from '@trmnl-games/desk-crawler/sim/core/simulate'
import { starterHero, starterKit } from '@trmnl-games/desk-crawler/sim/core/starter'
import { maxHp } from '@trmnl-games/desk-crawler/sim/core/stats'
import { createRng } from '@trmnl-games/desk-crawler/sim/core/rng'
import { generateTask, hereBiomeId, isLocal, nextStandupAfter, standupAt, swapTask, swapUsed, taskLabel } from '@trmnl-games/desk-crawler/sim/core/todo'
import type { HeroState, ItemSnapshot, SimulationResult, StreamSeeds, TodoList, TodoTask } from '@trmnl-games/desk-crawler/sim/core/types'
import { seeds, withId } from './helpers'

const v8 = catalogs.v8
const v9 = catalogs.v9
const HOUR = 60 * 60 * 1000
const QUARTER = 15 * 60 * 1000
/** 2026-10-09 00:00 UTC: tick 0 of these tests. */
const EPOCH = Date.UTC(2026, 9, 9)
const at = (tick: number) => EPOCH + tick * QUARTER
/** Tick of a UTC hour on day `day` (0-based). */
const tickAt = (day: number, hour: number, minutes = 0) => (day * 24 + hour) * 4 + minutes / 15

const withQuest = (n: number): StreamSeeds => ({ ...seeds(n), quest: (n * 1597334677 + 11) >>> 0 })

function hero(overrides: Partial<HeroState> = {}): { hero: HeroState; inventory: ItemSnapshot[] } {
  const kit = starterKit(v9)
  const inventory = [withId(kit.weapon, 'i000'), withId(kit.armor, 'i001'), withId(kit.potions, 'i999')]
  return { hero: { ...starterHero('hero1', v9, 0), weaponId: 'i000', armorId: 'i001', ...overrides }, inventory }
}

const task = (overrides: Partial<TodoTask> = {}): TodoTask => ({ templateId: 'defeat_any', target: 5, progress: 0, reward: 35, addedTick: 0, refillsSeen: 0, ...overrides })

/** A list written at the 07:00 UTC stand-up of day 0. */
function list(tasks: readonly TodoTask[], overrides: Partial<TodoList> = {}): TodoList {
  return { tasks, lastRefillTick: tickAt(0, 7), lastStandupAt: EPOCH + 7 * HOUR, ...overrides }
}

const localList = () =>
  list([task(), task({ templateId: 'find_gear', target: 2 }), task({ templateId: 'explore_biome', biomeId: 'office_cubicles', target: 30 })])

function run(h: HeroState, inventory: readonly ItemSnapshot[], tick: number, seed: number, utcOffsetSeconds?: number): SimulationResult {
  return simulateHero({ hero: h, inventory, tick, content: v9, simulationVersion: SIMULATION_VERSION, streams: withQuest(seed), tickAt: at(tick), ...(utcOffsetSeconds === undefined ? {} : { utcOffsetSeconds }) })
}

function find(h: HeroState, inventory: readonly ItemSnapshot[], tick: number, predicate: (result: SimulationResult) => boolean, offset?: number): SimulationResult {
  for (let seed = 0; seed < 20_000; seed += 1) {
    const result = run(h, inventory, tick, seed, offset)
    if (predicate(result)) return result
  }
  throw new Error('no seed satisfied the predicate')
}

describe('to-do list catalog (P31)', () => {
  it('is valid under v9 and absent before it', () => {
    expect(validateCatalog(v9)).toEqual([])
    expect(v8.todo).toBeUndefined()
    expect(v9.todo?.refillHour).toBe(7)
    expect(v9.todo?.minRefillGapTicks).toBe(80)
    expect(v9.todo?.rewardByTier).toEqual({ 1: 5, 2: 16, 3: 30 })
  })

  it('rejects broken to-do rules', () => {
    const rules = v9.todo!
    const broken = (todo: Partial<typeof rules>) => validateCatalog({ ...v9, todo: { ...rules, ...todo } })
    expect(broken({ templates: [...rules.templates, rules.templates[0]!] })).toContain('to-do templates must have one per kind')
    expect(broken({ minRefillGapTicks: 96 })).toContain('to-do refill floor must be 1 to 95 ticks')
    expect(broken({ rewardByTier: { 1: 35, 2: 70 } })).toContain('to-do reward for tier 3 must be a positive integer')
    expect(broken({ templates: rules.templates.map((t) => (t.kind === 'defeat_any' ? { ...t, label: 'Win {target} fights in {biome}' } : t)) })).toContain('to-do defeat_any label uses {biome}: Win {target} fights in {biome}')
    expect(broken({ templates: rules.templates.map((t) => (t.kind === 'explore_biome' ? { ...t, target: { 1: { min: 16, max: 40 } } } : t)) })).toContain('to-do explore_biome needs a target for tier 2')
    const { paper_imp: _, ...plurals } = rules.monsterPlurals
    expect(broken({ monsterPlurals: plurals })).toContain('to-do needs a short plural for paper_imp')
  })

  it('labels tasks with bold names and singular forms', () => {
    expect(taskLabel(task({ templateId: 'defeat_monster', biomeId: 'office_cubicles', monsterId: 'paper_imp', target: 4 }), v9)).toBe('Defeat 4 [[Paper Imps]]')
    expect(taskLabel(task({ templateId: 'defeat_monster', biomeId: 'server_room', monsterId: 'overheated_rack', target: 1 }), v9)).toBe('Defeat an [[Overheated Rack]]')
    expect(taskLabel(task({ templateId: 'explore_biome', biomeId: 'server_room', target: 16 }), v9)).toBe('Explore the [[Server Room]] for 16 adventures')
    expect(taskLabel(task({ templateId: 'elite', target: 1 }), v9)).toBe('Beat an elite')
    expect(taskLabel(task({ templateId: 'find_gear', target: 1 }), v9)).toBe('Find a piece of gear')
  })
})

describe('to-do list replay (P31)', () => {
  it('leaves the tick itself exactly as v8 plays it, seed by seed', () => {
    const states: HeroState[] = [
      hero().hero,
      hero({ level: 5, hp: maxHp(5), biomeId: 'server_room', todo: localList() }).hero,
      hero({ status: 'resting', hp: 10, todo: localList() }).hero,
    ]
    for (const h of states) {
      const { inventory } = hero()
      for (let seed = 0; seed < 300; seed += 1) {
        const tick = tickAt(0, 3)
        const old = simulateHero({ hero: h, inventory, tick, content: v8, simulationVersion: SIMULATION_VERSION, streams: seeds(seed) })
        const next = run(h, inventory, tick, seed)
        // Items stamp the catalog that made them; nothing else may differ.
        const stamp = (r: SimulationResult) => r.itemChanges.map((change) => (change.type === 'create' ? { ...change, item: { ...change.item, contentVersion: 'x' } } : change))
        expect(stamp(next)).toEqual(stamp(old))
        expect(next.disposition).toBe(old.disposition)
        expect(next.event?.summary).toBe(old.event?.summary)
        expect(next.event?.deltas).toEqual(old.event?.deltas)
        expect({ ...next.event?.detail, contentVersion: 'x' }).toEqual(old.event === undefined ? { contentVersion: 'x' } : { ...old.event.detail, contentVersion: 'x' })
        const { todo: _a, gold: goldNext, counters: countersNext, ...restNext } = next.nextHero
        const { todo: _b, gold: goldOld, counters: countersOld, ...restOld } = old.nextHero
        expect(restNext).toEqual(restOld)
        const taskGold = (next.extraEvents ?? []).reduce((sum, e) => sum + e.deltas.gold, 0)
        expect(goldNext).toBe(goldOld + taskGold)
        expect({ ...countersNext, goldEarned: countersNext.goldEarned - taskGold, tasksCompleted: 0 }).toEqual({ ...countersOld, tasksCompleted: 0 })
      }
    }
  })

  it('carries a stored list untouched under v8, so a rollback keeps it', () => {
    const { hero: h, inventory } = hero({ todo: localList() })
    const result = simulateHero({ hero: h, inventory, tick: 50, content: v8, simulationVersion: SIMULATION_VERSION, streams: seeds(3) })
    expect(result.nextHero.todo).toBe(h.todo)
    expect(result.extraEvents).toBeUndefined()
  })

  it('needs the quest stream under v9', () => {
    const { hero: h, inventory } = hero()
    expect(() => simulateHero({ hero: h, inventory, tick: 5, content: v9, simulationVersion: SIMULATION_VERSION, streams: seeds(1) })).toThrow('QUEST_SEED')
  })
})

describe('writing the list (P31)', () => {
  it('fills three tasks at the first evaluation and logs them as a stand-up after the story', () => {
    const { hero: h, inventory } = hero()
    const result = find(h, inventory, tickAt(0, 3), (r) => r.event !== undefined)
    const todo = result.nextHero.todo!
    expect(todo.tasks).toHaveLength(3)
    expect(new Set(todo.tasks.map((t) => t.templateId)).size).toBe(3)
    expect(todo.lastRefillTick).toBe(tickAt(0, 3))
    // 03:00 UTC belongs to the stand-up day that began at 07:00 the day before.
    expect(todo.lastStandupAt).toBe(EPOCH - 17 * HOUR)
    expect(result.extraEvents).toHaveLength(1)
    expect(result.extraEvents![0]).toMatchObject({ kind: 'todo', deltas: { xpEarned: 0, gold: 0, hp: 0 }, detail: { outcome: { variant: 'todo', phase: 'standup' } } })
    expect(result.extraEvents![0]!.summary).toMatch(/^Stand-up: /)
    expect(result.event?.kind).not.toBe('todo')
  })

  it('fills no list for a dead or travelling hero until it takes part again', () => {
    const dead = hero({ status: 'dead', hp: 0, reviveAtTick: 999, biomeId: 'server_room', level: 5 })
    expect(run(dead.hero, dead.inventory, 10, 1).nextHero.todo).toBeUndefined()
    const travelling = hero({ status: 'travelling', targetBiomeId: 'server_room', arriveAtTick: 999, level: 5 })
    expect(run(travelling.hero, travelling.inventory, 10, 1).nextHero.todo).toBeUndefined()
  })

  it('writes two of three tasks for where the hero stands, at most one away, never two of a kind', () => {
    const positions: Partial<HeroState>[] = [
      { level: 1 },
      { level: 5, hp: maxHp(5), biomeId: 'server_room' },
      { level: 9, hp: maxHp(9), biomeId: 'cafeteria_depths' },
      { level: 9, hp: maxHp(9), biomeId: 'office_cubicles' },
      { level: 9, hp: maxHp(9), status: 'sleeping', targetBiomeId: 'cafeteria_depths', wakeAtTick: 999 },
    ]
    let awayLists = 0
    for (const position of positions) {
      const { hero: h } = hero(position)
      const unlocked = new Set(v9.biomes.filter((b) => b.unlockLevel <= h.level).map((b) => b.id))
      for (let seed = 0; seed < 400; seed += 1) {
        const rng = createRng(seed)
        const tasks: TodoTask[] = []
        for (let i = 0; i < 3; i += 1) tasks.push(generateTask(rng, v9, h, tasks, 1))
        const here = hereBiomeId(h)
        const away = tasks.filter((t) => !isLocal(t, here))
        expect(away.length).toBeLessThanOrEqual(unlocked.size > 1 ? 1 : 0)
        if (away.length > 0) awayLists += 1
        expect(new Set(tasks.map((t) => t.templateId)).size).toBe(3)
        for (const t of tasks) {
          if (t.biomeId !== undefined) expect(unlocked.has(t.biomeId)).toBe(true)
          if (t.monsterId !== undefined) expect(v9.biomes.find((b) => b.id === t.biomeId)!.monsterIds).toContain(t.monsterId)
          if (t.templateId === 'elite') expect(h.level).toBeGreaterThanOrEqual(4)
          const tier = v9.biomes.find((b) => b.id === (t.biomeId ?? here))!.tier
          expect(t.reward).toBe(v9.todo!.rewardByTier[tier])
          const range = v9.todo!.templates.find((x) => x.kind === t.templateId)!.target[tier]!
          expect(t.target).toBeGreaterThanOrEqual(range.min)
          expect(t.target).toBeLessThanOrEqual(range.max)
        }
      }
    }
    // The invitation to travel shows up, but not on most lists.
    expect(awayLists).toBeGreaterThan(100)
    expect(awayLists).toBeLessThan(800)
  })
})

describe('progress and payouts (P31)', () => {
  it('ticks a task off in the tick it completes and pays its gold after the story', () => {
    const { hero: h, inventory } = hero({ todo: list([task({ target: 3, progress: 2 }), task({ templateId: 'find_gear', target: 2 }), task({ templateId: 'explore_biome', biomeId: 'office_cubicles', target: 30, progress: 4 })]) })
    const tick = tickAt(0, 12)
    const result = find(h, inventory, tick, (r) => r.metrics.victories === 1)
    const todo = result.nextHero.todo!
    expect(todo.tasks[0]).toMatchObject({ progress: 3, doneTick: tick })
    expect(todo.tasks[2]).toMatchObject({ progress: 5 })
    expect(result.nextHero.counters.tasksCompleted).toBe(1)
    expect(result.extraEvents).toEqual([
      expect.objectContaining({ kind: 'todo', summary: 'Ticked off: Win 3 fights.', deltas: { xpEarned: 0, gold: 35, hp: 0 } }),
    ])
    expect(result.nextHero.gold).toBe(h.gold + result.event!.deltas.gold + 35)
    // The story's own deltas leave the task gold out, so the encounter line and the chip stay apart.
    expect(result.nextHero.counters.goldEarned).toBe(h.counters.goldEarned + result.event!.deltas.gold + 35)
  })

  it('pays several tasks in one line and never moves a finished task', () => {
    const done = task({ templateId: 'find_gear', target: 1, progress: 1, doneTick: 3 })
    const { hero: h, inventory } = hero({ todo: list([task({ target: 1 }), done, task({ templateId: 'defeat_monster', biomeId: 'office_cubicles', monsterId: 'paper_imp', target: 1 })]) })
    const result = find(h, inventory, tickAt(0, 12), (r) => r.event?.detail.outcome.variant === 'combat' && r.event.detail.outcome.monsterId === 'paper_imp' && r.metrics.victories === 1)
    expect(result.extraEvents![0]!.summary).toBe('Ticked off: Win a fight. Defeat a [[Paper Imp]].')
    expect(result.extraEvents![0]!.deltas.gold).toBe(70)
    expect(result.nextHero.todo!.tasks[1]).toBe(done)
  })

  it('counts only encounter gold toward earning gold', () => {
    const { hero: h, inventory } = hero({ todo: list([task({ templateId: 'earn_gold', target: 500 }), task({ templateId: 'find_gear', target: 2 }), task()]) })
    const result = find(h, inventory, tickAt(0, 12), (r) => r.event?.detail.outcome.variant === 'loot' && r.event.detail.outcome.goldGranted > 0)
    const outcome = result.event!.detail.outcome
    expect(result.nextHero.todo!.tasks[0]!.progress).toBe(outcome.variant === 'loot' ? outcome.goldGranted : -1)
  })

  it('only explores the named biome toward an explore task, and stops while resting', () => {
    const away = list([task({ templateId: 'explore_biome', biomeId: 'server_room', target: 20 }), task({ templateId: 'find_gear', target: 2 }), task()])
    const { hero: h, inventory } = hero({ level: 5, hp: maxHp(5), todo: away })
    expect(run(h, inventory, tickAt(0, 12), 4).nextHero.todo!.tasks[0]!.progress).toBe(0)
    const resting = hero({ status: 'resting', hp: 5, todo: localList() })
    const result = run(resting.hero, resting.inventory, tickAt(0, 12), 4)
    expect(result.nextHero.todo!.tasks.map((t) => t.progress)).toEqual([0, 0, 0])
  })
})

describe('the stand-up (P31)', () => {
  const finished = () =>
    list([task({ target: 1, progress: 1, doneTick: 40 }), task({ templateId: 'find_gear', target: 2, progress: 1 }), task({ templateId: 'explore_biome', biomeId: 'office_cubicles', target: 30 })])

  it('refills only finished slots at the next local 07:00, not before', () => {
    const { hero: h, inventory } = hero({ todo: finished() })
    expect(run(h, inventory, tickAt(1, 6, 45), 1).nextHero.todo!.lastRefillTick).toBe(tickAt(0, 7))
    const refill = run(h, inventory, tickAt(1, 7), 1)
    const todo = refill.nextHero.todo!
    expect(todo.lastRefillTick).toBe(tickAt(1, 7))
    expect(todo.lastStandupAt).toBe(EPOCH + 31 * HOUR)
    expect(todo.tasks[0]!.addedTick).toBe(tickAt(1, 7))
    expect(todo.tasks[1]).toMatchObject({ templateId: 'find_gear', progress: 1, refillsSeen: 1 })
    expect(todo.tasks[2]).toMatchObject({ templateId: 'explore_biome', refillsSeen: 1 })
    expect(refill.metrics.todoRefills).toBe(1)
    const standup = refill.extraEvents!.find((e) => e.detail.outcome.variant === 'todo' && e.detail.outcome.phase === 'standup')!
    expect(standup.summary).toBe(`Stand-up: ${taskLabel(todo.tasks[0]!, v9)}.`)
  })

  it("follows the owner's offset", () => {
    const { hero: h, inventory } = hero({ todo: finished() })
    // UTC+2: local 07:00 on day 1 is 05:00 UTC.
    expect(run(h, inventory, tickAt(1, 4, 45), 1, 7200).nextHero.todo!.lastRefillTick).toBe(tickAt(0, 7))
    expect(run(h, inventory, tickAt(1, 5), 1, 7200).nextHero.todo!.lastRefillTick).toBe(tickAt(1, 5))
  })

  it('keeps 20 hours between stand-ups when the offset jumps forward', () => {
    const { hero: h, inventory } = hero({ todo: finished() })
    // UTC+14 makes 17:00 UTC on day 0 local 07:00 on day 1: only 10 hours after the last stand-up.
    expect(run(h, inventory, tickAt(0, 17), 1, 14 * 3600).nextHero.todo!.lastRefillTick).toBe(tickAt(0, 7))
    expect(run(h, inventory, tickAt(1, 2, 45), 1, 14 * 3600).nextHero.todo!.lastRefillTick).toBe(tickAt(0, 7))
    // The first UTC+14 07:00 at least 20 hours on is 17:00 UTC on day 1.
    expect(nextStandupAfter(finished(), 14 * 3600, v9)).toBe(EPOCH + 41 * HOUR)
    expect(run(h, inventory, tickAt(1, 17), 1, 14 * 3600).nextHero.todo!.lastRefillTick).toBe(tickAt(1, 17))
  })

  it('a late refill does not push the next morning back', () => {
    // Paused all day, back at 23:00: the late refill counts as that day's stand-up, so 07:00 comes as usual.
    const late = list(finished().tasks, { lastRefillTick: tickAt(1, 23), lastStandupAt: EPOCH + 31 * HOUR })
    const { hero: h, inventory } = hero({ todo: late })
    expect(run(h, inventory, tickAt(2, 7), 1).nextHero.todo!.lastRefillTick).toBe(tickAt(2, 7))
  })

  it('waits for a dead, travelling or paused hero and refills a sleeping one', () => {
    const tick = tickAt(1, 7)
    const dead = hero({ status: 'dead', hp: 0, reviveAtTick: tick + 5, todo: finished() })
    expect(run(dead.hero, dead.inventory, tick, 1).nextHero.todo!.lastRefillTick).toBe(tickAt(0, 7))
    const paused = hero({ status: 'paused', pausedFromStatus: 'exploring', todo: finished() })
    expect(run(paused.hero, paused.inventory, tick, 1).nextHero.todo!.lastRefillTick).toBe(tickAt(0, 7))
    const sleeping = hero({ status: 'sleeping', todo: finished() })
    const result = run(sleeping.hero, sleeping.inventory, tick, 1)
    expect(result.nextHero.todo!.lastRefillTick).toBe(tick)
    expect(result.event).toBeUndefined()
    expect(result.extraEvents).toHaveLength(1)
  })

  it('does not age a task through a morning the hero sleeps on a full bag', () => {
    const stuck = list([task({ refillsSeen: 1 }), task({ templateId: 'find_gear', target: 2 }), task({ templateId: 'explore_biome', biomeId: 'office_cubicles', target: 30 })])
    const { hero: h, inventory } = hero({ status: 'sleeping', todo: stuck })
    const result = run(h, inventory, tickAt(1, 7), 2)
    expect(result.nextHero.todo!.tasks).toEqual(stuck.tasks)
    expect(result.nextHero.todo!.lastRefillTick).toBe(tickAt(1, 7))
    expect(result.extraEvents ?? []).toEqual([])
  })

  it('swaps a task left unfinished for two refills, and says nothing when no slot changes', () => {
    const stuck = list([task({ refillsSeen: 1 }), task({ templateId: 'find_gear', target: 2 }), task({ templateId: 'explore_biome', biomeId: 'office_cubicles', target: 30 })])
    const { hero: h, inventory } = hero({ todo: stuck })
    const result = run(h, inventory, tickAt(1, 7), 2)
    const todo = result.nextHero.todo!
    expect(todo.tasks[0]!.addedTick).toBe(tickAt(1, 7))
    expect(todo.tasks[1]!.refillsSeen).toBe(1)
    expect(result.extraEvents).toHaveLength(1)
    const quiet = hero({ todo: localList() })
    const calm = run(quiet.hero, quiet.inventory, tickAt(1, 7), 2)
    expect(calm.nextHero.todo!.lastRefillTick).toBe(tickAt(1, 7))
    expect(calm.extraEvents ?? []).toEqual([])
  })

  it('a hero gets new tasks every morning whatever the timezone does: at most 1.25 refills a day', () => {
    const { hero: start, inventory: kit } = hero()
    let h = start
    let inventory = kit
    let refills = 0
    let next = 0
    const days = 40
    for (let tick = 1; tick <= days * 96; tick += 1) {
      // The abuser moves the clock forward four hours every morning, wrapping at +14.
      const day = Math.floor(tick / 96)
      const offset = (((day * 4) % 26) - 12) * 3600
      const result = run(h, inventory, tick, tick, offset)
      refills += result.metrics.todoRefills
      ;({ hero: h, inventory } = applyItemChanges(result.nextHero, inventory, result.itemChanges, () => `n${String(next++).padStart(5, '0')}`))
      // Sell every spare at once so the hero never sleeps on a full bag and every morning could refill.
      inventory = inventory.filter((item) => item.kind === 'potion' || item.id === h.weaponId || item.id === h.armorId)
      const { heldItemId: _held, drawer: _drawer, wakeAtTick: _wake, ...awake } = h
      h = { ...awake, status: h.status === 'sleeping' ? 'exploring' : h.status }
    }
    expect(refills / days).toBeLessThanOrEqual(1.25)
    expect(refills).toBeGreaterThanOrEqual(days - 2)
  })
})

describe('swapping a task (P31)', () => {
  it('replaces one unfinished task with another kind, once per refill period, the same on a retry', () => {
    const { hero: h } = hero({ todo: localList() })
    const first = swapTask(h, 1, v9, 99, tickAt(0, 9))
    if (!('list' in first)) throw new Error('expected a swap')
    expect(swapTask(h, 1, v9, 99, tickAt(0, 9))).toEqual(first)
    const swapped = first.list.tasks[1]!
    expect(swapped.templateId).not.toBe('find_gear')
    expect(['defeat_any', 'explore_biome']).not.toContain(swapped.templateId)
    expect(swapped.progress).toBe(0)
    expect(first.list.swapUsedTick).toBe(tickAt(0, 9))
    expect(swapUsed(first.list)).toBe(true)
    expect(swapTask({ ...h, todo: first.list }, 0, v9, 5, tickAt(0, 10))).toEqual({ refusal: 'SWAP_USED' })
    // The next refill gives a fresh swap.
    expect(swapUsed({ ...first.list, lastRefillTick: tickAt(1, 7) })).toBe(false)
  })

  it('refuses a finished task, a bad slot and a hero without a list', () => {
    const { hero: h } = hero({ todo: list([task({ target: 1, progress: 1, doneTick: 3 }), task({ templateId: 'find_gear' }), task({ templateId: 'elite', target: 1 })]) })
    expect(swapTask(h, 0, v9, 1, 50)).toEqual({ refusal: 'TASK_DONE' })
    expect(swapTask(h, 3, v9, 1, 50)).toEqual({ refusal: 'BAD_SLOT' })
    expect(swapTask(hero().hero, 0, v9, 1, 50)).toEqual({ refusal: 'NO_TODO' })
    expect(swapTask(h, 1, v8, 1, 50)).toEqual({ refusal: 'NO_TODO' })
  })

  it('swapping the away task always writes a local one', () => {
    const away = list([task({ templateId: 'explore_biome', biomeId: 'server_room', target: 20 }), task({ templateId: 'find_gear', target: 2 }), task()])
    const { hero: h } = hero({ level: 5, hp: maxHp(5), todo: away })
    for (let seed = 0; seed < 200; seed += 1) {
      const swapped = swapTask(h, 0, v9, seed, 50)
      if (!('list' in swapped)) throw new Error('expected a swap')
      expect(isLocal(swapped.list.tasks[0]!, 'office_cubicles')).toBe(true)
    }
  })
})

describe('stand-up clock (P31)', () => {
  it('turns at the refill hour in local time', () => {
    expect(standupAt(EPOCH + 7 * HOUR, 0, 7)).toBe(EPOCH + 7 * HOUR)
    expect(standupAt(EPOCH + 7 * HOUR - 1, 0, 7)).toBe(EPOCH - 17 * HOUR)
    expect(standupAt(EPOCH + 3 * HOUR, 5 * 3600 + 1800, 7)).toBe(EPOCH + 1.5 * HOUR)
    expect(standupAt(EPOCH + 20 * HOUR, -8 * 3600, 7)).toBe(EPOCH + 15 * HOUR)
  })
})
