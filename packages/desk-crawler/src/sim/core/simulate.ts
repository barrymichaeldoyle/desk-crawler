import { applyItemChanges } from './apply'
import { isBagFull, milestoneUpgrade, nextEarlyTier } from './bag'
import { eventById, optionOf, resolveEffect } from './choice'
import { affixById, effectById, effectiveStats, liveEffects, scaled, withEffect } from './modifiers'
import { nextEarlyPouchTier, potionCap, pouchMilestoneUpgrade } from './pouch'
import { assertHeroInvariants, SimulationInvariantError } from './invariants'
import { codePoints, composeSummary, fill, rarityLabel, variant, withArticle, type NarrativeVars } from './narrative'
import { drawRaidPlan, raidGoldLoss, raidHpLoss, raidStream, raidWinChance } from './raid'
import { createRng, pickOne, pickWeighted, type Rng } from './rng'
import { applyXp, deriveStats, maxHp, pctOf } from './stats'
import type {
  BagTier,
  BagUpgrade,
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
  EffectRule,
  MerchantOffer,
  MerchantVisit,
  PendingChoice,
  PouchTier,
  RaidLaunch,
} from './types'

export const SIMULATION_VERSION = 1

type Mutable<T> = { -readonly [K in keyof T]: T[K] }
type WorkingHero = Mutable<Omit<HeroState, 'counters'>> & { counters: Mutable<Omit<HeroCounters, 'monsterWins'>> & { monsterWins: Record<string, number> } }

const ZERO_METRICS: TickMetrics = {
  encounter: 'none',
  victories: 0,
  retreats: 0,
  deaths: 0,
  rescues: 0,
  levelUps: 0,
  potionsUsed: 0,
  heldFinds: 0,
  bagUpgrades: 0,
  sleepStarts: 0,
  wakes: 0,
  elites: 0,
  jackpots: 0,
  merchantVisits: 0,
  pouchUpgrades: 0,
  choicesOffered: 0,
  choicesDefaulted: 0,
  effectsGained: 0,
  raidsLaunched: 0,
  raidsApplied: 0,
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
  private raidLaunch: RaidLaunch | undefined
  private raidApplied = false

  constructor(private readonly input: SimulationInput) {
    this.h = { ...input.hero, counters: { ...input.hero.counters, monsterWins: { ...input.hero.counters.monsterWins } } }
    this.content = input.content
    this.rng = {
      encounter: createRng(input.streams.encounter),
      combat: createRng(input.streams.combat),
      reward: createRng(input.streams.reward),
      narrative: createRng(input.streams.narrative),
    }
  }

  /**
   * The sustain thresholds this hero plays by (D76): its stance's, when the pinned catalog knows stances, else the
   * catalog constants. A hero without a stance, or any hero under a pre-v3 catalog, plays exactly as before.
   */
  private sustain(): { autoPotionBelowPct: number; restBelowPct: number; resumeExploringAtPct: number; victoryXpPct: number } {
    const rule = this.content.stances?.[this.h.stance ?? 'balanced']
    return rule ?? { ...this.content.constants, victoryXpPct: 100 }
  }

  private narrate(templates: readonly string[], vars: NarrativeVars, callbacks?: Readonly<Record<string, string>>): string {
    return variant(this.rng.narrative, templates, vars, this.input.recentSummaries, callbacks)
  }

  run(): SimulationResult {
    const { h, input } = this
    // D78: an expired merchant leaves quietly, whatever the hero is doing; no event, no draw.
    if (h.merchant !== undefined && input.tick >= h.merchant.expiresAtTick) delete h.merchant
    // D80: expired effects drop the same way.
    if (h.effects !== undefined) {
      const live = liveEffects(h.effects, input.tick)
      if (live.length === 0) delete h.effects
      else if (live.length !== h.effects.length) h.effects = live
    }
    switch (h.status) {
      case 'paused':
        return this.finish('paused')
      case 'sleeping': {
        if (h.wakeAtTick === undefined || input.tick < h.wakeAtTick) return this.finish('sleeping')
        if (h.heldItemId !== undefined || isBagFull(h, input.inventory)) {
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
    const text = this.narrate(this.content.narrative.shared.depart, { destination })
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
    h.counters.trips += 1
    const arrivals = [...this.content.narrative.shared.arrive, ...this.content.narrative.biomes[to]!.arrive]
    const text = this.narrate(arrivals, { destination: this.biome(to).name })
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
    const text = this.narrate(content.narrative.shared.revive, { heal: hp, destination: this.biome(content.safeBiomeId).name })
    return this.finish('revived', {
      kind: 'revive',
      summary: text,
      outcome: { variant: 'revival', previousBiomeId, safeBiomeId: content.safeBiomeId, hpGranted: hp, reviveAtTick },
    })
  }

  /** D80: grants an effect (refreshing a running one); returns its rule for the story, or undefined when the catalog lacks it. */
  private grantEffect(id: string | undefined): EffectRule | undefined {
    const rule = id === undefined ? undefined : effectById(this.content, id)
    if (rule === undefined) return undefined
    this.h.effects = withEffect(this.h.effects, rule, this.input.tick)
    this.metrics.effectsGained = 1
    return rule
  }

  /** D80 rest cleansing: a rest, automatic or not, shakes off every bane. */
  private cleanseBanes(): void {
    const { h, content } = this
    if (h.effects === undefined) return
    const kept = h.effects.filter((active) => effectById(content, active.id)?.kind !== 'bane')
    if (kept.length === 0) delete h.effects
    else if (kept.length !== h.effects.length) h.effects = kept
  }

  /**
   * D79: a choice the player let expire resolves by its default option, as this tick's whole event, so the player
   * reads what happened and the encounter rhythm resumes next tick. Only an exploring or resting hero resolves it;
   * dead, travelling, paused and sleeping heroes keep it pending until they are back.
   */
  private resolveExpiredChoice(): SimulationResult | undefined {
    const { h, content, input } = this
    const pending = h.choice
    if (pending === undefined || input.tick < pending.expiresAtTick) return undefined
    const event = eventById(content, pending.eventId)
    const option = event === undefined ? undefined : optionOf(event, event.defaultOptionId)
    delete h.choice
    if (event === undefined || option === undefined) return undefined
    const potionRow = input.inventory.find((item) => item.kind === 'potion')
    const change = resolveEffect(content, h, potionRow?.quantity ?? 0, option.effect, pending.biomeTier)
    h.gold += change.gold
    if (change.gold > 0) h.counters.goldEarned += change.gold
    h.hp += change.hp
    for (let i = 0; i < change.potions; i += 1) this.gainPotion(potionRow?.id)
    const granted = this.grantEffect(option.effect.effectId)
    h.counters.choicesDefaulted += 1
    this.metrics.choicesDefaulted = 1
    const summary = composeSummary(option.story, option.story, ['Decided by itself.', ...(granted ? [`${granted.name} for ${granted.durationTicks} adventures.`] : [])], content.constants.summaryMaxCodePoints)
    return this.finish('advanced', { kind: 'choice', summary, outcome: { variant: 'choice', phase: 'defaulted', eventId: event.id, optionId: option.id, expiresAtTick: pending.expiresAtTick } }, granted ? { effectGained: granted.id } : {})
  }

  private restingTick(): SimulationResult {
    const { h, content } = this
    const expired = this.resolveExpiredChoice() ?? this.applyIncomingRaid()
    if (expired !== undefined) return expired
    const max = maxHp(h.level)
    const healing = Math.min(max - h.hp, pctOf(max, content.constants.restingHealPct))
    h.hp += healing
    h.counters.restTicks += 1
    this.cleanseBanes()
    if (h.hp * 100 >= max * this.sustain().resumeExploringAtPct) h.status = 'exploring'
    const text = this.narrate(content.narrative.shared.restingHeal, { heal: healing })
    return this.finish('rested', {
      kind: 'rest',
      summary: text,
      outcome: { variant: 'rest', healing, automatic: true, resultingStatus: h.status },
    })
  }

  // ------------------------------------------------------------ exploring

  private explore(): SimulationResult {
    const { h, content, input } = this
    const expired = this.resolveExpiredChoice() ?? this.applyIncomingRaid()
    if (expired !== undefined) return expired
    const c = content.constants
    const sustain = this.sustain()
    const max = maxHp(h.level)
    const potionRow = input.inventory.find((item) => item.kind === 'potion')
    let potionQty = potionRow?.quantity ?? 0
    let potionsUsed = 0
    let potionHealing = 0

    if (h.hp * 100 < max * sustain.autoPotionBelowPct && potionRow !== undefined && potionQty > 0) {
      potionHealing = Math.min(max - h.hp, pctOf(max, c.potionHealPct))
      h.hp += potionHealing
      potionQty -= 1
      potionsUsed = 1
      this.changes.push({ type: 'potion_decrement', itemId: potionRow.id, deleteRow: potionQty === 0 })
      this.metrics.potionsUsed = 1
      h.counters.potionsUsed += 1
    }
    const potionSuffix = potionsUsed > 0 ? ['Drank a potion.'] : []

    if (h.hp * 100 < max * sustain.restBelowPct) {
      h.status = 'resting'
      const healing = Math.min(max - h.hp, pctOf(max, c.restingHealPct))
      h.hp += healing
      h.counters.restTicks += 1
      this.cleanseBanes()
      const text = this.narrate(content.narrative.shared.restingHeal, { heal: healing })
      return this.finish(
        'rested',
        { kind: 'rest', summary: composeSummary(text, text, potionSuffix, c.summaryMaxCodePoints), outcome: { variant: 'rest', healing, automatic: true, resultingStatus: 'resting' } },
        { potionsUsed, potionHealing },
      )
    }

    // D110: after sustain and before the encounter roll, a raid can be the tick's whole event.
    const raid = this.launchRaid()
    if (raid !== undefined) return raid

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
    let upgrade: BagUpgrade | undefined
    let pouchUpgrade: BagUpgrade | undefined
    let effectGained: EffectRule | undefined
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
        const stats = effectiveStats(content, h, input.inventory, input.tick)
        const mods = stats.modifiers
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
          // Rolled exactly as before; the stance and the modifiers scale the roll afterwards, so the reward stream is unchanged (D76, D80).
          xpGranted = scaled(Math.max(1, Math.floor((this.rng.reward.int(monster.xp.min, monster.xp.max) * (elite ? c.elite.xpMultiplier : 1) * this.sustain().victoryXpPct) / 100)), mods.xpPct)
          goldGranted = scaled(this.rng.reward.int(monster.gold.min, monster.gold.max) * (elite ? c.elite.goldMultiplier : 1), mods.goldPct)
          gearDropped = this.rng.reward.chance(c.combatGearDropPct)
          if (gearDropped) gear = this.generateGear(biome.tier)
          h.counters.combatWins += 1
          h.counters.monsterWins[monster.id] = (h.counters.monsterWins[monster.id] ?? 0) + 1
          if (elite) h.counters.eliteWins += 1
          this.metrics.victories = 1
          if (elite) this.metrics.elites = 1
          // D81 vampiric: a little health after every win; D80: an elite win fires the hero up.
          if (mods.healOnVictoryPct > 0 && h.hp > 0) h.hp = Math.min(maxHp(h.level), h.hp + pctOf(maxHp(h.level), mods.healOnVictoryPct))
          if (elite) effectGained = this.grantEffect(content.effectSources?.eliteVictory)
          Object.assign(vars, { xp: xpGranted, gold: goldGranted })
          const victories = [...narrative.victory, ...(content.narrative.monsters[monster.id]?.victory ?? [])]
          primary = this.narrate(elite ? narrative.eliteVictory : victories, vars)
          compact = fill('Beat {monster}. +{xp} XP, +{gold} gold.', vars)
        } else if (result === 'retreat') {
          goldPenalty = Math.floor((h.gold * Math.max(0, c.retreatGoldLossPct - mods.goldLossPct)) / 100)
          h.gold -= goldPenalty
          h.counters.retreats += 1
          this.metrics.retreats = 1
          primary = this.narrate(shared.retreat, vars)
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
        // One reward draw per loot encounter, used or not, so eligibility never shifts later draws.
        const bagRoll = this.rng.reward.int(1, 1000)
        const bag = bagRoll <= content.bagLadder.findPermille ? nextEarlyTier(content, h) : undefined
        if (bag !== undefined) {
          const from = h.bagCapacity
          h.bagCapacity = bag.capacity
          upgrade = { from, to: bag.capacity, tierId: bag.id, source: 'find' }
          vars.item = bag.name
          vars.capacity = bag.capacity
          primary = this.narrate(shared.bagFind, vars)
          compact = fill('Found a {item}. Bag holds {capacity}.', vars)
          outcome = { variant: 'loot', found: 'bag', goldGranted: 0, jackpot: false, potionFullFallback: false }
          break
        }
        // D77: one pouch draw per loot encounter under a catalog with a ladder, at a fixed position after the bag draw.
        if (content.potionPouch !== undefined) {
          const pouchRoll = this.rng.reward.int(1, 1000)
          const pouch = pouchRoll <= content.potionPouch.findPermille ? nextEarlyPouchTier(content, h) : undefined
          if (pouch !== undefined) {
            pouchUpgrade = { from: potionCap(content, h), to: pouch.cap, tierId: pouch.id, source: 'find' }
            h.potionCap = pouch.cap
            vars.item = pouch.name
            vars.capacity = pouch.cap
            primary = this.narrate(shared.pouchFind, vars)
            compact = fill('Found a {item}. Holds {capacity} potions.', vars)
            outcome = { variant: 'loot', found: 'pouch', goldGranted: 0, jackpot: false, potionFullFallback: false }
            break
          }
        }
        let found = pickWeighted<'gear' | 'potion' | 'gold' | 'merchant' | 'event'>(this.rng.encounter, [
          ['gear', c.lootWeights.gear],
          ['potion', c.lootWeights.potion],
          ['gold', c.lootWeights.gold],
          ...(c.lootWeights.merchant === undefined ? [] : [['merchant', c.lootWeights.merchant] as const]),
          ...(c.lootWeights.event === undefined ? [] : [['event', c.lootWeights.event] as const]),
        ])
        // D79: one pending choice at a time; a second draw while one is open falls through to gold.
        if (found === 'event' && (h.choice !== undefined || content.choices === undefined)) found = 'gold'
        if (found === 'event') {
          const event = pickOne(this.rng.reward, content.choices!.events)
          const choice: PendingChoice = { eventId: event.id, offeredAtTick: input.tick, expiresAtTick: input.tick + content.choices!.expiresAfterTicks, biomeTier: biome.tier }
          h.choice = choice
          this.metrics.choicesOffered = 1
          primary = event.prompt
          compact = `${event.title}. Decide in the companion.`
          outcome = { variant: 'choice', phase: 'offered', eventId: event.id, expiresAtTick: choice.expiresAtTick }
          break
        }
        if (found === 'merchant') {
          const visit = this.merchantVisit(biome.tier)
          h.merchant = visit
          h.counters.merchantVisits += 1
          this.metrics.merchantVisits = 1
          vars.ticks = content.merchant!.staysForTicks
          primary = this.narrate(shared.merchant, vars)
          compact = fill('A merchant is passing through. {ticks} adventures to shop.', vars)
          outcome = { variant: 'merchant', offers: visit.offers, expiresAtTick: visit.expiresAtTick }
          break
        }
        let jackpot = false
        let potionFullFallback = false
        const rollGold = () => {
          goldGranted = this.rng.reward.int(biome.lootGold.min, biome.lootGold.max)
          jackpot = this.rng.reward.chance(c.jackpot.chancePct)
          if (jackpot) {
            goldGranted *= c.jackpot.goldMultiplier
            this.metrics.jackpots = 1
            h.counters.jackpots += 1
          }
          goldGranted = scaled(goldGranted, effectiveStats(content, h, input.inventory, input.tick).modifiers.goldPct)
          vars.gold = goldGranted
        }
        if (found === 'gear') {
          gear = this.generateGear(biome.tier)
          primary = ''
          compact = ''
        } else if (found === 'potion' && potionQty >= potionCap(content, h)) {
          potionFullFallback = true
          rollGold()
          primary = this.narrate(jackpot ? narrative.jackpot : shared.potionFullGold, vars)
          compact = fill('+{gold} gold.', vars)
        } else if (found === 'potion') {
          this.gainPotion(potionRow?.id)
          primary = this.narrate(shared.lootPotion, vars)
          compact = 'Found a potion.'
        } else {
          rollGold()
          primary = this.narrate(jackpot ? narrative.jackpot : narrative.lootGold, vars)
          compact = fill('Found {gold} gold.', vars)
        }
        outcome = { variant: 'loot', found: potionFullFallback ? 'gold' : found, goldGranted, jackpot, potionFullFallback }
        break
      }
      case 'trap': {
        const avoided = this.rng.combat.chance(c.trapAvoidPct)
        let damage = 0
        if (avoided) {
          h.counters.trapsAvoided += 1
          primary = this.narrate(shared.trapAvoided, vars)
          compact = 'Avoided a trap.'
        } else {
          damage = this.rng.combat.int(biome.trapDamage.min, biome.trapDamage.max)
          const trapMods = effectiveStats(content, h, input.inventory, input.tick).modifiers
          if (trapMods.trapDamagePct > 0) damage = Math.max(1, Math.floor((damage * (100 - trapMods.trapDamagePct)) / 100))
          h.hp = Math.max(0, h.hp - damage)
          lethal = h.hp === 0
          if (!lethal) effectGained = this.grantEffect(content.effectSources?.trapHit)
          vars.damage = damage
          primary = lethal ? '' : this.narrate(narrative.trapHit, vars, narrative.trapHitCallbacks)
          compact = fill('A trap hit for {damage} HP.', vars)
        }
        outcome = { variant: 'trap', avoided, damage, outcome: 'survived' }
        break
      }
      case 'rest': {
        const healing = Math.min(max - h.hp, pctOf(max, c.restEncounterHealPct))
        h.hp += healing
        h.counters.restTicks += 1
        this.cleanseBanes()
        vars.heal = healing
        primary = this.narrate(healing > 0 ? narrative.rest : shared.restFull, vars)
        compact = fill('Rested. +{heal} HP.', vars)
        outcome = { variant: 'rest', healing, automatic: false, resultingStatus: 'exploring' }
        break
      }
    }

    // Death and safe-biome protection come before level-up.
    let logKind: LogKind = outcome.variant === 'merchant' ? 'merchant' : outcome.variant === 'choice' ? 'choice' : kind
    const consequences: string[] = []
    if (lethal) {
      const ticks = c.reviveAfterTicks
      const isCombat = outcome.variant === 'combat'
      if (biome.safe) {
        h.hp = 1
        h.status = 'resting'
        h.counters.rescues += 1
        this.metrics.rescues = 1
        primary = this.narrate(isCombat ? shared.rescue : shared.trapRescue, vars)
        compact = 'A narrow escape; resting now.'
        outcome = { ...outcome, outcome: 'rescue' } as OutcomeDetail
      } else {
        goldPenalty = this.knockOut()
        logKind = 'death'
        primary = this.narrate(isCombat ? shared.death : shared.trapDeath, { ...vars, ticks })
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
        // A level that opens a new area says so.
        const opened = content.biomes.find((b) => !b.safe && b.unlockLevel > h.level - levelsGained && b.unlockLevel <= h.level)
        if (opened) consequences.push(this.narrate(shared.unlock, { destination: opened.name }))
      }
    }
    if (goldGranted > 0) {
      h.gold += goldGranted
      h.counters.goldEarned += goldGranted
    }

    // Guaranteed bag milestones land before any gear is placed, so the new space is usable at once.
    const milestone: BagTier | undefined = milestoneUpgrade(content, h)
    if (milestone !== undefined) {
      upgrade = { from: upgrade?.from ?? h.bagCapacity, to: milestone.capacity, tierId: milestone.id, source: 'milestone' }
      h.bagCapacity = milestone.capacity
      consequences.push(`Found ${withArticle(milestone.name)}! Bag holds ${milestone.capacity}.`)
    }
    if (upgrade !== undefined) this.metrics.bagUpgrades = 1
    // D77: pouch milestones land the same way, so the new cap is usable at once.
    const pouchMilestone: PouchTier | undefined = pouchMilestoneUpgrade(content, h)
    if (pouchMilestone !== undefined) {
      pouchUpgrade = { from: pouchUpgrade?.from ?? potionCap(content, h), to: pouchMilestone.cap, tierId: pouchMilestone.id, source: 'milestone' }
      h.potionCap = pouchMilestone.cap
      consequences.push(`Found ${withArticle(pouchMilestone.name)}! Holds ${pouchMilestone.cap} potions.`)
    }
    if (pouchUpgrade !== undefined) this.metrics.pouchUpgrades = 1

    let heldFind = false
    let disposition: Disposition = 'advanced'
    if (gear !== undefined) {
      h.counters.itemsFound += 1
      if (gear.rarity === 'rare' || gear.rarity === 'epic') h.counters.rareFinds += 1
      if (gear.rarity === 'epic') h.counters.epicFinds += 1
      const affix = affixById(content, gear.affixId)
      const item = `${affix ? `${affix.name} ` : ''}${rarityLabel(gear.rarity)} ${gear.name}`
      heldFind = isBagFull(h, input.inventory)
      this.changes.push({ type: 'create', destination: heldFind ? 'held' : 'bag', item: gear })
      if (heldFind) {
        h.status = 'sleeping'
        this.metrics.heldFinds = 1
        this.metrics.sleepStarts = 1
        disposition = 'inventory_sleep_started'
        consequences.unshift('Bag full. Holding it until you make room.')
      }
      if (outcome.variant === 'loot') {
        primary = this.narrate([...shared.lootGear, ...narrative.lootGear], { item })
        compact = `Found ${withArticle(item)}.`
        outcome = { ...outcome, templateId: gear.templateId, rarity: gear.rarity, destination: heldFind ? 'held' : 'bag' }
      } else {
        consequences.push(`Found ${withArticle(item)}.`)
      }
    }
    consequences.push(...potionSuffix)
    if (effectGained !== undefined) consequences.push(`${effectGained.name} for ${effectGained.durationTicks} adventures.`)

    return this.finish(
      disposition,
      { kind: logKind, summary: composeSummary(primary, compact, consequences, c.summaryMaxCodePoints), outcome, encounterKind: kind },
      { potionsUsed, potionHealing, levelsGained, goldPenalty, heldFind, xpGranted, ...(upgrade === undefined ? {} : { bagUpgrade: upgrade }), ...(pouchUpgrade === undefined ? {} : { pouchUpgrade }), ...(effectGained === undefined ? {} : { effectGained: effectGained.id }) },
    )
  }

  /** A knockout outside Office Cubicles: the death gold loss (less thrifty), every effect cleared, revival scheduled. */
  private knockOut(): number {
    const { h, content, input } = this
    const c = content.constants
    const goldPenalty = Math.floor((h.gold * Math.max(0, c.deathGoldLossPct - effectiveStats(content, h, input.inventory, input.tick).modifiers.goldLossPct)) / 100)
    h.gold -= goldPenalty
    h.status = 'dead'
    // D80 death ordering: a knockout clears every effect, boon or bane; revival starts clean.
    delete h.effects
    h.reviveAtTick = input.tick + c.reviveAfterTicks
    delete h.targetBiomeId
    delete h.arriveAtTick
    h.counters.deaths += 1
    this.metrics.deaths = 1
    return goldPenalty
  }

  /**
   * D110 raider side: the launch draw, then the contest, as this tick's whole event. Without raid rules, a raid
   * seed or a raidable target the tick goes on to its ordinary encounter (the draw is spent, nothing is logged).
   */
  private launchRaid(): SimulationResult | undefined {
    const { h, content, input } = this
    const rng = raidStream(input.streams, content)
    if (rng === undefined) return undefined
    if (drawRaidPlan(rng, h.stance, content) === undefined) return undefined
    const target = input.raidTarget
    if (target === undefined || target.heroId === h.id) return undefined
    const rules = content.raids!
    const raiderWon = rng.chance(raidWinChance(content, h.stance, target.stance))
    const thrifty = effectiveStats(content, h, input.inventory, input.tick).modifiers.goldLossPct
    const gold = raiderWon ? raidGoldLoss(target.gold, rules.goldLossPct, target.goldLossPct ?? 0) : raidGoldLoss(h.gold, rules.goldLossPct, thrifty)
    if (raiderWon) {
      h.gold += gold
      h.counters.goldEarned += gold
      h.counters.raidsWon += 1
    } else {
      h.gold -= gold
    }
    h.counters.ticksExplored += 1
    h.counters.raidsLaunched += 1
    this.metrics.raidsLaunched = 1
    const hpLost = Math.min(h.hp, raidHpLoss(maxHp(h.level), raiderWon ? rules.winnerHpPct : rules.loserHpPct))
    h.hp -= hpLost
    this.raidLaunch = { targetHeroId: target.heroId, tick: input.tick, raiderWon, gold, targetHpPct: raiderWon ? rules.loserHpPct : rules.winnerHpPct }
    return this.finishRaid('raider', target.heroId, target.name, raiderWon, gold, hpLost, input.tick)
  }

  /**
   * D110 target side: a ledger raid lands as this tick's whole event, the way a defaulted choice does. Gold moves by
   * the ledger amount, a loss clamped to what the hero holds now; HP by the share of maximum HP. Under a catalog
   * without raid rules the raid stays pending.
   */
  private applyIncomingRaid(): SimulationResult | undefined {
    const { h, content, input } = this
    const raid = input.incomingRaid
    if (raid === undefined || content.raids === undefined) return undefined
    const won = !raid.raiderWon
    let gold: number
    if (won) {
      gold = raid.gold
      h.gold += gold
      h.counters.goldEarned += gold
      h.counters.raidsRepelled += 1
    } else {
      gold = Math.min(raid.gold, h.gold)
      h.gold -= gold
      h.counters.raidsLost += 1
    }
    const hpLost = Math.min(h.hp, raidHpLoss(maxHp(h.level), raid.targetHpPct))
    h.hp -= hpLost
    this.raidApplied = true
    this.metrics.raidsApplied = 1
    return this.finishRaid('target', raid.raiderHeroId, raid.raiderName, won, gold, hpLost, raid.tick)
  }

  /** One raid log entry from this hero's side; lethal raid damage resolves like any lethal encounter. */
  private finishRaid(role: 'raider' | 'target', rivalHeroId: string, rivalName: string, won: boolean, gold: number, hpLost: number, raidTick: number): SimulationResult {
    const { h, content } = this
    const lines = content.raids!.narrative
    const vars = { rival: rivalName, gold }
    const pool = role === 'raider' ? (won ? lines.raidWon : lines.raidLost) : won ? lines.repelled : lines.raided
    const compactTemplate = role === 'raider' ? (won ? 'Raided {rival}.' : 'Caught raiding {rival}.') : won ? 'Caught {rival} raiding.' : 'Raided by {rival}.'
    const primary = this.narrate(pool, vars)
    const compact = fill(compactTemplate, vars)
    let kind: LogKind = 'raid'
    let outcome: 'survived' | 'death' | 'rescue' = 'survived'
    let goldPenalty = 0
    // The raid stays the story; a knockout or rescue is its most important consequence.
    const consequences: string[] = []
    if (h.hp === 0) {
      if (this.biome(h.biomeId).safe) {
        h.hp = 1
        h.status = 'resting'
        h.counters.rescues += 1
        this.metrics.rescues = 1
        outcome = 'rescue'
        consequences.push(this.narrate(lines.rescue, vars))
      } else {
        const ticks = content.constants.reviveAfterTicks
        goldPenalty = this.knockOut()
        outcome = 'death'
        kind = 'death'
        // Fixed and short, so the knockout survives the budget beside the longest name and purse.
        consequences.push(fill('Knocked out for {ticks} ticks.', { ticks }))
        if (goldPenalty > 0) consequences.push(`Lost ${goldPenalty} gold.`)
      }
    }
    return this.finish(
      'advanced',
      { kind, summary: composeSummary(primary, compact, consequences, content.constants.summaryMaxCodePoints), outcome: { variant: 'raid', role, rivalHeroId, rivalName, won, gold, hpLost, raidTick, outcome } },
      { goldPenalty },
    )
  }

  /**
   * The merchant's offers (D78), drawn from the reward stream so a visit replays exactly: a potion bundle priced by
   * the biome tier, plus the next pouch and the next bag when the hero may take them early. Bounded: at most three.
   */
  private merchantVisit(biomeTier: number): MerchantVisit {
    const { h, content } = this
    const rule = content.merchant!
    const quantity = this.rng.reward.int(1, rule.maxPotionsOffered)
    const offers: MerchantOffer[] = [{ id: 'potions', name: quantity === 1 ? 'Healing potion' : `${quantity} healing potions`, quantity, price: rule.potionPrice * biomeTier * quantity }]
    const pouch = nextEarlyPouchTier(content, h)
    if (pouch?.price !== undefined) offers.push({ id: 'pouch', name: pouch.name, quantity: 1, price: pouch.price, tierId: pouch.id })
    const bag = nextEarlyTier(content, h)
    if (bag?.price !== undefined) offers.push({ id: 'bag', name: bag.name, quantity: 1, price: bag.price, tierId: bag.id })
    return { offers, expiresAtTick: this.input.tick + rule.staysForTicks, biomeId: h.biomeId }
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
    // D81: rare and epic gear roll one affix, a draw that exists only under a catalog with affixes.
    const affix = content.affixes !== undefined && content.affixRarities?.includes(rarity.rarity) ? pickOne(rng, content.affixes) : undefined
    return {
      ...(affix === undefined ? {} : { affixId: affix.id }),
      templateId: template.id,
      contentVersion: content.contentVersion,
      kind,
      name: template.name,
      rarity: rarity.rarity,
      requiredLevel: stats.requiredLevel,
      attack: kind === 'weapon' ? stats.weaponAttack + (template.statOffset ?? 0) + rarity.statBonus : 0,
      defense: kind === 'armor' ? stats.armorDefense + (template.statOffset ?? 0) + rarity.statBonus : 0,
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
    extra: { potionsUsed?: number; potionHealing?: number; levelsGained?: number; goldPenalty?: number; heldFind?: boolean; xpGranted?: number; bagUpgrade?: BagUpgrade; pouchUpgrade?: BagUpgrade; effectGained?: string } = {},
  ): SimulationResult {
    const { h, input } = this
    const nextHero = toHeroState(h)
    const base = { nextHero, itemChanges: this.changes, metrics: this.metrics, disposition, ...(this.raidLaunch === undefined ? {} : { raidLaunch: this.raidLaunch }), ...(this.raidApplied ? { raidApplied: true } : {}) }
    if (event === undefined) return base
    const detail: LogDetail = {
      v: 1,
      simulationVersion: input.simulationVersion,
      contentVersion: this.content.contentVersion,
      disposition,
      ...(event.encounterKind === undefined ? {} : { encounterKind: event.encounterKind }),
      potionsUsed: extra.potionsUsed ?? 0,
      ...(extra.potionHealing ? { potionHealing: extra.potionHealing } : {}),
      levelsGained: extra.levelsGained ?? 0,
      goldPenalty: extra.goldPenalty ?? 0,
      heldFind: extra.heldFind ?? false,
      ...(extra.bagUpgrade === undefined ? {} : { bagUpgrade: extra.bagUpgrade }),
      ...(extra.pouchUpgrade === undefined ? {} : { pouchUpgrade: extra.pouchUpgrade }),
      ...(extra.effectGained === undefined ? {} : { effectGained: extra.effectGained }),
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
  return { ...(Object.fromEntries(entries) as unknown as HeroState), counters: { ...h.counters, monsterWins: { ...h.counters.monsterWins } } }
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
  if (out.bagCapacity < hero.bagCapacity) fail('BAG_SHRANK', 'bag capacity decreased')
  if ((out.potionCap ?? 0) < (hero.potionCap ?? 0)) fail('POUCH_SHRANK', 'potion cap decreased')
  if (out.merchant !== undefined && (out.merchant.offers.length === 0 || out.merchant.offers.length > 3 || out.merchant.expiresAtTick <= input.tick)) fail('MERCHANT', 'merchant offers must be one to three and still open')
  if (out.choice !== undefined && hero.choice === undefined && out.choice.offeredAtTick !== input.tick) fail('CHOICE', 'a new choice must be offered this tick')
  if (out.effects !== undefined && (out.effects.length === 0 || out.effects.length > 3 || out.effects.some((effect) => effect.untilTick <= input.tick))) fail('EFFECTS', 'effects must be one to three live entries')
  if (result.event && codePoints(result.event.summary) > input.content.constants.summaryMaxCodePoints) {
    fail('SUMMARY_LENGTH', result.event.summary)
  }
  if (result.event && result.event.summary.trim() === '') fail('SUMMARY_EMPTY', 'event without summary')
  if (out.status === 'sleeping' && hero.status !== 'sleeping' && applied.hero.heldItemId === undefined) {
    fail('SLEEP_WITHOUT_FIND', 'inventory sleep requires a held find')
  }
}

