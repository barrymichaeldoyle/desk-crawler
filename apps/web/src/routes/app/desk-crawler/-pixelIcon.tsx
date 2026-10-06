import { glyphRows } from '@trmnl-games/desk-crawler/art/glyphs'
import { KIND_TONE } from '../../../lib/palette'

/** A log-kind glyph (shared with the device screen) as an inline 16px icon, in its game colour unless `plain`. */
export function PixelIcon({ kind, className = '', plain = false }: { kind: string; className?: string; plain?: boolean }) {
  const rows = glyphRows(kind)
  return (
    <svg viewBox="0 0 8 8" width={16} height={16} aria-hidden="true" shapeRendering="crispEdges" className={`shrink-0 fill-current ${plain ? '' : (KIND_TONE[kind] ?? KIND_TONE.system)} ${className}`}>
      {rows.flatMap((row, y) => [...row].map((cell, x) => (cell === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  )
}
