import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useOnline } from './network'

/** The gold menu choice: shared by Button and links styled as the primary action. */
export const BUTTON_PRIMARY = 'border-2 border-night bg-gold text-night hover:bg-gold-hi'

export function Button({ variant = 'primary', className = '', pending = false, busyLabel = 'Working…', allowOffline = false, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' | 'danger'; pending?: boolean; busyLabel?: string; allowOffline?: boolean }) {
  const online = useOnline()
  const styles = {
    primary: BUTTON_PRIMARY,
    secondary: 'border-2 border-edge text-ink hover:bg-ink hover:text-ground',
    quiet: 'text-muted underline underline-offset-4 hover:text-ink',
    danger: 'border-2 border-hp text-hp-ink hover:bg-hp hover:text-night',
  }[variant]
  return <button type="button" {...props} aria-busy={pending || undefined} disabled={disabled || pending || (!online && !allowOffline)} className={`min-h-11 px-4 py-2 font-semibold ${styles} disabled:cursor-not-allowed disabled:border-dashed disabled:border-faint disabled:bg-transparent disabled:text-muted disabled:no-underline ${className}`}>{pending ? busyLabel : children}</button>
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={title ? id : undefined} className={`window min-w-0 px-4 pt-3 pb-4 sm:px-5 ${className}`}>
      {title ? <h2 id={id} className="mb-3 font-display text-xl font-semibold text-gold-ink">{title}</h2> : null}
      {children}
    </section>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div role="status" className="min-h-48 space-y-5 py-4 text-muted">
    <p>{label}</p>
    <div aria-hidden="true" className="space-y-4">
      <div className="h-6 w-2/3 bg-rule" />
      <div className="h-3 w-full bg-rule" />
      <div className="h-3 w-4/5 bg-rule" />
    </div>
  </div>
}

export function ActionFeedback({ error, message }: { error: string | null; message: string | null }) {
  return <><ErrorNote message={error} /><p role="status" className="text-sm font-semibold">{error ? '' : message}</p></>
}

const METER_FILL = { hp: 'bg-hp', xp: 'bg-xp', gold: 'bg-gold', sky: 'bg-sky' } as const
const METER_INK = { hp: 'text-hp-ink', xp: 'text-xp-ink', gold: 'text-gold-ink', sky: 'text-sky-ink' } as const

/** A game stat bar: night track in a two-pixel edge, coloured fill with a one-pixel highlight row. */
export function Meter({ label, value, max, tone = 'xp' }: { label: string; value: number; max: number; tone?: keyof typeof METER_FILL }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value * 100) / max))) : 0
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className={`caps font-semibold ${METER_INK[tone]}`}>{label}</span>
        <span className="min-w-0 max-w-full tabular-nums [overflow-wrap:anywhere]">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-4 overflow-hidden border-2 border-edge bg-night" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-valuetext={`${value} of ${max}`}>
        <div className={`h-full ${METER_FILL[tone]} shadow-[inset_0_2px_0_rgb(255_255_255/0.35)]`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm font-semibold text-hp-ink">
      {message}
    </p>
  )
}
