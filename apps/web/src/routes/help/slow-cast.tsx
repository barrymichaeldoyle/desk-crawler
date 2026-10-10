import { createFileRoute } from '@tanstack/react-router'
import { contentV1 } from '@trmnl-games/slow-cast/content'
import { TITLES } from '@trmnl-games/slow-cast/sim'
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
  ['the-logbook', 'The logbook and titles'],
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
        <li>Sign in to TRMNL Games and connect the installation. Your angler uses your public name.</li>
        <li>Back in TRMNL, click Save. Your angler casts the first line within fifteen minutes.</li>
        <li>Add the plugin to a playlist or a mashup. All four layout sizes are supported in both orientations.</li>
      </ul>
      <h2 id="how-fishing-works">How fishing works</h2>
      <p>Every fifteen minutes, day and night, your angler casts once. Sometimes a fish bites. Which fish depends on the water, the bait, the time of day and the weather. Its weight decides its price, whether it is a personal best and where it lands on the boards. Your TRMNL shows the scene, the latest stories and this week's board for your water. You never have to open the companion: come by to sell your catch, buy bait or try another water.</p>
      <h2 id="time-and-weather">Time and weather</h2>
      <p>Dawn runs from 05:00 to 08:00, day to 17:00, dusk to 20:00, then night, in the timezone your TRMNL reports. Fish feed more at dawn and dusk. Weather is the same for every angler at a water and changes every six hours: clear, overcast, rain, wind or fog. Overcast and rain bring more bites at River Bend, wind brings fewer, and fog makes dawn and dusk dark enough for night fish.</p>
      <h2 id="bait">Bait</h2>
      <p>Each water takes its own baits, and the bait decides which fish can bite; the Shop says which fish take each one. Choose the bait to fish with on the Dock page. Each fish you keep, or that gets away, uses one bait. A cast with no bite uses none, and neither does a fish released from a full cooler. With no bait for the water the angler fishes a bare hook, which gets fewer bites and only small fish. Buy bait in tubs in the Shop, up to 72 of each; bait never spoils.</p>
      <h2 id="the-cooler">The cooler</h2>
      <p>Fish go in the cooler until you sell them. When it is full the angler keeps fishing and releases what it catches. Released fish still go in the logbook, count for achievements and can top the boards, but earn no gold. Your TRMNL says when the cooler is full, and its QR code opens the cooler. A bigger cooler means fewer released fish between visits. Nothing is ever sold for you.</p>
      <h2 id="rods-and-fish-that-get-away">Rods and fish that get away</h2>
      <p>Each rod lands fish up to a weight. A heavier fish breaks free, and the story says something heavy got away. A better rod would have landed it. Better rods also get a few more bites.</p>
      <h2 id="waters">Waters</h2>
      <ul>
        <li><strong>{water('millpond').name}</strong>: where everyone starts. Roach, perch and bream, carp at dawn and dusk, eels at night.</li>
        <li><strong>{water('river_bend').name}</strong>: opens once {water('river_bend').opensAfter!.species} Millpond species are in your logbook, with the {access('waders').name}. Trout, chub and barbel, and pike and zander on the spinner.</li>
        <li><strong>{water('harbour_pier').name}</strong>: opens once {water('harbour_pier').opensAfter!.species} River Bend species are in your logbook, with the {access('pier_permit').name}. Sea fish, bigger and worth more. Most need the Carbon Rod or better.</li>
      </ul>
      <p>Moving skips one cast, then the angler fishes the new water. If the bait you are using does not work there, the angler switches to the bait you hold most of that does. You can go back whenever you like.</p>
      <h2 id="the-logbook">The logbook and titles</h2>
      <p>Every species you land is logged with its count and your best weight, and the logbook says which bait, hours and weather it takes. Fish you have not caught show as silhouettes with their bait, except the epics. Three epic fish need the right bait, hour and weather together.</p>
      <p>The logbook is how you progress. New species open the next water, and they earn your title: {TITLES.slice(1).map((t) => `${t.name} at ${t.species} species`).join(', ')}. Everyone starts as a {TITLES[0].name}. Slow Cast has no XP or levels.</p>
      <h2 id="rankings">Rankings</h2>
      <p>Each water has its own board: the heaviest fish each angler has landed there, kept or released. One board runs for the week and starts again every Monday at 00:00 UTC; the other keeps the all-time records. Your TRMNL shows this week's board for the water you are fishing, and the companion shows them all.</p>
      <h2 id="pausing-and-removing">Pausing and removing</h2>
      <p>Pause fishing under Settings on the More page: no catches until you resume, and you keep everything. Removing the plugin from TRMNL keeps your angler. Deleting Slow Cast progress under Settings removes your angler, cooler and logbook and leaves your account and your other games alone.</p>
      <h2 id="help">Help</h2>
      <p>Email <a href={`mailto:${SUPPORT_EMAIL}`}>{SUPPORT_EMAIL}</a> with what your screen shows and when you last saw it change.</p>
    </ProsePage>
  ),
})
