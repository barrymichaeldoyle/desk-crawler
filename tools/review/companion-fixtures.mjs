/**
 * The real companion (shell, Hero, Bag, Rankings, Settings) with fictional data, for phone-width checks. No backend is
 * contacted: queries come from tools/review/fixtures/companion.json plus the variations below, and every mutation
 * settles locally (failing after 1.2 s, or succeeding after 0.8 s with `?ok=1`).
 *
 *   node tools/review/companion-fixtures.mjs && pnpm exec vite --config .previews/submission-companion/vite.config.mjs
 *
 * Then open http://127.0.0.1:4197/app/desk-crawler (or /inventory, /leaderboard, /settings). Query parameters:
 *   status=paused|sleeping|dead|travelling|resting   held=1 (held find, bag full)   slots=30 (gear count)   merchant=1
 *   choice=1 (pending decision)   effects=1   recap=1 (a return tally)   keepsake=done   long=1 (long item names)
 *   quiet=1 (empty log, no achievements)   ok=1 (mutations succeed)   raids=1 (desk raids on, with a record and raid log lines)   public=1 (hero page public)
 *   drawer=N (D111: the desk drawer on, holding N of 6, with the bag full when N > 0)
 *   todo=1 (D112: the to-do list with a done task, an away task and the longest label, plus to-do log lines)   todo=used (the same, swap spent)
 *   /desk-crawler/heroes/<name> serves the public hero page (private=1 reads as not found)
 * The dev deployment's scene art is used when apps/web/.env.local sets VITE_CONVEX_SITE_URL.
 */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '../..')
const directory = resolve(root, '.previews/submission-companion')
mkdirSync(directory, { recursive: true })
const write = (name, body) => writeFileSync(resolve(directory, name), body)
write('index.html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover"><title>Desk Crawler synthetic QA</title></head><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>')
write('styles.css', readFileSync(resolve(root, 'apps/web/src/styles.css'), 'utf8').replace('@import "tailwindcss";', '@import "tailwindcss";\n@source "../../apps/web/src";'))
write('fixture.json', readFileSync(resolve(import.meta.dirname, 'fixtures/companion.json'), 'utf8'))

// A pathname router with the handful of router APIs the companion uses.
write('router.jsx', `import React, { useSyncExternalStore, createContext, useContext } from 'react';
const listeners = new Set();
const notify = () => listeners.forEach((l) => l());
const subscribe = (l) => { listeners.add(l); window.addEventListener('popstate', notify); return () => { listeners.delete(l); window.removeEventListener('popstate', notify) } };
const snapshot = () => location.pathname + location.search + location.hash;
export const useLocation = (options) => { const key = useSyncExternalStore(subscribe, snapshot, snapshot); const loc = { pathname: location.pathname, search: location.search, hash: location.hash, href: key }; return options?.select ? options.select(loc) : loc };
export const createFileRoute = () => (options) => ({ options, useParams: () => ({ alias: decodeURIComponent(location.pathname.replace(/\\/$/, '').split('/').pop()) }) });
export const createRootRouteWithContext = () => (options) => ({ options });
export const useRouter = () => ({ invalidate: async () => {} });
export const useNavigate = () => (to) => { history.pushState(null, '', typeof to === 'string' ? to : to.to); notify() };
const same = (a, b) => a.replace(/\\/$/, '') === b.replace(/\\/$/, '');
export const Link = ({ to, hash, activeOptions, preload, children, className, onClick, ...props }) => {
  const here = useLocation({ select: (l) => l.pathname });
  const href = location.search ? to + location.search + (hash ? '#' + hash : '') : to + (hash ? '#' + hash : '');
  const current = activeOptions?.exact ? same(here, to) : here.startsWith(to);
  return <a href={href} className={className} aria-current={current ? 'page' : undefined} {...props} onClick={(event) => { onClick?.(event); if (event.defaultPrevented || event.metaKey || event.ctrlKey) return; event.preventDefault(); history.pushState(null, '', href); notify(); if (hash) document.getElementById(hash)?.scrollIntoView(); else window.scrollTo(0, 0) }}>{children}</a>;
};
export const OutletContext = createContext(null);
export const Outlet = () => { const Page = useContext(OutletContext); return Page ? <Page /> : null };
`)

// Queries from the fixture; mutations settle locally.
write('data.js', `import fixture from './fixture.json';
import { useCallback, useState } from 'react';
const params = new URLSearchParams(location.search);
const flag = (name) => params.get(name) === '1';
const status = params.get('status');
const held = flag('held');
const many = Number(params.get('slots') || 0);
const long = flag('long');
const data = structuredClone(fixture);
const hero = data.hero, inventory = data.inventory;
if (status) hero.status = status;
if (held) { hero.status = 'sleeping'; hero.wakeAtTick = null }
if (hero.status === 'travelling') { hero.targetBiomeId = 'server_room'; hero.arriveAtTick = hero.world.currentTick + 1 }
if (hero.status === 'dead') { hero.hp = 0; hero.reviveAtTick = hero.world.currentTick + 3 }
if (hero.status === 'resting') hero.hp = Math.round(hero.maxHp * 0.4);
if (flag('choice')) hero.choice = { eventId: 'late_night', title: 'The boss asks for one more hour', prompt: 'The lights are dimming but the report is not done. Stay late for a bonus, or head home?', expiresAtTick: hero.world.currentTick + 4, ticksLeft: 4, defaultOptionId: 'home', options: [{ id: 'stay', label: 'Stay late', change: { gold: 50, hp: -6, potions: 0 } }, { id: 'home', label: 'Head home', change: { gold: 0, hp: 0, potions: 0 } }] };
if (flag('effects')) hero.effects = [{ id: 'coffee', name: 'Coffee rush', blurb: '+3 ATK', kind: 'boon', ticksLeft: 3 }, { id: 'papercut', name: 'Paper cut', blurb: '-2 DEF', kind: 'bane', ticksLeft: 1 }];
if (flag('merchant')) { hero.merchantTicksLeft = 3; inventory.merchant = { offers: [{ id: 'potions', name: 'Three potions', quantity: 3, price: 30 }, { id: 'bag', name: 'Messenger Bag', quantity: 1, price: 400, tierId: 'messenger_bag' }], expiresAtTick: hero.world.currentTick + 3, ticksLeft: 3, biomeId: hero.biomeId } }
if (flag('recap')) data.recap = { ...data.recap, baseline: { at: Date.now() - 36e5 * 26 }, xpGained: 212, levelsGained: 1, newEvents: 19, counters: { combatWins: 7, goldEarned: 43, itemsFound: 2, deaths: 1 } };
if (params.get('keepsake') === 'done') { data.keepsakes.lastClaimWeek = 9999; data.keepsakes.nextAvailableAt = Date.now() + 86400000 * 3 }
if (flag('quiet')) { data.log = []; data.achievements.families.forEach((f) => { f.earned = null }); data.achievements.unlocked = [] }
const raidsOn = flag('raids');
if (flag('public')) hero.publicProfile = true;
data.raids = { record: { launched: 0, won: 0, repelled: 0, lost: 0 }, raids: [] };
if (raidsOn) {
  hero.raidsEnabled = true;
  const pace = { cautious: [0.48, 60], balanced: [0.96, 50], bold: [1.92, 45] };
  hero.stances.forEach((s) => { s.raidsPerDay = pace[s.id][0]; s.raidWinPct = pace[s.id][1] });
  const now = Date.now();
  data.raids = { record: { launched: 9, won: 5, repelled: 4, lost: 3 }, raids: [
    { tick: 905, at: now - 9e5, role: 'target', rivalName: 'Quillfeather_Longname', won: false, gold: 14, hpLost: null, pending: true },
    { tick: 880, at: now - 36e5 * 7, role: 'raider', rivalName: 'Quill', won: true, gold: 14, hpLost: 9, pending: false },
    { tick: 860, at: now - 36e5 * 12, role: 'target', rivalName: 'Hidden player', won: true, gold: 6, hpLost: 3, pending: false },
    { tick: 790, at: now - 36e5 * 30, role: 'raider', rivalName: 'Mo', won: false, gold: 22, hpLost: 27, pending: false },
    { tick: 760, at: now - 36e5 * 40, role: 'target', rivalName: 'Bea', won: false, gold: 1240, hpLost: 30, pending: false },
  ] };
  data.log.unshift(
    { id: 'raid1', at: now - 6e5, tick: 906, kind: 'raid', summary: "Raided [[Quill]]'s desk while they were at lunch.", source: 'tick', deltas: { xpEarned: 0, gold: 14, hp: -9 } },
    { id: 'raid2', at: now - 9e5, tick: 905, kind: 'raid', summary: 'Came back to find [[Quillfeather_Longname]] had been through the drawers.', source: 'tick', deltas: { xpEarned: 0, gold: -1240, hp: -30 } },
    { id: 'raid3', at: now - 12e5, tick: 904, kind: 'death', summary: '[[Mo]] made off with the petty cash. Knocked out for 8 ticks. Lost 30 gold.', source: 'tick', deltas: { xpEarned: 0, gold: -52, hp: -18 } },
  );
}
if (long) inventory.gear.filter((g) => !g.equipped).slice(0, 2).forEach((g) => { g.label = 'Rare Microwave-Slaying ' + g.name + ' of the Cafeteria Depths'; g.rarity = 'rare' });
const templates = ['letter_opener', 'ruler_blade', 'cable_cutter', 'keyboard_mace', 'ladle_of_ruin', 'spork_halberd', 'cardigan', 'lanyard_mail', 'insulated_cardigan', 'anti_static_vest', 'apron_of_warding', 'oven_mitt_plate'];
if (many > 0) {
  const spare = inventory.gear.filter((g) => !g.equipped && !g.held);
  for (let i = spare.length; i < many; i++) { const t = templates[i % templates.length]; const kind = i % 12 < 6 ? 'weapon' : 'armor'; const rarity = ['common', 'uncommon', 'rare', 'epic'][i % 4]; inventory.gear.push({ id: 'f' + i, kind, templateId: t, name: t.replace(/_/g, ' '), label: (rarity === 'common' ? '' : rarity[0].toUpperCase() + rarity.slice(1) + ' ') + t.replace(/_/g, ' '), rarity, requiredLevel: i % 5 === 0 ? 12 : 1, attack: kind === 'weapon' ? 3 + (i % 9) : 0, defense: kind === 'armor' ? 2 + (i % 7) : 0, saleValue: 5 + i, affix: i % 3 === 0 ? { name: 'Vampiric', blurb: 'Heals a little on every hit.' } : null, equipped: false, held: false }) }
  inventory.capacity = Math.max(inventory.capacity, many); inventory.used = many;
}
if (held) { inventory.gear.unshift({ id: 'held', kind: 'weapon', templateId: 'spork_halberd', name: 'Spork Halberd', label: 'Rare Spork Halberd', rarity: 'rare', requiredLevel: 4, attack: 11, defense: 0, saleValue: 19, affix: null, equipped: false, held: true }); inventory.heldItemId = 'held'; inventory.used = inventory.capacity; inventory.canResume = false }
// D111: drawer=N turns the desk drawer on (six slots) and puts N finds in it; any N above 0 means the bag is full.
inventory.gear.forEach((g) => { g.inDrawer = false });
inventory.drawer = { capacity: 0, itemIds: [] };
if (params.has('drawer')) {
  const inDrawer = Math.min(6, Number(params.get('drawer')) || 0);
  inventory.drawer = { capacity: 6, itemIds: [] };
  if (inDrawer > 0) {
    const spare = inventory.gear.filter((g) => !g.equipped && !g.held).length;
    for (let i = spare; i < inventory.capacity; i++) { const t = templates[i % templates.length]; const kind = i % 12 < 6 ? 'weapon' : 'armor'; inventory.gear.push({ id: 'b' + i, kind, templateId: t, name: t.replace(/_/g, ' '), label: t.replace(/_/g, ' '), rarity: 'common', requiredLevel: 1, attack: kind === 'weapon' ? 3 : 0, defense: kind === 'armor' ? 2 : 0, saleValue: 5, affix: null, equipped: false, held: false, inDrawer: false }) }
    inventory.used = inventory.capacity;
  }
  for (let i = 0; i < inDrawer; i++) { const t = templates[(i * 5 + 3) % templates.length]; const kind = (i * 5 + 3) % 12 < 6 ? 'weapon' : 'armor'; const rarity = ['uncommon', 'common', 'rare', 'common', 'epic', 'uncommon'][i]; inventory.gear.push({ id: 'd' + i, kind, templateId: t, name: t.replace(/_/g, ' '), label: (rarity === 'common' ? '' : rarity[0].toUpperCase() + rarity.slice(1) + ' ') + t.replace(/_/g, ' '), rarity, requiredLevel: i === 3 ? 12 : 1, attack: kind === 'weapon' ? 6 + i : 0, defense: kind === 'armor' ? 5 + i : 0, saleValue: 8 + i, affix: rarity === 'epic' ? { name: 'Vampiric', blurb: 'Heals a little on every hit.' } : null, equipped: false, held: false, inDrawer: true }); inventory.drawer.itemIds.push('d' + i) }
  if (held) inventory.canResume = false;
  else if (hero.status === 'sleeping') inventory.canResume = inDrawer < 6;
  data.recap.inDrawer = inDrawer;
}
// D112: todo=1 gives the hero a to-do list with each state the card draws; todo=used spends the swap.
if (params.has('todo')) {
  hero.todo = { swapAvailable: params.get('todo') !== 'used', nextStandupAt: Date.now() + 36e5 * 14, refillHour: 7, tasks: [
    { slot: 0, templateId: 'defeat_monster', label: 'Defeat 3 [[Legacy Mainframes]]', progress: 1, target: 3, reward: 16, done: false, biomeId: 'server_room', local: false },
    { slot: 1, templateId: 'find_gear', label: 'Find 2 pieces of gear', progress: 2, target: 2, reward: 5, done: true, biomeId: null, local: true },
    { slot: 2, templateId: 'explore_biome', label: 'Explore the [[Office Cubicles]] for 40 adventures', progress: 27, target: 40, reward: 5, done: false, biomeId: 'office_cubicles', local: true },
  ] };
  data.log.unshift(
    { id: 'todo1', at: Date.now() - 6e5, tick: 910, kind: 'todo', summary: 'Ticked off: Find 2 pieces of gear.', source: 'tick', deltas: { xpEarned: 0, gold: 5, hp: 0 } },
    { id: 'todo2', at: Date.now() - 36e5 * 3, tick: 899, kind: 'todo', summary: 'Stand-up: Defeat 3 [[Legacy Mainframes]]. Find 2 pieces of gear.', source: 'tick', deltas: { xpEarned: 0, gold: 0, hp: 0 } },
  );
}
const queries = {
  'users:me': () => data.me,
  'heroes:mine': () => hero,
  'inventory:mine': () => inventory,
  'heroes:returnSummary': () => data.recap,
  'achievements:mine': () => data.achievements,
  'keepsakes:mine': () => data.keepsakes,
  'connections:mine': () => data.connections,
  'leaderboard:view': (args) => { const board = data.leaderboard[args.board ?? 'recent_7d']; return args.cohortKey && args.cohortKey !== board.cohortKey ? { ...board, cohortKey: args.cohortKey, own: null, entries: board.entries.slice(0, 6), totalPlayers: 6 } : board },
  'heroes:recentLog': (args) => ({ page: data.log.slice(0, args.paginationOpts.numItems), isDone: true, continueCursor: '' }),
  'trmnlPayload:mine': () => undefined,
  'raids:recent': () => data.raids,
  // The public hero page (D109) from the same fictional hero; raids=1 adds a raid record, private=1 reads as not found.
  'profiles:view': (args) => flag('private') ? null : { alias: args.alias, heroName: hero.name, heroClass: 'warrior', level: hero.level, status: hero.status, biome: 'Server Room', scenePath: hero.scenePath, adventuringSince: Date.now() - 86400000 * 12, rank: { rank: 3, totalPlayers: 41 }, lifetime: { combatWins: hero.counters.combatWins, itemsFound: hero.counters.itemsFound, trips: hero.counters.trips ?? 4, rescues: hero.counters.rescues, epicFinds: hero.counters.epicFinds ?? 1 }, raids: raidsOn ? { won: 5, failed: 4, repelled: 4, lost: 3 } : { won: 0, failed: 0, repelled: 0, lost: 0 }, achievements: data.achievements.families.filter((f) => f.earned).slice(0, 4).map((f) => ({ id: f.earned.id, tier: f.earned.tier, name: f.earned.name, blurb: f.earned.blurb, family: f.name })), rarity: null, achievementCount: data.achievements.unlocked.length },
};
if (raidsOn) data.leaderboard.recent_24h?.entries?.forEach((row, i) => { row.profile = i % 2 === 0 });
export const api = new Proxy({}, { get: (_, module) => new Proxy({}, { get: (_, fn) => module + ':' + fn }) });
export const convexQuery = (fn, args = {}) => ({ queryKey: ['convexQuery', fn, args] });
export const keepPreviousData = (previous) => previous;
export const useQuery = (options) => { const [, fn, args] = options.queryKey; const data = queries[fn] ? queries[fn](args) : undefined; return { data, isPending: false, isPlaceholderData: false, isError: false, refetch: async () => ({ data }) } };
const settle = () => new Promise((resolveIt, reject) => setTimeout(() => (flag('ok') ? resolveIt({ outcome: 'collected', totalCollected: 1 }) : reject(new Error('Synthetic QA: all server mutations are disabled'))), flag('ok') ? 800 : 1200));
export const useMutation = () => useCallback(async () => settle(), []);
export const useAction = () => useCallback(async () => settle(), []);
export const usePaginatedQuery = (fn, args, { initialNumItems }) => { const [count, setCount] = useState(initialNumItems); const page = data.log.slice(0, count); return { results: page, status: page.length < data.log.length ? 'CanLoadMore' : 'Exhausted', loadMore: (n) => setCount((c) => c + n) } };
export const getFunctionName = (fn) => String(fn);
export class ConvexError extends Error { constructor(data) { super(typeof data === 'string' ? data : data?.message); this.data = data } }
export const paginationOptsValidator = {};
`)
write('clerk.jsx', `import React from 'react';
export const Show = ({ when, children }) => (when === 'signed-in' ? <>{children}</> : null);
export const SignInButton = ({ children }) => <>{children}</>;
export const SignUpButton = ({ children }) => <>{children}</>;
export const UserButton = () => <span className="inline-block size-7 rounded-full bg-raised" aria-hidden="true" />;
export const useAuth = () => ({ isLoaded: true, isSignedIn: true });
export const useUser = () => ({ user: null, isLoaded: true });
export const useClerk = () => ({ signOut: async () => {} });
`)
write('analytics.js', 'export const captureAnalytics = () => {}; export const captureAnalyticsException = () => {}; export const analyticsConfigured = () => false; export const openAnalyticsPreferences = () => {};')
write('analyticsProvider.jsx', 'export const useAnalyticsView = () => {}; export const AnalyticsProvider = () => null;')
write('switchAccount.jsx', `import React from 'react'; export const SwitchAccount = () => <p className="text-sm text-muted">Signed in. <button type="button" className="font-semibold text-muted underline underline-offset-4">Switch account</button></p>;`)

write('main.jsx', `import React from 'react';
import { createRoot } from 'react-dom/client';
import { Route as Shell } from '../../apps/web/src/routes/app/desk-crawler';
import { Route as Hero } from '../../apps/web/src/routes/app/desk-crawler/index';
import { Route as Bag } from '../../apps/web/src/routes/app/desk-crawler/inventory';
import { Route as Ranks } from '../../apps/web/src/routes/app/desk-crawler/leaderboard';
import { Route as Settings } from '../../apps/web/src/routes/app/desk-crawler/settings';
import { Route as Profile } from '../../apps/web/src/routes/desk-crawler/heroes.$alias';
import { AuthShell } from '../../apps/web/src/lib/platformShell';
import { NetworkProvider } from '../../apps/web/src/lib/network';
import { OutletContext, useLocation } from './router.jsx';
import './styles.css';
const pages = { '/app/desk-crawler': Hero.options.component, '/app/desk-crawler/inventory': Bag.options.component, '/app/desk-crawler/leaderboard': Ranks.options.component, '/app/desk-crawler/settings': Settings.options.component };
const publicPage = location.pathname.startsWith('/desk-crawler/heroes/');
if (!publicPage && !pages[location.pathname.replace(/\\/$/, '')]) history.replaceState(null, '', '/app/desk-crawler' + location.search);
function App() {
  const pathname = useLocation({ select: (l) => l.pathname.replace(/\\/$/, '') });
  const AppShell = Shell.options.component;
  return <OutletContext.Provider value={pages[pathname] ?? pages['/app/desk-crawler']}><AuthShell><AppShell /></AuthShell></OutletContext.Provider>;
}
document.body.className = 'bg-ground text-ink';
const ProfilePage = Profile.options.component;
createRoot(document.getElementById('root')).render(<NetworkProvider>{publicPage ? <ProfilePage /> : <App />}</NetworkProvider>);
`)
write('vite.config.mjs', `import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const here = (name) => resolve(import.meta.dirname, name);
const env = loadEnv('development', resolve(root, 'apps/web'), 'VITE_');
export default defineConfig({
  root: import.meta.dirname, publicDir: resolve(root, 'apps/web/public'), appType: 'spa', plugins: [react(), tailwind()],
  define: { 'import.meta.env.VITE_CONVEX_SITE_URL': JSON.stringify(env.VITE_CONVEX_SITE_URL ?? '') },
  resolve: { alias: [
    { find: '@tanstack/react-router', replacement: here('router.jsx') },
    { find: '@clerk/tanstack-react-start', replacement: here('clerk.jsx') },
    { find: /^(@convex-dev\\/react-query|@tanstack\\/react-query|convex\\/react|convex\\/server|convex\\/values|@trmnl-games\\/backend\\/api)$/, replacement: here('data.js') },
    { find: /^.*lib\\/analytics$/, replacement: here('analytics.js') },
    { find: /^.*lib\\/analyticsProvider$/, replacement: here('analyticsProvider.jsx') },
    { find: /^.*lib\\/switchAccount$/, replacement: here('switchAccount.jsx') },
  ] },
  server: { host: '0.0.0.0', port: 4197, strictPort: true, fs: { allow: [root] } },
});
`)
console.log('Prepared .previews/submission-companion. Start with pnpm exec vite --config .previews/submission-companion/vite.config.mjs')
