import { createRng, pickWeighted } from '@trmnl-games/engine/rng'
import type { SlowCastCatalog, TimeBand, WaterDef, Weather } from './types'

const HOUR_MS = 3_600_000
/** Weather holds for six UTC hours at each water (slow-cast.md "Weather and the shared forecast"). */
export const FORECAST_BLOCK_MS = 6 * HOUR_MS

/** The forecast block a moment belongs to; the adapter hashes it with the world seed and water. */
export const forecastBlock = (at: number): number => Math.floor(at / FORECAST_BLOCK_MS)

/** The block's weather from its shared seed: one weighted draw, the same for every angler at the water. */
export function weatherFromSeed(seed: number, water: WaterDef): Weather {
  return pickWeighted(createRng(seed), water.weather)
}

/** Local hour (0 to 23) for a wall slot and an optional UTC offset in seconds. */
export function localHour(at: number, utcOffsetSeconds: number | undefined): number {
  const shifted = at + (utcOffsetSeconds ?? 0) * 1000
  return new Date(shifted).getUTCHours()
}

export function timeBand(hour: number, content: Pick<SlowCastCatalog, 'bands'>): TimeBand {
  const { dawn, day, dusk, night } = content.bands
  if (hour >= dawn && hour < day) return 'dawn'
  if (hour >= day && hour < dusk) return 'day'
  if (hour >= dusk && hour < night) return 'dusk'
  return 'night'
}

/** Bands a fish treats the moment as: fog makes dawn and dusk read as night too. */
export function effectiveBands(band: TimeBand, weather: Weather): readonly TimeBand[] {
  return weather === 'fog' && (band === 'dawn' || band === 'dusk') ? [band, 'night'] : [band]
}

export const BAND_PHRASE: Readonly<Record<TimeBand, string>> = { dawn: 'at first light', day: 'in the day', dusk: 'at dusk', night: 'in the dark' }
export const WEATHER_WORD: Readonly<Record<Weather, string>> = { clear: 'clear', overcast: 'overcast', rain: 'rain', wind: 'wind', fog: 'fog' }
