import { createFileRoute } from '@tanstack/react-router'
import { ProsePage, SUPPORT_EMAIL } from '../lib/prose'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/privacy')({
  head: () => seo({ title: 'Privacy', path: '/privacy', description: 'What Desk Crawler stores, what is public on leaderboards and TRMNL screens, and how to delete your account.' }),
  component: () => (
    <ProsePage title="Privacy">
      <p>Desk Crawler is a free game. This page describes what the service stores and why, in plain terms.</p>
      <h2>What is public</h2>
      <p>Your public name, your hero's name and level, and your ranks appear on leaderboards and on other players' TRMNL screens.</p>
      <h2>What we store</h2>
      <ul>
        <li>Your sign-in identity from Clerk, our authentication provider. We do not copy your email address or real name into the game.</li>
        <li>Your hero, items, adventure log (detailed entries for three days) and recent XP used for rankings.</li>
        <li>A hash of the TRMNL installation token and the plugin instance ID, so the right hero appears on your screen. We do not store your TRMNL name or email.</li>
        <li>Short-lived operational records such as rate-limit counters and duplicate-request receipts.</li>
      </ul>
      <h2>Backups and cached screens</h2>
      <p>Daily backups are kept for about a week for recovery. Images already sent to a TRMNL device or cached by TRMNL cannot be erased by us.</p>
      <h2>Contact</h2>
      <p>
        For privacy questions or to request account deletion, email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>
    </ProsePage>
  ),
})
