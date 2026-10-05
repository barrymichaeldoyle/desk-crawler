/** Real Bag/Settings components with synthetic data. All mutations fail locally; no backend is contacted. */
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
const root = resolve(import.meta.dirname, '../..')
const directory = resolve(root, '.previews/submission-companion')
mkdirSync(directory, { recursive: true })
const write = (name, body) => writeFileSync(resolve(directory, name), body)
write('index.html', '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Desk Crawler synthetic QA</title></head><body><div id="root"></div><script type="module" src="/main.jsx"></script></body></html>')
write('styles.css', readFileSync(resolve(root, 'apps/web/src/styles.css'), 'utf8').replace('@import "tailwindcss";', '@import "tailwindcss";\n@custom-variant dark (&:where(.dark, .dark *));\n@source "../../apps/web/src";'))
write('router.jsx', `import React from 'react';
export const createFileRoute = () => options => ({ options });
export const Link = ({to, children, ...props}) => <a href={to} {...props}>{children}</a>;
`)
write('data.js', `
const params = new URLSearchParams(location.search);
const long = params.get('long') === '1';
const held = params.get('held') === '1';
const gear = (id, kind, label, equipped=false, held=false) => ({id,kind,label,rarity:'rare',requiredLevel:4,attack:kind==='weapon'?11:0,defense:kind==='armor'?7:0,saleValue:19,equipped,held});
const inventory = {used:held?30:4,capacity:30,canResume:!held,potions:20,gear:[gear('w','weapon','Uncommon Cable Cutter',true),gear('a','armor','Insulated Cardigan',true),gear('s','weapon',long?'Rare Microwave-Slaying Letter Opener':'Rare Letter Opener'),gear('r','armor',long?'Rare Cafeteria Depths Safety Apron':'Rare Safety Apron'),...(held?[gear('h','weapon','Rare Spork Halberd',false,true)]:[])]};
const hero = {simulationState:'healthy',activationState:'active',status:held?'sleeping':'exploring',level:8,biomeId:'server_room',wakeAtTick:null};
const data = {'inventory.mine':inventory,'heroes.mine':hero,'users.me':{user:{publicAlias:'Maximilian_Wolfgangs'}},'connections.mine':[{id:'installation',uuid:'abcdef12-1234-1234-1234-123456789abc',state:'active'}],'keepsakes.mine':{totalCollected:0,lastClaimWeek:null,nextAvailableAt:Date.now()+86400000,connected:true}};
export const api = {inventory:{mine:'inventory.mine',equip:'equip',unequip:'unequip',sellMany:'sellMany',claimHeld:'claimHeld',resumeAdventures:'resumeAdventures'},heroes:{mine:'heroes.mine',pause:'pause',resume:'resume'},users:{me:'users.me'},connections:{mine:'connections.mine',disconnect:'disconnect'},deletion:{requestGameDeletion:'requestGameDeletion'},keepsakes:{mine:'keepsakes.mine',claim:'claim'}};
export const convexQuery = (fn) => ({queryKey:[fn]});
export const useQuery = (options) => ({data:data[options.queryKey[0]]});
export const useMutation = () => async () => {throw new Error('Synthetic QA: all server mutations are disabled')};
`)
write('main.jsx', `import React from 'react';
import {createRoot} from 'react-dom/client';
import {Route as Bag} from '../../apps/web/src/routes/app/desk-crawler/inventory';
import {Route as Settings} from '../../apps/web/src/routes/app/desk-crawler/settings';
import {NetworkProvider} from '../../apps/web/src/lib/network';
import './styles.css';
const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle('dark',params.get('theme')==='dark');
document.body.className='bg-stone-50 text-stone-900 dark:bg-stone-950 dark:text-stone-100';
const Page = params.get('view') === 'settings' ? Settings.options.component : Bag.options.component;
createRoot(document.getElementById('root')).render(<NetworkProvider><div className="mx-auto max-w-3xl px-4 py-8"><p className="mb-8 border-b border-stone-300 pb-4 text-sm dark:border-stone-700">Synthetic QA · fictional data · server actions disabled</p><main className="flex min-w-0 flex-col gap-8"><Page/></main></div></NetworkProvider>);
`)
write('vite.config.mjs', `import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const mock=resolve(import.meta.dirname,'data.js');
export default defineConfig({root:import.meta.dirname,publicDir:resolve(root,'apps/web/public'),plugins:[react(),tailwind()],resolve:{alias:{'@tanstack/react-router':resolve(import.meta.dirname,'router.jsx'),'@convex-dev/react-query':mock,'@tanstack/react-query':mock,'convex/react':mock,'@trmnl-games/backend/api':mock}},server:{host:'127.0.0.1',port:4197,strictPort:true,fs:{allow:[root]}}});
`)
console.log('Prepared .previews/submission-companion. Start with pnpm exec vite --config .previews/submission-companion/vite.config.mjs')
