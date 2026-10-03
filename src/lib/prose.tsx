import { Link } from '@tanstack/react-router'
import type { ReactNode } from 'react'

export function ProsePage({ title, children }: { title: string; children: ReactNode }) {
  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-12 leading-relaxed [&_h2]:mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_a]:underline">
      <Link to="/" className="font-mono text-sm font-bold uppercase tracking-widest no-underline">
        Desk Crawler
      </Link>
      <h1 className="text-3xl font-bold">{title}</h1>
      {children}
    </main>
  )
}

export const SUPPORT_EMAIL = 'barry@barrymichaeldoyle.com'
