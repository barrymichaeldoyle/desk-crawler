import { useId, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { useOnline } from './network'

export function Button({ variant = 'primary', className = '', pending = false, busyLabel = 'Working…', allowOffline = false, children, disabled, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet'; pending?: boolean; busyLabel?: string; allowOffline?: boolean }) {
  const online = useOnline()
  const styles = {
    primary: 'bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300',
    secondary: 'border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-stone-50 dark:border-stone-300 dark:text-stone-100 dark:hover:bg-stone-100 dark:hover:text-stone-900',
    quiet: 'text-stone-700 underline underline-offset-4 hover:text-stone-900 dark:text-stone-300',
  }[variant]
  return <button type="button" {...props} aria-busy={pending || undefined} disabled={disabled || pending || (!online && !allowOffline)} className={`min-h-11 px-4 py-2 font-semibold disabled:cursor-not-allowed disabled:opacity-50 ${styles} ${className}`}>{pending ? busyLabel : children}</button>
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  const id = useId()
  return (
    <section aria-labelledby={title ? id : undefined} className={`border-t border-stone-900 pt-4 dark:border-stone-300 ${className}`}>
      {title ? <h2 id={id} className="mb-3 font-display text-xl font-semibold">{title}</h2> : null}
      {children}
    </section>
  )
}

export function LoadingState({ label = 'Loading…' }: { label?: string }) {
  return <div role="status" className="min-h-48 space-y-5 py-4 text-stone-600 dark:text-stone-400">
    <p>{label}</p>
    <div aria-hidden="true" className="space-y-4">
      <div className="h-6 w-2/3 bg-stone-200 dark:bg-stone-800" />
      <div className="h-3 w-full bg-stone-200 dark:bg-stone-800" />
      <div className="h-3 w-4/5 bg-stone-200 dark:bg-stone-800" />
    </div>
  </div>
}

export function ActionFeedback({ error, message }: { error: string | null; message: string | null }) {
  return <><ErrorNote message={error} /><p role="status" className="text-sm font-semibold">{error ? '' : message}</p></>
}

export function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value * 100) / max))) : 0
  return (
    <div className="min-w-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-2 text-sm">
        <span className="caps font-semibold">{label}</span>
        <span className="min-w-0 max-w-full tabular-nums [overflow-wrap:anywhere]">
          {value}/{max}
        </span>
      </div>
      <div className="mt-1 h-3 overflow-hidden border border-stone-900 dark:border-stone-200" role="meter" aria-label={label} aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-valuetext={`${value} of ${max}`}>
        <div className="h-full bg-stone-900 dark:bg-stone-200" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export function ErrorNote({ message }: { message: string | null }) {
  if (!message) return null
  return (
    <p role="alert" className="text-sm font-semibold text-red-700 dark:text-red-400">
      {message}
    </p>
  )
}
