import { glyphRows } from '@trmnl-games/desk-crawler/art/glyphs'

/** A log-kind glyph (shared with the device screen) as an inline 16px icon. */
export function PixelIcon({ kind, className = '' }: { kind: string; className?: string }) {
  const rows = glyphRows(kind)
  return (
    <svg viewBox="0 0 8 8" width={16} height={16} aria-hidden="true" shapeRendering="crispEdges" className={`shrink-0 fill-current ${className}`}>
      {rows.flatMap((row, y) => [...row].map((cell, x) => (cell === '#' ? <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} /> : null)))}
    </svg>
  )
}
