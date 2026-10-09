import { SimulationInvariantError } from './invariants'
import { codePoints, fill, stripMarks } from './narrative'
import { createRng, pickOne, type Rng } from './rng'
import type { BiomeTemplate, ContentCatalog, HeroState, LogDetail, SimulationInput, SimulationResult, TickEvent, TodoKind, TodoList, TodoTask, TodoTemplate } from './types'

/**
 * The office to-do list (P31). Applied after the tick's own story, from the `quest` stream only, so the encounter,
 * its draws and its log line are exactly what the same catalog without to-do rules produces. Progress is read from
 * the counters the tick moved, so it needs no extra state and only moves while the hero explores.
 */

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS
/** The tick schedule's quarter-hour (D42), for inputs without a wall slot. */
const TICK_MS = 15 * 60 * 1000
export const TODO_SLOTS = 3

/** Kinds that name a biome; the rest are finishable anywhere. */
const BIOME_KINDS: ReadonlySet<TodoKind> = new Set(['defeat_monster', 'explore_biome'])
export const namesBiome = (kind: TodoKind): boolean => BIOME_KINDS.has(kind)

/** UTC milliseconds of the most recent local stand-up (the refill hour) at or before `at`. */
export function standupAt(at: number, utcOffsetSeconds: number | undefined, refillHour: number): number {
  const offset = (utcOffsetSeconds ?? 0) * 1000
  const shift = refillHour * HOUR_MS - offset
  return Math.floor((at - shift) / DAY_MS) * DAY_MS + shift
}

/** When the next refill can happen: the first stand-up at least the floor after the last one. */
export function nextStandupAfter(list: TodoList, utcOffsetSeconds: number | undefined, content: ContentCatalog): number {
  const rules = content.todo!
  const floor = list.lastStandupAt + rules.minRefillGapTicks * TICK_MS
  const atOrBefore = standupAt(floor, utcOffsetSeconds, rules.refillHour)
  return atOrBefore >= floor ? atOrBefore : atOrBefore + DAY_MS
}

/** Where the list is written for: the hero's destination while travelling or waiting to set off, else where it stands. */
export const hereBiomeId = (hero: Pick<HeroState, 'biomeId' | 'targetBiomeId'>): string => hero.targetBiomeId ?? hero.biomeId

/** A task is local when it names no biome or the hero's own. */
export const isLocal = (task: TodoTask, here: string): boolean => task.biomeId === undefined || task.biomeId === here

export const isDone = (task: TodoTask): boolean => task.doneTick !== undefined

/** The task as the player reads it, with names in bold marks: "Defeat 4 [[Paper Imps]]". */
export function taskLabel(task: TodoTask, content: ContentCatalog): string {
  const template = templateOf(content, task.templateId)
  const monster = task.monsterId === undefined ? undefined : content.monsters.find((m) => m.id === task.monsterId)
  const biome = task.biomeId === undefined ? undefined : content.biomes.find((b) => b.id === task.biomeId)
  const vars: Record<string, string | number> = { target: task.target }
  if (monster !== undefined) {
    vars.monster = monster.name
    vars.monsters = content.todo!.monsterPlurals[monster.id] ?? `${monster.name}s`
  }
  if (biome !== undefined) vars.biome = biome.name
  return fill(task.target === 1 ? template.labelOne : template.label, vars)
}

function templateOf(content: ContentCatalog, kind: TodoKind): TodoTemplate {
  const template = content.todo?.templates.find((t) => t.kind === kind)
  if (template === undefined) throw new SimulationInvariantError('TODO_TEMPLATE', `unknown task template ${kind}`)
  return template
}

function biomeOf(content: ContentCatalog, id: string): BiomeTemplate {
  const biome = content.biomes.find((b) => b.id === id)
  if (biome === undefined) throw new SimulationInvariantError('BIOME', `unknown biome ${id}`)
  return biome
}

/**
 * Write one task for a slot, given the tasks that stay on the list. Draw order (part of the content version):
 * 1 kind; for a biome kind 2 the away roll and, when it hits, 3 the away biome; for a monster kind the monster;
 * last the target. No two tasks share a kind, at most one names another unlocked biome, and `forceLocal` (a swap of
 * the away task) rules the away biome out.
 */
export function generateTask(rng: Rng, content: ContentCatalog, hero: HeroState, others: readonly TodoTask[], tick: number, exclude?: TodoKind, forceLocal = false): TodoTask {
  const rules = content.todo!
  const here = biomeOf(content, hereBiomeId(hero))
  const away = content.biomes.filter((b) => b.unlockLevel <= hero.level && b.id !== here.id)
  const awayAllowed = !forceLocal && away.length > 0 && others.every((task) => isLocal(task, here.id))
  const taken = new Set(others.map((task) => task.templateId))
  const eligible = rules.templates.filter(
    (t) => !taken.has(t.kind) && t.kind !== exclude && (t.minLevel ?? 1) <= hero.level && (namesBiome(t.kind) || t.target[here.tier] !== undefined),
  )
  if (eligible.length === 0) throw new SimulationInvariantError('TODO_GENERATE', 'no eligible task template')
  const template = pickOne(rng, eligible)
  let biome = here
  if (namesBiome(template.kind)) {
    const roll = rng.int(1, 100)
    if (awayAllowed && roll <= rules.awayPct) biome = pickOne(rng, away)
  }
  const monsterId = template.kind === 'defeat_monster' ? pickOne(rng, biome.monsterIds) : undefined
  const range = template.target[biome.tier]
  if (range === undefined) throw new SimulationInvariantError('TODO_TARGET', `no ${template.kind} target for tier ${biome.tier}`)
  const target = rng.int(range.min, range.max)
  return {
    templateId: template.kind,
    ...(namesBiome(template.kind) ? { biomeId: biome.id } : {}),
    ...(monsterId === undefined ? {} : { monsterId }),
    target,
    progress: 0,
    reward: rules.rewardByTier[biome.tier] ?? 0,
    addedTick: tick,
    refillsSeen: 0,
  }
}

/** Write tasks for the empty slots in order, each seeing the kept tasks and the ones already written. */
function fillSlots(rng: Rng, content: ContentCatalog, hero: HeroState, slots: readonly (TodoTask | undefined)[], tick: number): { tasks: TodoTask[]; added: TodoTask[] } {
  const tasks = [...slots]
  const added: TodoTask[] = []
  for (let i = 0; i < TODO_SLOTS; i += 1) {
    if (tasks[i] !== undefined) continue
    const others = tasks.filter((task): task is TodoTask => task !== undefined)
    const task = generateTask(rng, content, hero, others, tick)
    tasks[i] = task
    added.push(task)
  }
  return { tasks: tasks as TodoTask[], added }
}

/** How far this tick moved a task, read from the counters the tick moved and its own encounter. */
function progressOf(task: TodoTask, before: HeroState, after: HeroState, detail: LogDetail | undefined): number {
  const was = before.counters
  const now = after.counters
  switch (task.templateId) {
    case 'defeat_monster':
      return (now.monsterWins[task.monsterId!] ?? 0) - (was.monsterWins[task.monsterId!] ?? 0)
    case 'defeat_any':
      return now.combatWins - was.combatWins
    case 'explore_biome':
      return before.biomeId === task.biomeId ? now.ticksExplored - was.ticksExplored : 0
    case 'find_gear':
      return now.itemsFound - was.itemsFound
    case 'earn_gold': {
      // Encounter gold only: never sales, raids, choices or task rewards.
      const outcome = detail?.outcome
      return outcome?.variant === 'combat' || outcome?.variant === 'loot' ? outcome.goldGranted : 0
    }
    case 'avoid_traps':
      return now.trapsAvoided - was.trapsAvoided
    case 'elite':
      return now.eliteWins - was.eliteWins
  }
}

/** The quest stream for this tick; a catalog with to-do rules requires its seed. */
function questStream(input: SimulationInput): Rng {
  if (input.streams.quest === undefined) throw new SimulationInvariantError('QUEST_SEED', 'to-do rules need the quest stream')
  return createRng(input.streams.quest)
}

const REFILL_STATUSES: ReadonlySet<string> = new Set(['exploring', 'resting', 'sleeping'])

/**
 * Apply the to-do list to a finished tick: progress and payouts first, then the stand-up when it is due. Returns
 * the tick unchanged under a catalog without to-do rules.
 */
export function applyTodo(input: SimulationInput, result: SimulationResult): SimulationResult {
  const { content, tick } = input
  const rules = content.todo
  if (rules === undefined) return result
  const before = input.hero
  let hero = result.nextHero
  const events: TickEvent[] = []
  const metrics = { ...result.metrics }
  const at = input.tickAt ?? tick * TICK_MS
  const standup = standupAt(at, input.utcOffsetSeconds, rules.refillHour)
  let list = hero.todo
  let rng: Rng | undefined
  const stream = () => (rng ??= questStream(input))

  // 1. Progress and payouts on the list the tick started with.
  if (list !== undefined) {
    const done: TodoTask[] = []
    const tasks = list.tasks.map((task) => {
      if (isDone(task)) return task
      const moved = Math.max(0, progressOf(task, before, hero, result.event?.detail))
      if (moved === 0) return task
      const progress = Math.min(task.target, task.progress + moved)
      const next: TodoTask = progress >= task.target ? { ...task, progress, doneTick: tick } : { ...task, progress }
      if (isDone(next)) done.push(next)
      return next
    })
    list = { ...list, tasks }
    if (done.length > 0) {
      const gold = done.reduce((sum, task) => sum + task.reward, 0)
      hero = { ...hero, gold: hero.gold + gold, counters: { ...hero.counters, goldEarned: hero.counters.goldEarned + gold, tasksCompleted: hero.counters.tasksCompleted + done.length } }
      metrics.tasksCompleted = done.length
      events.push(todoEvent(input, result, 'done', done, gold))
    }
  }

  // 2. The stand-up: the first fill, or a refill of finished and stale slots once a new morning is due.
  if (REFILL_STATUSES.has(before.status)) {
    if (list === undefined) {
      const filled = fillSlots(stream(), content, hero, [undefined, undefined, undefined], tick)
      list = { tasks: filled.tasks, lastRefillTick: tick, lastStandupAt: standup }
      metrics.todoRefills = 1
      events.push(todoEvent(input, result, 'standup', filled.added, 0))
    } else if (standup >= nextStandupAfter(list, input.utcOffsetSeconds, content)) {
      // A morning slept through on a full bag is no chance to progress, so it does not age a task toward its swap.
      const aging = before.status === 'sleeping' ? 0 : 1
      const kept = list.tasks.map((task) => {
        if (isDone(task)) return undefined
        const seen = task.refillsSeen + aging
        return seen >= rules.staleAfterRefills ? undefined : { ...task, refillsSeen: seen }
      })
      const filled = fillSlots(stream(), content, hero, kept, tick)
      list = { tasks: filled.tasks, lastRefillTick: tick, lastStandupAt: standup }
      metrics.todoRefills = 1
      if (filled.added.length > 0) events.push(todoEvent(input, result, 'standup', filled.added, 0))
    }
  }

  if (list === undefined) return result
  hero = { ...hero, todo: list }
  return { ...result, nextHero: hero, metrics, ...(events.length === 0 ? {} : { extraEvents: events }) }
}

/** One to-do log line: the full list when it fits the summary budget, else a count (the device's compact form). */
function todoEvent(input: SimulationInput, result: SimulationResult, phase: 'done' | 'standup', tasks: readonly TodoTask[], gold: number): TickEvent {
  const { content } = input
  const labels = tasks.map((task) => taskLabel(task, content))
  const head = phase === 'done' ? 'Ticked off' : 'Stand-up'
  const full = `${head}: ${labels.join('. ')}.`
  const count = tasks.length === 1 ? 'a task' : `${tasks.length} tasks`
  const compact = phase === 'done' ? `Ticked off ${count}.` : `Stand-up: ${tasks.length === 1 ? 'a new task' : `${tasks.length} new tasks`}.`
  const summary = codePoints(full) <= content.constants.summaryMaxCodePoints ? full : compact
  const detail: LogDetail = {
    v: 1,
    simulationVersion: input.simulationVersion,
    contentVersion: content.contentVersion,
    disposition: result.disposition,
    potionsUsed: 0,
    levelsGained: 0,
    goldPenalty: 0,
    heldFind: false,
    outcome: { variant: 'todo', phase, tasks: tasks.map((task, i) => ({ templateId: task.templateId, label: labels[i]!, reward: task.reward })) },
  }
  return { kind: 'todo', summary, detail, deltas: { xpEarned: 0, gold, hp: 0 } }
}

export type SwapRefusal = 'NO_TODO' | 'BAD_SLOT' | 'TASK_DONE' | 'SWAP_USED'

/** Whether the swap for the current refill period is spent. */
export const swapUsed = (list: TodoList): boolean => list.swapUsedTick !== undefined && list.swapUsedTick >= list.lastRefillTick

/**
 * The swap intent (P31): replace one unfinished task with a new one of another kind, dropping its progress. Draws
 * from the hero's `quest` stream for the intent's tick, so a retry writes the same task; one swap per refill period.
 */
export function swapTask(hero: HeroState, slot: number, content: ContentCatalog, questSeed: number, tick: number): { list: TodoList } | { refusal: SwapRefusal } {
  const list = hero.todo
  if (content.todo === undefined || list === undefined) return { refusal: 'NO_TODO' }
  if (!Number.isSafeInteger(slot) || slot < 0 || slot >= list.tasks.length) return { refusal: 'BAD_SLOT' }
  const old = list.tasks[slot]!
  if (isDone(old)) return { refusal: 'TASK_DONE' }
  if (swapUsed(list)) return { refusal: 'SWAP_USED' }
  const others = list.tasks.filter((_, i) => i !== slot)
  const task = generateTask(createRng(questSeed), content, hero, others, tick, old.templateId, !isLocal(old, hereBiomeId(hero)))
  return { list: { ...list, tasks: list.tasks.map((t, i) => (i === slot ? task : t)), swapUsedTick: tick } }
}

/** Plain label for places that cannot render the bold marks. */
export const plainTaskLabel = (task: TodoTask, content: ContentCatalog): string => stripMarks(taskLabel(task, content))

/** Cross-field checks on a stored list under a catalog with to-do rules. */
export function todoProblems(list: TodoList, content: ContentCatalog): string | undefined {
  if (list.tasks.length !== TODO_SLOTS) return `${list.tasks.length} tasks`
  if (!Number.isSafeInteger(list.lastRefillTick) || !Number.isSafeInteger(list.lastStandupAt)) return 'invalid refill marks'
  const kinds = new Set<string>()
  for (const task of list.tasks) {
    if (content.todo!.templates.every((t) => t.kind !== task.templateId)) return `unknown template ${task.templateId}`
    if (kinds.has(task.templateId)) return `two ${task.templateId} tasks`
    kinds.add(task.templateId)
    if (!Number.isSafeInteger(task.target) || task.target < 1) return `invalid target ${task.target}`
    if (!Number.isSafeInteger(task.progress) || task.progress < 0 || task.progress > task.target) return `progress ${task.progress} outside 0..${task.target}`
    if ((task.doneTick !== undefined) !== (task.progress === task.target)) return 'a task is done exactly when its progress reaches its target'
    if (!Number.isSafeInteger(task.reward) || task.reward < 0 || !Number.isSafeInteger(task.refillsSeen) || task.refillsSeen < 0) return 'invalid reward or refill count'
    if (namesBiome(task.templateId) !== (task.biomeId !== undefined)) return `${task.templateId} biome mismatch`
    if (task.biomeId !== undefined && content.biomes.every((b) => b.id !== task.biomeId)) return `unknown biome ${task.biomeId}`
    if ((task.templateId === 'defeat_monster') !== (task.monsterId !== undefined)) return `${task.templateId} monster mismatch`
    if (task.monsterId !== undefined && !content.biomes.find((b) => b.id === task.biomeId)?.monsterIds.includes(task.monsterId)) return `monster ${task.monsterId} is not in ${task.biomeId}`
  }
  return undefined
}
