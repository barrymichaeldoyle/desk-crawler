import type { ContentCatalog } from '../sim/core/types'

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
    if (content.gearTiers[template.tier] === undefined) problems.push(`gear ${template.id} has unknown tier`)
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
  for (const [id, lines] of Object.entries(content.narrative.monsters ?? {})) {
    if (!monsterIds.has(id)) problems.push(`monster narrative for unknown monster ${id}`)
    for (const line of lines.victory) {
      if (!line.includes('{monster}') || !line.includes('{xp}')) problems.push(`monster ${id} victory line misses {monster} or {xp}: ${line}`)
    }
  }
  return problems
}
