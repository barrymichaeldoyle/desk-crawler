import { createFileRoute } from '@tanstack/react-router'
import { ProsePage, SUPPORT_EMAIL } from '../lib/prose'

export const Route = createFileRoute('/support')({
  head: () => ({ meta: [{ title: 'Support · Desk Crawler' }] }),
  component: () => (
    <ProsePage title="Support">
      <ul>
        <li>
          Account, connection, name or safety reports: <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>. We aim to reply within two business days.
        </li>
        <li>
          Bugs that contain no private information: <a href="https://github.com/barrymichaeldoyle/desk-crawler/issues">GitHub issues</a>.
        </li>
        <li>
          Setup and screen questions: see <a href="/help/trmnl">TRMNL help</a>.
        </li>
      </ul>
      <h2>Public names</h2>
      <p>
        Public names may not contain hateful or sexual content, threats or harassment, contact details, or impersonation of other players or staff.
        Reported names may be hidden and replaced with a temporary name; your hero's progress is never affected.
      </p>
    </ProsePage>
  ),
})
