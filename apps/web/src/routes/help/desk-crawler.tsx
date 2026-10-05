import { createFileRoute } from '@tanstack/react-router'
import { ProsePage, SUPPORT_EMAIL } from '../../lib/prose'
import { seo } from '../../lib/seo'

export const Route = createFileRoute('/help/desk-crawler')({
  head: () => seo({ title: 'TRMNL help', path: '/help/desk-crawler', description: 'Install Desk Crawler on TRMNL, understand snapshots and refresh timing, and fix a screen that looks out of date.' }),
  component: () => (
    <ProsePage title="Desk Crawler on TRMNL">
      <h2>Getting started</h2>
      <ul>
        <li>Install Desk Crawler from the TRMNL plugin marketplace and choose Install.</li>
        <li>Sign in to Desk Crawler, pick a public name and a hero name, and connect the installation.</li>
        <li>Back in TRMNL, click Save. Saving starts your hero's adventures from the next world tick.</li>
        <li>Add the plugin to a playlist, or to a mashup if you want your hero beside other plugins. All four layout sizes are supported.</li>
      </ul>
      <h2>How time works</h2>
      <p>
        The game world advances every 15 minutes whether or not your screen is on. Your TRMNL shows a snapshot and refreshes on its own schedule.
        Sleep Mode, slower refresh and other playlist items never reduce your hero's progress. Adventure times in the companion use your browser's local timezone.
      </p>
      <h2>Desk keepsakes</h2>
      <p>Keep Desk Crawler in your playlist and look for “Keepsake” followed by a code in the screen’s title bar. Enter that code in the companion’s Settings to collect a permanent office souvenir. Full-screen and mashup layouts both show it; the companion preview hides it.</p>
      <p>You can collect one keepsake each week, with a new code from Monday at 00:00 UTC. Last week’s code works too if your screen refreshes slowly. Missing weeks loses nothing: the next design waits for you. After collecting the full set, you can collect more of each. Keepsakes do not change XP, gear or rankings, and extra devices or faster refresh earn no extras.</p>
      <h2>If the screen looks old</h2>
      <ul>
        <li>"Updates delayed" means the game service is running late. Nothing is lost and you don't need to do anything.</li>
        <li>If the companion website is current but the screen is not, check the plugin's refresh setting and playlist position in TRMNL.</li>
        <li>If you disconnected or uninstalled, install again from TRMNL. Your hero keeps all progress.</li>
      </ul>
      <h2>Disconnecting and removing</h2>
      <p>
        Disconnecting stops new screens for that installation. TRMNL may keep showing the last image until you remove the plugin from your playlist; we
        cannot erase an image already on your device.
      </p>
      <h2>Help</h2>
      <p>
        Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> for account or connection help. We aim to reply within two business days.
      </p>
    </ProsePage>
  ),
})
