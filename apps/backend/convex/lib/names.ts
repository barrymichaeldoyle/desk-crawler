/**
 * Public alias and hero-name validation (gameplay.md). MVP allowlist suits the
 * TRMNL device fonts; broaden only after glyph evidence. Liquid/HTML delimiters
 * are not in the allowlist, and render paths escape text anyway.
 */
const ALLOWED = /^[A-Za-z0-9 ._'-]+$/

export interface NameRule {
  readonly min: number
  readonly max: number
}

export const ALIAS_RULE: NameRule = { min: 2, max: 20 }
export const HERO_NAME_RULE: NameRule = { min: 2, max: 16 }

export type NameResult = { ok: true; value: string } | { ok: false; reason: string }

export function validateName(raw: string, rule: NameRule): NameResult {
  const value = raw.normalize('NFC').trim().replace(/\s+/g, ' ')
  const length = [...value].length
  if (length < rule.min || length > rule.max) return { ok: false, reason: `Use ${rule.min}-${rule.max} characters.` }
  if (!ALLOWED.test(value)) return { ok: false, reason: "Use letters, numbers, spaces and . _ ' - only." }
  return { ok: true, value }
}

/** Case-insensitive uniqueness key for public aliases. */
export const normalizeAlias = (alias: string): string => alias.normalize('NFC').trim().toLowerCase()

export function validateTimezone(raw: string): string {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: raw })
    return raw
  } catch {
    return 'UTC'
  }
}
