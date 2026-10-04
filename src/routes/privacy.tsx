import { Link, createFileRoute } from '@tanstack/react-router'
import { POLICY_UPDATED, ProsePage, SUPPORT_EMAIL } from '../lib/prose'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/privacy')({
  head: () => seo({ title: 'Privacy', path: '/privacy', description: 'What Desk Crawler stores, what is public on leaderboards and TRMNL screens, and how to delete your account.' }),
  component: () => (
    <ProsePage title="Privacy" updated={POLICY_UPDATED}>
      <p>
        Desk Crawler is a free game run by Barry Michael Doyle, an individual developer. This page describes what the service stores, who handles it and
        how to remove it, in plain terms. Questions go to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2>What is public</h2>
      <p>
        Your public name, your hero's name and level, and your ranks appear on leaderboards and on other players' TRMNL screens. Choose a public name you're
        happy to share and never include contact details in it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your sign-in identity from Clerk, our sign-in provider. We do not copy your email address, real name or profile picture into the game.</li>
        <li>Your public name, time zone, hero, items, adventure log and the recent XP used for rankings.</li>
        <li>
          For each TRMNL installation: the plugin instance ID, a hash of its access token and the settings link TRMNL gives us. We do not store your TRMNL
          name or email.
        </li>
        <li>Short-lived operational records such as rate-limit counters and duplicate-request receipts.</li>
      </ul>

      <h2>What we don't do</h2>
      <p>No ads, no analytics or tracking scripts, and no selling or sharing of your data for marketing. The game has no purchases, so we hold no payment details.</p>

      <h2>Cookies</h2>
      <p>
        Clerk sets cookies that keep you signed in. While you connect or manage a TRMNL installation, we set a short-lived encrypted cookie that expires
        within minutes. There are no advertising or tracking cookies.
      </p>

      <h2>Services that handle your data</h2>
      <ul>
        <li>
          <strong>Clerk</strong> runs sign-in and holds your email address and sign-in method, plus your Google or GitHub profile if you sign in with one.
        </li>
        <li>
          <strong>Convex</strong> hosts the game database, scheduled game ticks and daily backups.
        </li>
        <li>
          <strong>Cloudflare</strong> hosts this website and keeps standard request logs.
        </li>
        <li>
          <strong>TRMNL</strong> fetches your hero's screen from us. Your TRMNL account and device are covered by TRMNL's own privacy policy.
        </li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your account, hero and items: until you delete your account.</li>
        <li>Detailed adventure log: three days. Run summaries: 30 days. Recent XP for rankings: seven days.</li>
        <li>Duplicate-request receipts: 24 hours. TRMNL connection attempts: under a day.</li>
        <li>Backups: about a week, after which deleted data is gone from them too.</li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        Go to <Link to="/app/settings">Settings</Link> and choose Delete account. Your account stops working straight away, your public name is hidden from
        leaderboards, and your hero, items, history, TRMNL connections and Desk Crawler sign-in are then removed. Leaderboard snapshots that copied your name
        are replaced within about two hours. If you can't sign in, email us and we'll do it for you.
      </p>
      <p>
        We keep only a one-way hash of your sign-in identity and of your old TRMNL tokens, so a deleted account can't be quietly reconnected. Images already
        sent to a TRMNL device or cached by TRMNL can't be erased by us; remove the plugin from your playlist to replace them.
      </p>

      <h2>Your choices</h2>
      <p>
        You can ask for a copy of your game data, or for something to be corrected or deleted, by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        We aim to reply within two business days.
      </p>

      <h2>Children</h2>
      <p>Desk Crawler is not intended for children under 13, and we don't knowingly hold their data. If you believe a child has an account, email us and we'll delete it.</p>

      <h2>Changes</h2>
      <p>When this policy changes we update this page and the date at the top.</p>
    </ProsePage>
  ),
})
