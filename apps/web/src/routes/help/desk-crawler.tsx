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
      <p>Keep Desk Crawler in your playlist and look for “Keepsake code” and an eight-character code, like ABCD-EFGH, in the screen’s title bar (narrow portrait mashups shorten it to “Keepsake”). Enter that code in the companion’s Settings to collect a permanent office souvenir. Full-screen and mashup layouts both show it; the companion preview hides it.</p>
      <p>You can collect one keepsake each week, with a new code from Monday at 00:00 UTC. Last week’s code works too if your screen refreshes slowly. Missing weeks loses nothing: the next design waits for you. After collecting the full set, you can collect more of each. Keepsakes do not change XP, gear or rankings, and extra devices or faster refresh earn no extras.</p>
      <h2>When your bag fills up</h2>
      <p>A new hero starts with a small paper bag that holds 6 pieces of gear. Equipped gear and potions don’t take up space. A full bag alone does not stop adventures: the next piece you find is held safely, then your hero sleeps until you make room. The held find is never automatically sold or discarded.</p>
      <h2>Bigger bags</h2>
      <p>Your bag grows as you play. Your hero finds a Tote Bag within the first couple of hours, then a bigger bag at levels 4, 8 and 12, up to 20 slots. Your hero might find the next bag early while exploring, or you can buy it with gold on the Bag page, up to one bag ahead of those levels.</p>
      <ol className="[&_li]:list-decimal">
        <li>Open Bag in the companion. Equip any upgrades and sell spare gear to free space.</li>
        <li>If a find is being held, choose Claim find. Leave at least one free slot after claiming it so adventures can resume.</li>
        <li>Choose Resume adventures. You can pick an unlocked destination at the same time. Your hero wakes on the next game tick.</li>
      </ol>
      <p>Equipping gear does not free a slot. Selling gear or claiming a find does not wake your hero automatically. Bag sleep is separate from your TRMNL’s Sleep Mode; a sleeping display never stops the game.</p>
      <h2>Getting knocked out</h2>
      <p>Your hero revives automatically after eight game ticks, normally about two hours, and returns to Office Cubicles. You keep your XP and equipment; getting knocked out costs 10% of your current gold. Office Cubicles provides a safe place to recover. You do not need to keep the companion open or press a revive button.</p>
      <h2>Understanding rankings</h2>
      <p>The screen shows your seven-day XP rank among heroes in your level group. The companion also offers a 24-hour view and a lifetime board. Rankings publish hourly, so a recent adventure or level-up can appear before your rank updates.</p>
      <p>Paused and sleeping heroes keep their progress, but their recent XP ages out. After seven days without earned XP, they leave the weekly board until they earn XP again. Lifetime progress stays recorded.</p>
      <h2>If the screen looks old</h2>
      <ul>
        <li>"Updates delayed" means the game service is running late. Nothing is lost and you don't need to do anything.</li>
        <li>If the companion website is current but the screen is not, check the plugin's refresh setting and playlist position in TRMNL.</li>
        <li>“Next adventure” is the expected game tick when that screen was generated. A slow refresh can leave a time that has already passed; check the companion for the current state.</li>
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
