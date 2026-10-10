import { Fragment, type ReactNode } from 'react'

/** Label and value pairs in two columns: Slow Cast's way of stating facts without a paragraph. */
export function Rows({ rows, className = '' }: { rows: ReadonlyArray<readonly [string, ReactNode] | null | false>; className?: string }) {
  return (
    <dl className={`grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-sm ${className}`}>
      {rows.map((row) => (row ? <Fragment key={row[0]}><dt className="text-muted">{row[0]}</dt><dd>{row[1]}</dd></Fragment> : null))}
    </dl>
  )
}
