import { Link, createFileRoute } from '@tanstack/react-router'
import { POLICY_UPDATED, ProsePage, SUPPORT_EMAIL } from '../lib/prose'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/privacy')({
  head: () => seo({ title: 'Privacy', path: '/privacy', description: 'What TRMNL Games stores, what is public on leaderboards and TRMNL screens, and how to delete your account.' }),
  component: () => (
    <ProsePage title="Privacy" updated={POLICY_UPDATED}>
      <p>
        TRMNL Games is a collection of games run by Barry Michael Doyle, an individual developer. This page describes what the service stores, who handles it and
        how to remove it, in plain terms. Questions go to <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
      </p>

      <h2>What is public</h2>
      <p>
        Your public name, your hero's name and level, and your ranks appear on leaderboards and on other players' TRMNL screens. Choose a public name you're
        happy to share and never include contact details in it.
      </p>

      <h2>What we store</h2>
      <ul>
        <li>Your sign-in identity from Clerk, our sign-in provider. Your email is copied into short-lived deletion confirmation requests only; we do not copy your real name or profile picture into the game database.</li>
        <li>Your public name, hero, items, adventure log and the recent XP used for rankings. Older accounts may also have a saved time zone from previous versions.</li>
        <li>
          For each TRMNL installation: the plugin instance ID, a hash of its access token and the settings link TRMNL gives us. We do not store your TRMNL
          name or email.
        </li>
        <li>Short-lived operational records such as rate-limit counters and duplicate-request receipts.</li>
        <li>When you request account deletion: your verified primary email, a hash of the confirmation link, and delivery status. The link expires after 30 minutes; expired requests are removed by daily cleanup.</li>
        <li>If you join the Desk Crawler launch list: your email address, where you signed up and, if you joined while signed in, a link to your account. We use it for one email when Desk Crawler reaches the TRMNL marketplace, nothing else.</li>
        <li>If you send feedback: your message, the page you sent it from, your public name and a link to your account. It is emailed to the developer with your verified primary email as the reply address.</li>
      </ul>

      <h2>What we don't do</h2>
      <p>No ads and no selling or sharing of your data for marketing. The game has no purchases, so we hold no payment details.</p>

      <h2>Optional analytics and support</h2>
      <p>If you allow analytics, PostHog records the pages you visit, setup steps, game-action failures and browser errors. When you sign in, these records link to your Clerk account ID, email address, public name and hero name so we can investigate support requests and fix problems.</p>
      <p>PostHog also records masked sessions so we can see where a flow gets stuck. Text and form inputs are masked, sign-in and account details are blocked, and we do not record network bodies, headers or console output. Installation codes, access tokens, management JWTs and URL query strings are excluded.</p>
      <p>You can decline and keep playing. Use Analytics preferences in the site footer to change your choice. Turning analytics off stops new collection in that browser; it does not erase earlier records. Contact us to remove those records, or delete your TRMNL Games account to request removal of its linked PostHog profile, events and recordings.</p>

      <h2>Cookies</h2>
      <p>
        Clerk sets cookies that keep you signed in. While you connect or manage a TRMNL installation, we set a short-lived encrypted cookie that expires
        within minutes. A deletion confirmation link uses a short-lived encrypted cookie so you can sign in before confirming. If you allow analytics, PostHog uses browser local storage to recognize your visits. We also store your analytics preference locally. There are no advertising cookies.
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
        <li><strong>PostHog EU</strong> handles optional usage analytics, error reports and masked session recordings for support and product improvements.</li>
        <li><strong>Resend</strong> delivers the account deletion confirmation email to your verified primary address, the one launch email to the launch list, and feedback you send to the developer. It receives those addresses and the email contents.</li>
      </ul>

      <h2>How long we keep it</h2>
      <ul>
        <li>Your shared account: until you delete it. Game progress: until you delete that game or your account.</li>
        <li>Detailed adventure log: three days. Run summaries: 30 days. Recent XP for rankings: seven days.</li>
        <li>Duplicate-request receipts: 24 hours. TRMNL connection attempts: under a day.</li>
        <li>Launch list: until the launch email is sent, then deleted. You can leave earlier with the link in that email, from the companion if you joined signed in, or by emailing us. Deleting your account removes an entry you joined with it.</li>
        <li>Feedback: until you delete your account, or earlier on request. Copies already emailed to the developer are deleted on request.</li>
        <li>Backups: about a week, after which deleted data is gone from them too.</li>
        <li>Masked recordings: 30 days. Analytics events and support profiles: until account deletion or an earlier removal request.</li>
      </ul>

      <h2>Deleting your account</h2>
      <p>
        Go to <Link to="/account">Account</Link> and request a deletion link. We email your verified primary address; the link expires after 30 minutes. Sign in with the same account and type DELETE on the confirmation page. Until you confirm, your account stays active. After confirmation, your account stops working straight away, your public name is hidden from
        leaderboards, and your hero, items, history, TRMNL connections and TRMNL Games sign-in are then removed. Leaderboard snapshots that copied your name
        are replaced within about two hours. If you can't sign in, email us and we'll do it for you.
      </p>
      <p>
        We keep only a one-way hash of your sign-in identity and of your old TRMNL tokens, so a deleted account can't be quietly reconnected. Images already
        sent to a TRMNL device or cached by TRMNL can't be erased by us; remove the plugin from your playlist to replace them. Rate-limit counters are removed during deletion, and account references in administrative audit entries are scrubbed.
      </p>
      <p>Removal of linked PostHog profiles, events and recordings is requested as part of account deletion and processed asynchronously by PostHog. Failed requests are retried and remain visible to the operator until resolved.</p>

      <h2>Deleting only a game</h2>
      <p>In <Link to="/app/desk-crawler/settings">Desk Crawler settings</Link>, choose Delete Desk Crawler progress to remove that hero, history and connections. Your shared account and sign-in stay available. You can start again by installing the plugin after removal finishes. Other games are unaffected.</p>

      <h2>Your choices</h2>
      <p>
        You can ask for a copy of your game data, or for something to be corrected or deleted, by emailing <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        We aim to reply within two business days.
      </p>

      <h2>Children</h2>
      <p>TRMNL Games is not intended for children under 13, and we don't knowingly hold their data. If you believe a child has an account, email us and we'll delete it.</p>

      <h2>Changes</h2>
      <p>When this policy changes we update this page and the date at the top.</p>
    </ProsePage>
  ),
})
