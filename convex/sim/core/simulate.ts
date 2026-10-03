import { applyItemChanges } from './apply'
import { assertHeroInvariants, bagGearCount, SimulationInvariantError } from './invariants'
import { codePoints, composeSummary, fill, rarityLabel, variant } from './narrative'
import { createRng, pickOne, pickWeighted, type Rng } from './rng'
import { applyXp, deriveStats, maxHp, pctOf } from './stats'
import type {
  BiomeTemplate,
  CombatRound,
  ContentCatalog,
  Disposition,
  EncounterKind,
  HeroCounters,
  HeroState,
  ItemChange,
  LogDetail,
  LogKind,
  MonsterTemplate,
  NewItem,
  OutcomeDetail,
  SimulationInput,
  SimulationResult,
  TickMetrics,
} from './types'

export const SIMULATION_VERSION = 1

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type WorkingHero = Mutable<Omit<HeroState, 'counters'>> & { counters: Mutable<HeroCounters> }

const ZERO_METRICS: TickMetrics = {
  encounter: 'none',
  victories: 0,
  retreats: 0,
  deaths: 0,
  rescues: 0,
  levelUps: 0,
  potionsUsed: 0,
  heldFinds: 0,
  sleepStarts: 0,
  wakes: 0,
  elites: 0,
  jackpots: 0,
}

interface Streams {
  readonly encounter: Rng
  readonly combat: Rng
  readonly reward: Rng
  readonly narrative: Rng
}

/** Simulate one logical tick for one hero. Pure: identical complete inputs give identical results. */
export function simulateHero(input: SimulationInput): SimulationResult {
  if (input.simulationVersion !== SIMULATION_VERSION) {
    throw new SimulationInvariantError('SIM_VERSION', `unsupported simulation version ${input.simulationVersion}`)
  }
  if (!Number.isSafeInteger(input.tick) || input.tick < 0) throw new SimulationInvariantError('TICK', `invalid tick ${input.tick}`)
  assertHeroInvariants(input.hero, input.inventory, input.content)
  const result = new TickRun(input).run()
  validateOutput(input, result)
  return result
}

class TickRun {
  private readonly h: WorkingHero
  private readonly content: ContentCatalog
  private readonly rng: Streams
  private readonly changes: ItemChange[] = []
  private metrics: Mutable<TickMetrics> = { ...ZERO_METRICS }

  constructor(private readonly input: SimulationInput) {
    this.h = { ...input.hero, counters: { ...input.hero.counters } }
    this.content = input.content
    this.rng = {
      encounter: createRng(input.streams.encounter),
      combat: createRng(input.streams.combat),
      reward: createRng(input.streams.reward),
      narrative: createRng(input.streams.narrative),
    }
  }

  run(): SimulationResult {
    const { h, input } = this
    switch (h.status) {
      case 'paused':
        return this.finish('paused')
      case 'sleeping': {
        if (h.wakeAtTick === undefined || input.tick < h.wakeAtTick) return this.finish('sleeping')
        if (h.heldItemId !== undefined || bagGearCount(h, input.inventory) >= this.content.constants.bagCapacity) {
          throw new SimulationInvariantError('WAKE_PRECONDITION', 'wake is due but the held slot or bag is not clear')
        }
        delete h.wakeAtTick
        this.metrics.wakes = 1
        if (h.targetBiomeId !== undefined) return this.depart(h.targetBiomeId)
        h.status = 'exploring'
        return this.explore()
      }
      case 'dead':
        return input.tick >= (h.reviveAtTick ?? Infinity) ? this.revive() : this.finish('waiting_dead')
      case 'travelling':
        return input.tick >= (h.arriveAtTick ?? Infinity) ? this.arrive() : this.finish('waiting_travel')
      case 'resting':
        return this.restingTick()
      case 'exploring':
        return this.explore()
    }
  }

  // ------------------------------------------------------------ lifecycle

  private depart(destinationId: string): SimulationResult {
    const { h } = this
    const from = h.biomeId
    h.status = 'travelling'
    h.arriveAtTick = this.input.tick + 1
    const destination = this.biome(destinationId).name
    const text = variant(this.rng.narrative, this.content.narrative.shared.depart, { destination })
    return this.finish('departed', {
      kind: 'travel',
      summary: text,
      outcome: { variant: 'travel', phase: 'depart', fromBiomeId: from, toBiomeId: destinationId, arrivalTick: h.arriveAtTick },
    })
  }

  private arrive(): SimulationResult {
    const { h } = this
    const from = h.biomeId
    const to = h.targetBiomeId!
    const arrivalTick = h.arriveAtTick!
    h.biomeId = to
    delete h.targetBiomeId
    delete h.arriveAtTick
    h.status = 'exploring'
    const text = variant(this.rng.narrative, this.content.narrative.shared.arrive, { destination: this.biome(to).name })
    return this.finish('arrived', {
      kind: 'travel',
      summary: text,
      outcome: { variant: 'travel', phase: 'arrive', fromBiomeId: from, toBiomeId: to, arrivalTick },
    })
  }

  private revive(): SimulationResult {
    const { h, content } = this
    const previousBiomeId = h.biomeId
    const reviveAtTick = h.reviveAtTick!
    const hp = pctOf(maxHp(h.level), content.constants.reviveHpPct)
    h.status = 'exploring'
    h.biomeId = content.safeBiomeId
    h.hp = hp
    delete h.reviveAtTick
    delete h.targetBiomeId
    delete h.arriveAtTick
    const text = variant(this.rng.narrative, content.narrative.shared.revive, { heal: hp })
    return this.finish('revived', {
      kind: 'revive',
      summary: text,
      outcome: { variant: 'revival', previousBiomeId, safeBiomeId: content.safeBiomeId, hpGranted: hp, reviveAtTick },
    })
  }

  private restingTick(): SimulationResult {
    const { h, content } = this
    const max = maxHp(h.level)
    const healing = Math.min(max - h.hp, pctOf(max, content.constants.restingHealPct))
    h.hp += healing
    if (h.hp * 100 >= max * content.constants.resumeExploringAtPct) h.status = 'exploring'
    const text = variant(this.rng.narrative, content.narrative.shared.restingHeal, { heal: healing })
    return this.finish('rested', {
      kind: 'rest',
      summary: text,
      outcome: { variant: 'rest', healing, automatic: true, resultingStatus: h.status },
    })
  }

  // ------------------------------------------------------------ exploring

  private explore(): SimulationResult {
    const { h, content, input } = this
    const c = content.constants
    const max = maxHp(h.level)
    const potionRow = input.inventory.find((item) => item.kind === 'potion')
    let potionQty = potionRow?.quantity ?? 0
    let potionsUsed = 0

    if (h.hp * 100 < max * c.autoPotionBelowPct && potionRow !== undefined && potionQty > 0) {
      h.hp = Math.min(max, h.hp + pctOf(max, c.potionHealPct))
      potionQty -= 1
      potionsUsed = 1
      this.changes.push({ type: 'potion_decrement', itemId: potionRow.id, deleteRow: potionQty === 0 })
      this.metrics.potionsUsed = 1
    }
    const potionSuffix = potionsUsed > 0 ? ['Drank a potion.'] : []

    if (h.hp * 100 < max * c.restBelowPct) {
      h.status = 'resting'
      const healing = Math.min(max - h.hp, pctOf(max, c.restingHealPct))
      h.hp += healing
      const text = variant(this.rng.narrative, content.narrative.shared.restingHeal, { heal: healing })
      return this.finish(
        'rested',
        { kind: 'rest', summary: composeSummary(text, text, potionSuffix, c.summaryMaxCodePoints), outcome: { variant: 'rest', healing, automatic: true, resultingStatus: 'resting' } },
        { potionsUsed },
      )
    }

    const biome = this.biome(h.biomeId)
    const kind = pickWeighted<EncounterKind>(this.rng.encounter, [
      ['combat', biome.weights.combat],
      ['loot', biome.weights.loot],
      ['trap', biome.weights.trap],
      ['rest', biome.weights.rest],
    ])
    h.counters.ticksExplored += 1
    this.metrics.encounter = kind

    let xpGranted = 0
    let goldGranted = 0
    let goldPenalty = 0
    let gear: NewItem | undefined
    let lethal = false
    let outcome: OutcomeDetail
    let primary: string
    let compact: string
    const vars: Record<string, string | number> = {}
    const narrative = content.narrative.biomes[biome.id]!
    const shared = content.narrative.shared

    switch (kind) {
      case 'combat': {
        const monster = this.monster(pickOne(this.rng.encounter, biome.monsterIds))
        const elite = this.rng.encounter.chance(c.elite.chancePct)
        const stats = deriveStats(h, input.inventory)
        let monsterHp = elite ? Math.floor((monster.hp * c.elite.hpMultiplierPct) / 100) : monster.hp
        const monsterHpStart = monsterHp
        const rounds: CombatRound[] = []
        let result: 'victory' | 'retreat' | 'lethal' = 'retreat'
        for (let round = 0; round < c.maxCombatRounds; round += 1) {
          const heroDamage = this.damage(stats.attack, monster.defense)
          monsterHp = Math.max(0, monsterHp - heroDamage)
          if (monsterHp === 0) {
            rounds.push({ heroDamage, monsterDamage: 0 })
            result = 'victory'
            break
          }
          const monsterDamage = this.damage(monster.attack, stats.defense)
          h.hp = Math.max(0, h.hp - monsterDamage)
          rounds.push({ heroDamage, monsterDamage })
          if (h.hp === 0) {
            result = 'lethal'
            break
          }
        }
        vars.monster = monster.name
        let gearDropped = false
        if (result === 'victory') {
          xpGranted = this.rng.reward.int(monster.xp.min, monster.xp.max) * (elite ? c.elite.xpMultiplier : 1)
          goldGranted = this.rng.reward.int(monster.gold.min, monster.gold.max) * (elite ? c.elite.goldMultiplier : 1)
          gearDropped = this.rng.reward.chance(c.combatGearDropPct)
          if (gearDropped) gear = this.generateGear(biome.tier)
          h.counters.combatWins += 1
          this.metrics.victories = 1
          if (elite) this.metrics.elites = 1
          Object.assign(vars, { xp: xpGranted, gold: goldGranted })
          primary = variant(this.rng.narrative, elite ? narrative.eliteVictory : narrative.victory, vars)
          compact = fill('Beat {monster}. +{xp} XP, +{gold} gold.', vars)
        } else if (result === 'retreat') {
          goldPenalty = Math.floor((h.gold * c.retreatGoldLossPct) / 100)
          h.gold -= goldPenalty
          h.counters.retreats += 1
          this.metrics.retreats = 1
          primary = variant(this.rng.narrative, shared.retreat, vars)
          compact = fill('Retreated from {monster}.', vars)
        } else {
          lethal = true
          primary = ''
          compact = ''
        }
        outcome = {
          variant: 'combat',
          monsterId: monster.id,
          elite,
          monsterHpStart,
          monsterHpEnd: monsterHp,
          rounds,
          outcome: result === 'lethal' ? 'death' : result,
          xpGranted,
          goldGranted,
          gearDropped,
        }
        break
      }
      case 'loot': {
        const found = pickWeighted<'gear' | 'potion' | 'gold'>(this.rng.encounter, [
          ['gear', c.lootWeights.gear],
          ['potion', c.lootWeights.potion],
          ['gold', c.lootWeights.gold],
        ])
        let jackpot = false
        let potionFullFallback = false
        const rollGold = () => {
          goldGranted = this.rng.reward.int(biome.lootGold.min, biome.lootGold.max)
          jackpot = this.rng.reward.chance(c.jackpot.chancePct)
          if (jackpot) {
            goldGranted *= c.jackpot.goldMultiplier
            this.metrics.jackpots = 1
          }
          vars.gold = goldGranted
        }
        if (found === 'gear') {
          gear = this.generateGear(biome.tier)
          primary = ''
          compact = ''
        } else if (found === 'potion' && potionQty >= c.potionStackCap) {
          potionFullFallback = true
          rollGold()
          primary = variant(this.rng.narrative, jackpot ? narrative.jackpot : shared.potionFullGold, vars)
          compact = fill('+{gold} gold.', vars)
        } else if (found === 'potion') {
          this.gainPotion(potionRow?.id)
          primary = variant(this.rng.narrative, shared.lootPotion, vars)
          compact = 'Found a potion.'
        } else {
          rollGold()
          primary = variant(this.rng.narrative, jackpot ? narrative.jackpot : narrative.lootGold, vars)
          compact = fill('Found {gold} gold.', vars)
        }
        outcome = { variant: 'loot', found: potionFullFallback ? 'gold' : found, goldGranted, jackpot, potionFullFallback }
        break
      }
      case 'trap': {
        const avoided = this.rng.combat.chance(c.trapAvoidPct)
        let damage = 0
        if (avoided) {
          primary = variant(this.rng.narrative, shared.trapAvoided, vars)
          compact = 'Avoided a trap.'
        } else {
          damage = this.rng.combat.int(biome.trapDamage.min, biome.trapDamage.max)
          h.hp = Math.max(0, h.hp - damage)
          lethal = h.hp === 0
          vars.damage = damage
          primary = lethal ? '' : variant(this.rng.narrative, narrative.trapHit, vars)
          compact = fill('A trap hit for {damage} HP.', vars)
        }
        outcome = { variant: 'trap', avoided, damage, outcome: 'survived' }
        break
      }
      case 'rest': {
        const healing = Math.min(max - h.hp, pctOf(max, c.restEncounterHealPct))
        h.hp += healing
        vars.heal = healing
        primary = variant(this.rng.narrative, healing > 0 ? narrative.rest : shared.restFull, vars)
        compact = fill('Rested. +{heal} HP.', vars)
        outcome = { variant: 'rest', healing, automatic: false, resultingStatus: 'exploring' }
        break
      }
    }

    // Death and safe-biome protection come before level-up.
    let logKind: LogKind = kind
    const consequences: string[] = []
    if (lethal) {
      const ticks = c.reviveAfterTicks
      const isCombat = outcome.variant === 'combat'
      if (biome.safe) {
        h.hp = 1
        h.status = 'resting'
        h.counters.rescues += 1
        this.metrics.rescues = 1
        primary = variant(this.rng.narrative, isCombat ? shared.rescue : shared.trapRescue, vars)
        compact = 'A narrow escape; resting now.'
        outcome = { ...outcome, outcome: 'rescue' } as OutcomeDetail
      } else {
        goldPenalty = Math.floor((h.gold * c.deathGoldLossPct) / 100)
        h.gold -= goldPenalty
        h.status = 'dead'
        h.reviveAtTick = input.tick + ticks
        delete h.targetBiomeId
        delete h.arriveAtTick
        h.counters.deaths += 1
        this.metrics.deaths = 1
        logKind = 'death'
        primary = variant(this.rng.narrative, isCombat ? shared.death : shared.trapDeath, { ...vars, ticks })
        compact = fill('Knocked out. Revives in {ticks} ticks.', { ticks })
        outcome = { ...outcome, outcome: 'death' } as OutcomeDetail
        if (goldPenalty > 0) consequences.push(`Lost ${goldPenalty} gold.`)
      }
    } else if (goldPenalty > 0) {
      consequences.push(`Dropped ${goldPenalty} gold.`)
    }

    // Rewards, level-ups and lifetime counters.
    let levelsGained = 0
    if (xpGranted > 0) {
      const level = applyXp(h.level, h.xp, xpGranted)
      levelsGained = level.levelsGained
      h.level = level.level
      h.xp = level.xp
      h.lifetimeXp += xpGranted
      if (levelsGained > 0) {
        if (h.hp > 0) h.hp = Math.min(maxHp(h.level), h.hp + level.maxHpGain)
        h.lastLevelUpTick = input.tick
        this.metrics.levelUps = levelsGained
        if (logKind !== 'death') logKind = 'levelup'
        consequences.push(`Reached level ${h.level}!`)
      }
    }
    if (goldGranted > 0) {
      h.gold += goldGranted
      h.counters.goldEarned += goldGranted
    }

    let heldFind = false
    let disposition: Disposition = 'advanced'
    if (gear !== undefined) {
      h.counters.itemsFound += 1
      const item = `${rarityLabel(gear.rarity)} ${gear.name}`
      heldFind = bagGearCount(h, input.inventory) >= c.bagCapacity
      this.changes.push({ type: 'create', destination: heldFind ? 'held' : 'bag', item: gear })
      if (heldFind) {
        h.status = 'sleeping'
        this.metrics.heldFinds = 1
        this.metrics.sleepStarts = 1
        disposition = 'inventory_sleep_started'
        consequences.unshift('Bag full: find held, taking a break.')
      }
      if (outcome.variant === 'loot') {
        primary = variant(this.rng.narrative, shared.lootGear, { item })
        compact = `Found a ${item}.`
        outcome = { ...outcome, templateId: gear.templateId, rarity: gear.rarity, destination: heldFind ? 'held' : 'bag' }
      } else {
        consequences.push(`Found a ${item}.`)
      }
    }
    consequences.push(...potionSuffix)

    return this.finish(
      disposition,
      { kind: logKind, summary: composeSummary(primary, compact, consequences, c.summaryMaxCodePoints), outcome, encounterKind: kind },
      { potionsUsed, levelsGained, goldPenalty, heldFind, xpGranted },
    )
  }

  // ------------------------------------------------------------ helpers

  private damage(attack: number, defense: number): number {
    const { min, max } = this.content.constants.damageVariance
    const variance = this.rng.combat.int(min, max)
    return Math.max(1, Math.floor(((2 * attack - defense) * variance) / 200))
  }

  private gainPotion(rowId: string | undefined): void {
    const pendingDelete = this.changes.findIndex((change) => change.type === 'potion_decrement' && change.itemId === rowId)
    if (pendingDelete >= 0) {
      // Drank and found a potion in the same tick: the stack is unchanged.
      this.changes.splice(pendingDelete, 1)
      return
    }
    if (rowId !== undefined) {
      this.changes.push({ type: 'potion_increment', itemId: rowId })
      return
    }
    const { potion, contentVersion } = this.content
    this.changes.push({
      type: 'create',
      destination: 'potion_stack',
      item: { templateId: potion.templateId, contentVersion, kind: 'potion', name: potion.name, rarity: 'common', requiredLevel: 1, attack: 0, defense: 0, saleValue: 0, quantity: 1 },
    })
  }

  private generateGear(tier: number): NewItem {
    const { content } = this
    const rng = this.rng.reward
    const rarity = pickWeighted(rng, content.rarities.map((rule) => [rule, rule.weight] as const))
    const kind = rng.int(0, 1) === 0 ? 'weapon' : 'armor'
    const template = pickOne(rng, content.gearTemplates.filter((t) => t.tier === tier && t.kind === kind))
    const stats = content.gearTiers[tier]
    if (stats === undefined) throw new SimulationInvariantError('GEAR_TIER', `no gear tier ${tier}`)
    return {
      templateId: template.id,
      contentVersion: content.contentVersion,
      kind,
      name: template.name,
      rarity: rarity.rarity,
      requiredLevel: stats.requiredLevel,
      attack: kind === 'weapon' ? stats.weaponAttack + rarity.statBonus : 0,
      defense: kind === 'armor' ? stats.armorDefense + rarity.statBonus : 0,
      saleValue: stats.saleValue * rarity.saleMultiplier,
      quantity: 1,
    }
  }

  private biome(id: string): BiomeTemplate {
    const biome = this.content.biomes.find((b) => b.id === id)
    if (biome === undefined) throw new SimulationInvariantError('BIOME', `unknown biome ${id}`)
    return biome
  }

  private monster(id: string): MonsterTemplate {
    const monster = this.content.monsters.find((m) => m.id === id)
    if (monster === undefined) throw new SimulationInvariantError('MONSTER', `unknown monster ${id}`)
    return monster
  }

  private finish(
    disposition: Disposition,
    event?: { kind: LogKind; summary: string; outcome: OutcomeDetail; encounterKind?: EncounterKind },
    extra: { potionsUsed?: number; levelsGained?: number; goldPenalty?: number; heldFind?: boolean; xpGranted?: number } = {},
  ): SimulationResult {
    const { h, input } = this
    const nextHero = toHeroState(h)
    const base = { nextHero, itemChanges: this.changes, metrics: this.metrics, disposition }
    if (event === undefined) return base
    const detail: LogDetail = {
      v: 1,
      simulationVersion: input.simulationVersion,
      contentVersion: this.content.contentVersion,
      disposition,
      ...(event.encounterKind === undefined ? {} : { encounterKind: event.encounterKind }),
      potionsUsed: extra.potionsUsed ?? 0,
      levelsGained: extra.levelsGained ?? 0,
      goldPenalty: extra.goldPenalty ?? 0,
      heldFind: extra.heldFind ?? false,
      outcome: event.outcome,
    }
    return {
      ...base,
      event: {
        kind: event.kind,
        summary: event.summary,
        detail,
        deltas: { xpEarned: extra.xpGranted ?? 0, gold: nextHero.gold - input.hero.gold, hp: nextHero.hp - input.hero.hp },
      },
    }
  }
}

/** Drop undefined optional fields so the result satisfies exact optional property types. */
function toHeroState(h: WorkingHero): HeroState {
  const entries = Object.entries(h).filter(([, value]) => value !== undefined)
  return { ...(Object.fromEntries(entries) as unknown as HeroState), counters: { ...h.counters } }
}

function validateOutput(input: SimulationInput, result: SimulationResult): void {
  const fail = (code: string, message: string): never => {
    throw new SimulationInvariantError(code, message)
  }
  let next = 0
  const applied = applyItemChanges(result.nextHero, input.inventory, result.itemChanges, () => `￿-new-${next++}`)
  assertHeroInvariants(applied.hero, applied.inventory, input.content)
  const { hero } = input
  const out = result.nextHero
  if (out.id !== hero.id || out.class !== hero.class) fail('IDENTITY', 'simulator changed hero identity')
  if (out.weaponId !== hero.weaponId || out.armorId !== hero.armorId) fail('EQUIPMENT', 'simulator changed equipment')
  if (out.heldItemId !== hero.heldItemId) fail('HELD', 'simulator cannot set held IDs directly')
  if (result.itemChanges.filter((change) => change.type === 'create').length > 1) fail('CREATES', 'more than one new row')
  const xpEarned = result.event?.deltas.xpEarned ?? 0
  if (out.lifetimeXp - hero.lifetimeXp !== xpEarned) fail('XP_CONSERVATION', 'lifetime XP delta differs from granted XP')
  if (out.level < hero.level) fail('LEVEL_DOWN', 'level decreased')
  if (result.event && codePoints(result.event.summary) > input.content.constants.summaryMaxCodePoints) {
    fail('SUMMARY_LENGTH', result.event.summary)
  }
  if (result.event && result.event.summary.trim() === '') fail('SUMMARY_EMPTY', 'event without summary')
  if (out.status === 'sleeping' && hero.status !== 'sleeping' && applied.hero.heldItemId === undefined) {
    fail('SLEEP_WITHOUT_FIND', 'inventory sleep requires a held find')
  }
}

