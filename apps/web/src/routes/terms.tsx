import { Link, createFileRoute } from '@tanstack/react-router'
import { POLICY_UPDATED, ProsePage, SUPPORT_EMAIL } from '../lib/prose'
import { seo } from '../lib/seo'

export const Route = createFileRoute('/terms')({
  head: () => seo({ title: 'Terms', path: '/terms', description: 'The rules for playing Desk Crawler: a free game, provided as-is, with fair-play and public-name rules.' }),
  component: () => (
    <ProsePage title="Terms of use" updated={POLICY_UPDATED}>
      <p>
        These terms cover your use of TRMNL Games and its games, run by Barry Michael Doyle. By creating an account or connecting a TRMNL installation you agree
        to them. They sit alongside the <Link to="/privacy">privacy policy</Link>.
      </p>

      <h2>The game</h2>
      <ul>
        <li>Desk Crawler is free. There are no purchases, subscriptions or ads.</li>
        <li>
          The game changes over time: balance, content and features may be adjusted. We aim to keep your hero's progress across updates, but we can't
          guarantee it.
        </li>
        <li>We may pause or end the service. Where we can, we'll give notice in the companion first.</li>
      </ul>

      <h2>Your account</h2>
      <ul>
        <li>You need to be at least 13 to play.</li>
        <li>Keep your sign-in secure. You're responsible for what happens through your account.</li>
        <li>
          You can delete your account at any time from <Link to="/account">Account</Link>.
        </li>
      </ul>

      <h2>Fair play and public names</h2>
      <ul>
        <li>
          Public names and hero names must follow the <Link to="/support">name rules</Link>: no hateful or sexual content, threats or harassment, contact details
          or impersonation.
        </li>
        <li>Don't automate the game, exploit bugs, interfere with the service or other players, or try to reach data that isn't yours. Report bugs instead.</li>
        <li>
          We may hide a name, or suspend an account for deliberate or repeated abuse. Hiding a name never affects your hero's progress. To appeal, email{' '}
          <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>.
        </li>
      </ul>

      <h2>Gold and items</h2>
      <p>Gold, gear and potions are part of the game only. They have no cash value and can't be sold, traded or transferred outside the game.</p>

      <h2>TRMNL</h2>
      <p>
        TRMNL Games and Desk Crawler are independent projects. It is not made, endorsed or supported by TRMNL. Your TRMNL account and device are covered by TRMNL's own terms.
      </p>

      <h2>Ownership</h2>
      <p>
        The source code is open under the MIT License on{' '}
        <a href="https://github.com/barrymichaeldoyle/trmnl-games">GitHub</a>. The artwork, the monster, item and place names, the written game text and
        the Desk Crawler name and logo are not covered by that license and remain all rights reserved.
      </p>

      <h2>No warranty</h2>
      <p>
        TRMNL Games is provided as-is, without warranties of any kind. As far as the law allows, we aren't liable for lost progress, service interruptions,
        what appears on your device, or any indirect loss. Nothing in these terms removes rights you have under consumer law that can't be excluded.
      </p>

      <h2>Changes</h2>
      <p>When these terms change we update this page and the date at the top. If you keep playing after a change, the new terms apply.</p>

      <h2>Contact</h2>
      <p>
        <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a>
      </p>
    </ProsePage>
  ),
})
