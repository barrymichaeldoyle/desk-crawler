import { createFileRoute } from '@tanstack/react-router'
import { ProsePage, SUPPORT_EMAIL } from '../../lib/prose'
import { DESK_CRAWLER_OG, seo } from '../../lib/seo'

export const Route = createFileRoute('/help/desk-crawler')({
  head: () => seo({ title: 'Desk Crawler help and setup', path: '/help/desk-crawler', description: 'Install Desk Crawler on TRMNL, choose a stance, meet the merchant, answer decisions, understand refresh timing, and fix a screen that looks out of date.', image: DESK_CRAWLER_OG }),
  component: () => (
    <ProsePage title="Desk Crawler on TRMNL">
      <h2>Getting started</h2>
      <ul>
        <li>Install Desk Crawler from the TRMNL plugin marketplace and choose Install.</li>
        <li>Sign in to Desk Crawler, pick a public name and a hero name, and connect the installation.</li>
        <li>Back in TRMNL, click Save. Saving starts your hero's adventures from the next world tick.</li>
        <li>Add the plugin to a playlist, or to a mashup if you want your hero beside other plugins. All four layout sizes are supported.</li>
      </ul>
      <h2>If the QR sends you back to setup</h2>
      <p>The QR opens the companion for the account you are signed in with. It does not start a new installation. Check the signed-in email shown on the setup page and use Switch account if you originally connected with a different account.</p>
      <p>If setup says “Reconnect Desk Crawler”, your TRMNL connection exists but the hero is missing. This can happen after the pre-launch game reset. Install a fresh copy of Desk Crawler from TRMNL, sign in with the same account, choose a new hero name, connect, then click Save back in TRMNL. Once the new copy works, remove the old copy from your playlist.</p>
      <p>If setup says “Save in TRMNL to start”, your hero is already prepared. Return to that installation in TRMNL and click Save.</p>
      <h2>How time works</h2>
      <p>
        The game world advances every 15 minutes whether or not your screen is on. Your TRMNL shows a snapshot and refreshes on its own schedule.
        Sleep Mode, slower refresh and other playlist items never reduce your hero's progress. Adventure times in the companion use your browser's local timezone.
      </p>
      <h2>Desk keepsakes</h2>
      <p>Keep Desk Crawler in your playlist and look for “Keepsake code” and a six-digit code, like 482 917, in the screen’s title bar (narrow portrait mashups shorten it to “Keepsake”). Enter that code in the companion’s Settings to collect a permanent office souvenir. Full-screen and mashup layouts both show it; the companion preview hides it.</p>
      <p>You can collect one keepsake each week, with a new code from Monday at 00:00 UTC. Last week’s code works too if your screen refreshes slowly. Missing weeks loses nothing: the next design waits for you. After collecting the full set, you can collect more of each. Keepsakes do not change XP, gear or rankings, and extra devices or faster refresh earn no extras.</p>
      <h2>Stances</h2>
      <p>Choose how careful your hero is on the Hero page. The stance applies from the next adventure, and you can change it whenever you like. Your TRMNL shows it beside the bag count, under a gauge whose needle sits low for Cautious, in the middle for Balanced and high for Bold.</p>
      <ul>
        <li><strong>Cautious</strong> drinks a potion below 65% HP, rests below 50% and sets off again at 90%. It earns 90% of the usual XP from wins.</li>
        <li><strong>Balanced</strong>, the default, drinks below 50%, rests below 35% and sets off again at 75%, with the usual XP.</li>
        <li><strong>Bold</strong> drinks below 35%, rests below 20% and sets off again at 60%. It earns 115% XP from wins but gets knocked out more often.</li>
      </ul>
      <h2>Desk raids</h2>
      <p>While exploring, heroes sometimes raid each other's desks. It happens by itself, to every active hero, with nothing to press and no way to aim it. The raid shows up in both heroes' adventure logs with the other player's public name, and the Hero page keeps a record of your hero's raids.</p>
      <ul>
        <li>Who wins is a coin toss, moved only by stance. Level, gear and effects never count. Cautious adds 10 points to its side of the toss, Balanced adds nothing and Bold takes 5 away, whether raiding or defending.</li>
        <li>How often your hero raids depends on stance too: Cautious about every other day of exploring, Balanced about once a day, Bold about twice a day.</li>
        <li>The loser hands over 5% of its gold to the winner, so gold only changes hands. Both lose health: the loser 30% of its maximum HP, the winner 10%. Thrifty gear takes its points off the gold loss.</li>
        <li>A raid can knock a hero out, exactly like a fight; in Office Cubicles your hero is rescued instead. Raids only find heroes who are exploring or resting, and a hero raided once is left alone for about six hours.</li>
        <li>If you'd rather lose fewer raids, pick Cautious: it raids least and wins most.</li>
      </ul>
      <h2>Potions</h2>
      <p>A healing potion restores 40% of your hero's maximum HP, rounded up. Your hero drinks one automatically when HP falls below the stance's potion level while exploring, and the adventure log notes it. With no potions left, your hero rests below the stance's rest level and sets off again once recovered. You can also drink one yourself from the Hero page whenever your hero is exploring or resting and not at full HP. Potions are found while exploring and never take up bag space.</p>
      <p>Potions are kept in a pouch. A new hero carries a Thermos that holds 20. The pouch grows to a Lunchbox (30) at level 6, a Cooler Bag (40) at level 10 and a Vending Cart (60) at level 14. Your hero might find the next pouch early, or you can buy it on the Bag page for 120, 450 or 1,500 gold, up to one pouch ahead of those levels. When the pouch is full, a potion find becomes gold instead.</p>
      <h2>The wandering merchant</h2>
      <p>Now and then your hero meets a wandering merchant while exploring. Your screen says “Merchant visiting. Shop in the companion soon.” and the Bag page shows up to three offers: a few potions, and sometimes the next pouch or bag early. Each offer sells once. The merchant moves on after four adventures or after your last purchase. Missing a visit costs nothing.</p>
      <h2>Decisions</h2>
      <p>Sometimes the office asks your hero something small, like chipping in for a cake or staying late. Your screen says “A decision is waiting in the companion.” and the Hero page shows both options with exactly what each one changes. If you don't answer within about a day, the option marked as the default happens by itself, so adventures never wait for you.</p>
      <h2>Effects</h2>
      <p>Some moments leave your hero with a short effect, listed on the Hero page with the adventures it has left. Beating an elite makes your hero Fired up (+10% attack for eight adventures). Chipping in for cake makes your hero Well fed (+10% XP for eight adventures). A trap leaves your hero Bruised (−15% defense for four adventures). Your hero holds at most three effects. Any rest shakes off bad effects, and a knockout clears them all.</p>
      <h2>Rare and epic gear</h2>
      <p>Gear comes as common, uncommon, rare or epic. Epic gear is the rarest, about one find in a hundred, and the strongest. Rare and epic gear also carry one special trait, shown in the item's name and explained on the Bag page:</p>
      <ul>
        <li><strong>Vampiric</strong> heals 5% of maximum HP after every win.</li>
        <li><strong>Lucky</strong> adds 20% gold from wins and finds.</li>
        <li><strong>Sturdy</strong> takes 40% less damage from traps.</li>
        <li><strong>Thrifty</strong> keeps more gold when things go wrong: a retreat costs nothing and a knockout costs 5% of gold instead of 10%.</li>
      </ul>
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
      <h2>Recaps</h2>
      <p>Your screen carries a short recap of the last finished night or day, in your TRMNL's local time. At 07:00 the night recap reports 19:00 to 07:00 and stays up all day. At 19:00 the day recap reports 07:00 to 19:00 and stays up all evening and overnight. The office window shows day and night on the same hours. The newest stories above it are always live.</p>
      <h2>Understanding rankings</h2>
      <p>The screen shows the seven-day XP Top 5 for your level group, with your own row marked, or added below the list when you sit lower. The companion also offers a 24-hour view and a lifetime board. Rankings publish hourly, so a recent adventure or level-up can appear before your rank updates.</p>
      <p>Paused and sleeping heroes keep their progress, but their recent XP ages out. After seven days without earned XP, they leave the weekly board until they earn XP again. Lifetime progress stays recorded.</p>
      <h2>Sharing your hero</h2>
      <p>In Settings you can make a public page for your hero, with its level, rank, current floor, lifetime counts and achievements. Gear, gold and the adventure log are never shown. The page is off until you turn it on, and you can make it private again at any time. Once it's public, Settings has Share and Copy link buttons, a shared link shows a picture card of your hero with its name, level and rank, and your name links to the page from the companion's rankings.</p>
      <h2>If the screen looks old</h2>
      <ul>
        <li>"Updates delayed" means the game service is running late. Nothing is lost and you don't need to do anything.</li>
        <li>If the companion website is current but the screen is not, check the plugin's refresh setting and playlist position in TRMNL.</li>
        <li>Adventures run every quarter hour, on the hour and at :15, :30 and :45 in your TRMNL timezone. The screen shows no countdown; the time beside each story is when it happened, and the companion shows the next adventure.</li>
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
