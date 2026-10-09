import { createFileRoute } from '@tanstack/react-router'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { requireOpenGame } from '../../lib/gameAccess'
import { ProsePage, SUPPORT_EMAIL } from '../../lib/prose'
import { seo } from '../../lib/seo'

const CONTENTS: ReadonlyArray<readonly [string, string]> = [
  ['getting-started', 'Getting started'],
  ['how-fishing-works', 'How fishing works'],
  ['time-and-weather', 'Time and weather'],
  ['bait', 'Bait'],
  ['the-cooler', 'The cooler'],
  ['rods-and-fish-that-get-away', 'Rods and fish that get away'],
  ['waters', 'Waters'],
  ['the-logbook', 'The logbook'],
  ['rankings', 'Rankings'],
  ['pausing-and-removing', 'Pausing and removing'],
  ['help', 'Help'],
]

const water = (id: string) => contentV1.waters.find((w) => w.id === id)!
const access = (id: string) => contentV1.access.find((a) => a.id === id)!

/** Slow Cast help (slow-cast.md "Companion"). Hidden with the game until it is live (D115). */
export const Route = createFileRoute('/help/slow-cast')({
  loader: ({ context }) => requireOpenGame(context, 'slow-cast'),
  head: () => seo({ title: 'Slow Cast help', path: '/help/slow-cast', description: 'How Slow Cast fishes on your TRMNL: bait, the cooler, rods, waters, weather and the logbook.', index: false }),
  component: () => (
    <ProsePage title="Slow Cast on TRMNL" contents={CONTENTS}>
      <h2 id="getting-started">Getting started</h2>
      <ul>
        <li>Install Slow Cast from the TRMNL plugin marketplace and choose Install.</li>
        <li>Sign in to TRMNL Games and connect the installation. Your angler is you: it shows your public name.</li>
        <li>Back in TRMNL, click Save. Your angler casts the first line within fifteen minutes.</li>
        <li>Add the plugin to a playlist or a mashup. All four layout sizes are supported in both orientations.</li>
      </ul>
      <h2 id="how-fishing-works">How fishing works</h2>
      <p>Every fifteen minutes, day and night, your angler casts once. Sometimes a fish bites. Which fish depends on the water, the bait on the hook, the time of day and the weather; how heavy it is decides its price and whether it is a personal best. Your TRMNL shows the scene and the latest stories. Nothing needs a tap: open the companion when you want to sell, restock or move on.</p>
      <h2 id="time-and-weather">Time and weather</h2>
      <p>Dawn runs from 05:00 to 08:00, day to 17:00, dusk to 20:00, then night, in the timezone your TRMNL reports. Fish feed more at dawn and dusk. Weather is the same for every angler at a water and changes every six hours: clear, overcast, rain, wind or fog. Overcast and rain bring more bites at River Bend, wind brings fewer, and fog makes dawn and dusk dark enough for night fish.</p>
      <h2 id="bait">Bait</h2>
      <p>Choose the bait on the hook on the Dock page. A fish you keep, or one that gets away, takes one bait; a quiet cast takes none, and while the cooler is full the bait stays on the hook. With no bait for the water the angler fishes a bare hook, which bites less and catches only small fish. Buy bait in tubs in the Shop; each bait holds up to 72, and bait never spoils.</p>
      <h2 id="the-cooler">The cooler</h2>
      <p>Fish go in the cooler until you sell them. When it is full the angler keeps fishing and releases what it catches: those fish still count for XP, the logbook and achievements, but earn no gold. Your TRMNL says so and its code opens the cooler. A bigger cooler means fewer released fish between visits. Nothing is ever sold for you.</p>
      <h2 id="rods-and-fish-that-get-away">Rods and fish that get away</h2>
      <p>Each rod lands fish up to a weight. A heavier fish breaks free and the story says so: that is the sign a better rod would have landed it. Better rods also bite a little more often.</p>
      <h2 id="waters">Waters</h2>
      <ul>
        <li><strong>{water('millpond').name}</strong>: where everyone starts. Roach, perch and bream, carp at dawn and dusk, eels at night.</li>
        <li><strong>{water('river_bend').name}</strong>: level {water('river_bend').unlockLevel} and the {access('waders').name}. Trout, chub and barbel; pike and zander on the spinner.</li>
        <li><strong>{water('harbour_pier').name}</strong>: level {water('harbour_pier').unlockLevel} and the {access('pier_permit').name}. Sea fish, bigger and worth more; most need the Carbon Rod or better.</li>
      </ul>
      <p>Moving takes one tick, then the angler casts at the new water. You can go back whenever you like.</p>
      <h2 id="the-logbook">The logbook</h2>
      <p>Every species you land is logged with its count and your best weight, and the logbook says which bait, hours and weather it takes. Fish you have not caught show as silhouettes. Three epic fish need the right bait, hour and weather together.</p>
      <h2 id="rankings">Rankings</h2>
      <p>Slow Cast has its own leaderboards by XP, separate from your other games. Released fish earn full XP, so an angler you leave alone still climbs.</p>
      <h2 id="pausing-and-removing">Pausing and removing</h2>
      <p>Pause fishing in Settings: nothing is caught and nothing is lost. Removing the plugin from TRMNL keeps your angler. Deleting Slow Cast progress in Settings removes your angler, cooler and logbook and leaves your account and your other games alone.</p>
      <h2 id="help">Help</h2>
      <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with what your screen shows and when you last saw it change.</p>
    </ProsePage>
  ),
})
