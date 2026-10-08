import type { ContentCatalog, Modifiers } from '../sim/core/types'

/** Content limits from the specs: name budgets (domain-contracts.md) and the D26 content floor. */
export const CONTENT_LIMITS = {
  monsterName: 24,
  itemName: 32,
  monstersPerBiome: 4,
  variantsPerEncounterPerBiome: 4,
} as const

/** Return every problem found; an empty list means the catalog is valid. */
export function validateCatalog(content: ContentCatalog): string[] {
  const problems: string[] = []
  const { constants: c } = content
  const percent = (name: string, value: number) => {
    if (!Number.isSafeInteger(value) || value < 0 || value > 100) problems.push(`${name} must be an integer percentage`)
  }
  const sum = (values: readonly number[]) => values.reduce((total, value) => total + value, 0)

  if (sum(Object.values(c.lootWeights)) !== 100) problems.push('loot weights must sum to 100')
  if (sum(content.rarities.map((rule) => rule.weight)) !== 100) problems.push('rarity weights must sum to 100')
  for (const [name, value] of Object.entries(c)) {
    if (name.endsWith('Pct')) percent(name, value as number)
  }
  percent('elite.chancePct', c.elite.chancePct)
  // D76: thresholds must be ordered so a hero cannot loop between resting and exploring, and each stance is complete.
  for (const stance of Object.values(content.stances ?? {})) {
    for (const [name, value] of [['autoPotionBelowPct', stance.autoPotionBelowPct], ['restBelowPct', stance.restBelowPct], ['resumeExploringAtPct', stance.resumeExploringAtPct]] as const) percent(`stance ${stance.id} ${name}`, value)
    if (!(stance.restBelowPct < stance.autoPotionBelowPct && stance.autoPotionBelowPct < stance.resumeExploringAtPct)) problems.push(`stance ${stance.id} thresholds must satisfy rest < potion < resume`)
    if (!Number.isSafeInteger(stance.victoryXpPct) || stance.victoryXpPct < 50 || stance.victoryXpPct > 150) problems.push(`stance ${stance.id} victory XP must be an integer percentage between 50 and 150`)
    if (stance.restBelowPct > c.reviveHpPct) problems.push(`stance ${stance.id} would rest a hero straight after revival`)
  }
  if (content.stances && !(['cautious', 'balanced', 'bold'] as const).every((id) => content.stances?.[id]?.id === id)) problems.push('stances must define cautious, balanced and bold under their own ids')
  // D77/D78: the pouch ladder mirrors the bag ladder's rules; the merchant's numbers are bounded.
  const pouch = content.potionPouch
  if (pouch) {
    if (pouch.tiers.length < 2) problems.push('potion pouch needs at least two tiers')
    if (pouch.tiers[0]?.milestone !== undefined || pouch.tiers[0]?.price !== undefined) problems.push('the starting pouch has no milestone or price')
    if (pouch.tiers[0]?.cap !== c.potionStackCap) problems.push('the starting pouch must match potionStackCap')
    pouch.tiers.forEach((tier, i) => {
      if (i > 0 && (tier.milestone === undefined || tier.price === undefined)) problems.push(`pouch ${tier.id} needs a milestone and a price`)
      if (i > 0 && tier.cap <= pouch.tiers[i - 1]!.cap) problems.push(`pouch ${tier.id} must be larger than the previous tier`)
      if (i > 1 && (tier.milestone?.level ?? 0) <= (pouch.tiers[i - 1]!.milestone?.level ?? 0)) problems.push(`pouch ${tier.id} milestone must come after the previous tier's`)
    })
    if (!Number.isSafeInteger(pouch.findPermille) || pouch.findPermille < 0 || pouch.findPermille > 1000) problems.push('pouch find chance must be a permille')
  }
  if (c.lootWeights.merchant !== undefined && !content.merchant) problems.push('a merchant loot weight needs merchant rules')
  // D79: every event has two or three options with distinct ids, a default among them, and bounded effects.
  if (c.lootWeights.event !== undefined && !content.choices) problems.push('an event loot weight needs choice rules')
  // D80/D81: affixes and effects are small, distinct and bounded; every source names a known effect.
  const modifierBounds = (owner: string, m: Modifiers) => {
    for (const [name, value] of Object.entries(m) as Array<[string, number | undefined]>) if (value !== undefined && (!Number.isSafeInteger(value) || value < -50 || value > 50)) problems.push(`${owner} modifier ${name} out of bounds`)
  }
  const affixIds = new Set<string>()
  for (const affix of content.affixes ?? []) {
    if (affixIds.has(affix.id)) problems.push(`duplicate affix ${affix.id}`)
    affixIds.add(affix.id)
    modifierBounds(`affix ${affix.id}`, affix.modifiers)
  }
  for (const rarity of content.affixRarities ?? []) if (!content.rarities.some((rule) => rule.rarity === rarity)) problems.push(`affix rarity ${rarity} is not in the rarity table`)
  if ((content.affixRarities?.length ?? 0) > 0 && (content.affixes?.length ?? 0) === 0) problems.push('affix rarities need affixes')
  const effectIds = new Set<string>()
  for (const effect of content.effects ?? []) {
    if (effectIds.has(effect.id)) problems.push(`duplicate effect ${effect.id}`)
    effectIds.add(effect.id)
    if (!(effect.durationTicks >= 1 && effect.durationTicks <= 96)) problems.push(`effect ${effect.id} must last 1 to 96 ticks`)
    modifierBounds(`effect ${effect.id}`, effect.modifiers)
  }
  for (const [source, id] of Object.entries(content.effectSources ?? {})) if (id !== undefined && !effectIds.has(id)) problems.push(`effect source ${source} names unknown effect ${id}`)
  for (const event of content.choices?.events ?? []) for (const option of event.options) if (option.effect.effectId !== undefined && !effectIds.has(option.effect.effectId)) problems.push(`option ${event.id}/${option.id} names unknown effect ${option.effect.effectId}`)
  if (content.choices) {
    if (!(content.choices.expiresAfterTicks >= 4 && content.choices.expiresAfterTicks <= 192)) problems.push('choices must expire between 4 and 192 ticks')
    if (content.choices.events.length === 0) problems.push('choices need at least one event')
    const eventIds = new Set<string>()
    for (const event of content.choices.events) {
      if (eventIds.has(event.id)) problems.push(`duplicate event ${event.id}`)
      eventIds.add(event.id)
      if (event.options.length < 2 || event.options.length > 3) problems.push(`event ${event.id} needs two or three options`)
      if (new Set(event.options.map((option) => option.id)).size !== event.options.length) problems.push(`event ${event.id} has duplicate option ids`)
      if (!event.options.some((option) => option.id === event.defaultOptionId)) problems.push(`event ${event.id} default is not one of its options`)
      if ([...event.prompt].length > c.summaryMaxCodePoints) problems.push(`event ${event.id} prompt too long`)
      for (const option of event.options) {
        const e = option.effect
        if ([...option.story].length > c.summaryMaxCodePoints) problems.push(`option ${event.id}/${option.id} story too long`)
        if (e.hpPct !== undefined && (e.hpPct < -50 || e.hpPct > 50)) problems.push(`option ${event.id}/${option.id} HP effect out of bounds`)
        if (e.potions !== undefined && (e.potions < 0 || e.potions > 3)) problems.push(`option ${event.id}/${option.id} potion effect out of bounds`)
        if ((e.gold ?? 0) < -100 || (e.gold ?? 0) > 500 || (e.goldPerTier ?? 0) < 0 || (e.goldPerTier ?? 0) > 100) problems.push(`option ${event.id}/${option.id} gold effect out of bounds`)
      }
    }
  }
  // D110: raid chances are permille, the contest stays a real contest for every pairing, losses are bounded shares.
  const raids = content.raids
  if (raids) {
    const stances = ['cautious', 'balanced', 'bold'] as const
    for (const id of stances) {
      const launch = raids.launchPermille[id]
      if (!Number.isSafeInteger(launch) || launch < 0 || launch > 100) problems.push(`raid launch chance for ${id} must be 0–100 permille`)
      if (!Number.isSafeInteger(raids.edgePct[id])) problems.push(`raid edge for ${id} must be an integer`)
    }
    for (const raider of stances) for (const target of stances) {
      const chance = 50 + raids.edgePct[raider] - raids.edgePct[target]
      if (!(chance >= 10 && chance <= 90)) problems.push(`raid win chance ${raider} on ${target} must stay within 10–90%`)
    }
    for (const [name, value] of [['goldLossPct', raids.goldLossPct], ['loserHpPct', raids.loserHpPct], ['winnerHpPct', raids.winnerHpPct]] as const) {
      if (!Number.isSafeInteger(value) || value < 0 || value > 50) problems.push(`raid ${name} must be an integer from 0 to 50`)
    }
    if (raids.winnerHpPct > raids.loserHpPct) problems.push('the raid winner must lose less HP than the loser')
    if (!(raids.targetCooldownTicks >= 1 && raids.targetCooldownTicks <= 96)) problems.push('raid target cooldown must be 1 to 96 ticks')
    for (const [key, lines] of Object.entries(raids.narrative)) {
      if (lines.length < 1) problems.push(`raid narrative ${key} is empty`)
      for (const line of lines) {
        const allowed = ['rival']
        for (const [, name] of line.matchAll(/\{(\w+)\}/g)) if (!allowed.includes(name!)) problems.push(`raid narrative ${key} uses {${name}}: ${line}`)
      }
    }
  }
  if (content.merchant) {
    if (!(content.merchant.potionPrice >= 1 && content.merchant.maxPotionsOffered >= 1 && content.merchant.maxPotionsOffered <= 10)) problems.push('merchant potion offer out of bounds')
    if (!(content.merchant.staysForTicks >= 1 && content.merchant.staysForTicks <= 8)) problems.push('merchant must stay between 1 and 8 ticks')
  }
  if (content.stances && (content.stances.balanced.autoPotionBelowPct !== c.autoPotionBelowPct || content.stances.balanced.restBelowPct !== c.restBelowPct || content.stances.balanced.resumeExploringAtPct !== c.resumeExploringAtPct || content.stances.balanced.victoryXpPct !== 100)) problems.push('the balanced stance must mirror the catalog constants')
  percent('jackpot.chancePct', c.jackpot.chancePct)

  const monsterIds = new Set<string>()
  for (const monster of content.monsters) {
    if (monsterIds.has(monster.id)) problems.push(`duplicate monster ${monster.id}`)
    monsterIds.add(monster.id)
    if ([...monster.name].length > CONTENT_LIMITS.monsterName) problems.push(`monster name too long: ${monster.name}`)
    for (const range of [monster.xp, monster.gold]) {
      if (range.min < 1 || range.max < range.min) problems.push(`monster ${monster.id} has an invalid reward range`)
    }
  }
  for (const template of content.gearTemplates) {
    if ([...template.name].length > CONTENT_LIMITS.itemName) problems.push(`item name too long: ${template.name}`)
    const tier = content.gearTiers[template.tier]
    if (tier === undefined) problems.push(`gear ${template.id} has unknown tier`)
    else if ((template.kind === 'weapon' ? tier.weaponAttack : tier.armorDefense) + (template.statOffset ?? 0) < 1) problems.push(`gear ${template.id} stat offset leaves no stat`)
  }

  const biomeIds = new Set(content.biomes.map((biome) => biome.id))
  if (!biomeIds.has(content.safeBiomeId)) problems.push('safe biome missing')
  for (const biome of content.biomes) {
    if (sum(Object.values(biome.weights)) !== 100) problems.push(`biome ${biome.id} weights must sum to 100`)
    if (biome.monsterIds.length < CONTENT_LIMITS.monstersPerBiome) problems.push(`biome ${biome.id} needs ${CONTENT_LIMITS.monstersPerBiome} monsters`)
    for (const id of biome.monsterIds) {
      const monster = content.monsters.find((m) => m.id === id)
      if (monster === undefined) problems.push(`biome ${biome.id} references missing monster ${id}`)
      else if (monster.tier !== biome.tier) problems.push(`monster ${id} tier does not match ${biome.id}`)
    }
    for (const kind of ['weapon', 'armor'] as const) {
      if (!content.gearTemplates.some((t) => t.tier === biome.tier && t.kind === kind)) problems.push(`biome ${biome.id} has no ${kind} templates`)
    }
    const narrative = content.narrative.biomes[biome.id]
    if (narrative === undefined) {
      problems.push(`biome ${biome.id} has no narrative`)
      continue
    }
    for (const key of ['victory', 'lootGold', 'trapHit', 'rest'] as const) {
      if (narrative[key].length < CONTENT_LIMITS.variantsPerEncounterPerBiome) problems.push(`biome ${biome.id} needs 4 ${key} variants`)
    }
    for (const key of ['eliteVictory', 'jackpot'] as const) {
      if (narrative[key].length < 1) problems.push(`biome ${biome.id} needs a ${key} variant`)
    }
  }
  for (const [key, list] of Object.entries(content.narrative.shared)) {
    if ((list as readonly string[]).length < 1) problems.push(`shared narrative ${key} is empty`)
  }
  const tiers = content.bagLadder.tiers
  if (tiers.length < 2) problems.push('bag ladder needs at least two tiers')
  if (tiers[0]?.milestone !== undefined || tiers[0]?.price !== undefined) problems.push('the starting bag has no milestone or price')
  tiers.forEach((tier, i) => {
    if ([...tier.name].length > CONTENT_LIMITS.itemName) problems.push(`bag name too long: ${tier.name}`)
    if (!Number.isSafeInteger(tier.capacity) || tier.capacity < 1) problems.push(`bag ${tier.id} capacity must be a positive integer`)
    if (i > 0) {
      if (tier.capacity <= tiers[i - 1]!.capacity) problems.push(`bag ${tier.id} must be larger than the previous tier`)
      if (tier.milestone === undefined || tier.price === undefined || tier.price < 1) problems.push(`bag ${tier.id} needs a milestone and price`)
    }
  })
  // Bounded reads (MAX_INVENTORY_ROWS): bag + two equipped + held + potion.
  if (Math.max(...tiers.map((tier) => tier.capacity)) + 4 > 32) problems.push('bag capacity exceeds the 32-row inventory read')
  const permille = content.bagLadder.findPermille
  if (!Number.isSafeInteger(permille) || permille < 0 || permille > 1000) problems.push('bag find chance must be 0–1000 permille')
  for (const [id, lines] of Object.entries(content.narrative.monsters)) {
    if (!monsterIds.has(id)) problems.push(`monster narrative for unknown monster ${id}`)
    for (const line of lines.victory) {
      if (!line.includes('{monster}') || !line.includes('{xp}')) problems.push(`monster ${id} victory line misses {monster} or {xp}: ${line}`)
    }
  }
  return problems
}
