import type { ButtonHTMLAttributes, ReactNode } from 'react'

export function Button({ variant = 'primary', className = '', ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: 'primary' | 'secondary' | 'quiet' }) {
  const styles = {
    primary: 'bg-stone-900 text-white hover:bg-stone-700 dark:bg-stone-100 dark:text-stone-900 dark:hover:bg-stone-300',
    secondary: 'border border-stone-900 text-stone-900 hover:bg-stone-900 hover:text-stone-50 dark:border-stone-300 dark:text-stone-100 dark:hover:bg-stone-100 dark:hover:text-stone-900',
    quiet: 'text-stone-700 underline underline-offset-4 hover:text-stone-900 dark:text-stone-300',
  }[variant]
  return <button type="button" {...props} className={`min-h-11 px-4 font-semibold disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-stone-900 ${styles} ${className}`} />
}

export function Card({ title, children, className = '' }: { title?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-lg border border-stone-300 bg-white p-4 dark:border-stone-700 dark:bg-stone-900 ${className}`}>
      {title ? <h2 className="mb-3 text-base font-semibold text-stone-700 dark:text-stone-300">{title}</h2> : null}
      {children}
    </section>
  )
}

export function Meter({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, Math.round((value * 100) / max))) : 0
  return (
    <div>
      <div className="flex justify-between text-sm">
        <span className="caps font-semibold">{label}</span>
        <span className="tabular-nums">
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
