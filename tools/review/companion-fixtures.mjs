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
const many = Number(params.get('slots') || 0);
const templates = ['letter_opener','ruler_blade','cable_cutter','keyboard_mace','ladle_of_ruin','spork_halberd','cardigan','lanyard_mail','insulated_cardigan','anti_static_vest','apron_of_warding','oven_mitt_plate'];
const gear = (id, kind, label, equipped=false, held=false, extra={}) => ({id,kind,templateId:kind==='weapon'?'cable_cutter':'insulated_cardigan',label,rarity:'rare',requiredLevel:4,attack:kind==='weapon'?11:0,defense:kind==='armor'?7:0,saleValue:19,affix:null,equipped,held,...extra});
const filler = Array.from({length: many}, (_, i) => { const t = templates[i % templates.length]; const kind = i % 12 < 6 ? 'weapon' : 'armor'; const rarity = ['common','uncommon','rare','epic'][i % 4]; return gear('f'+i, kind, (rarity==='common'?'':rarity[0].toUpperCase()+rarity.slice(1)+' ')+t.replace(/_/g,' '), false, false, {templateId:t, rarity, requiredLevel: i % 5 === 0 ? 12 : 1, attack: kind==='weapon'? 3 + (i % 9) : 0, defense: kind==='armor' ? 2 + (i % 7) : 0, saleValue: 5 + i, affix: i % 3 === 0 ? {name:'Vampiric', blurb:'Heals a little on every hit.'} : null}); });
const capacity = many > 0 ? Math.max(30, many) : 30;
const used = held ? capacity : (many > 0 ? many : 4);
const inventory = {used,capacity,canResume:!held,potions:20,weaponId:'w',armorId:'a',heldItemId:held?'h':null,
  ladder:{name:'Rolling Suitcase',next:{id:'crate',name:'Shipping Crate',capacity:40,price:5000,milestoneLevel:16,milestoneAdventures:null,buyable:true,lockedUntilLevel:null}},
  pouch:{name:'Thermos',cap:20,next:{id:'lunchbox',name:'Lunchbox',cap:30,price:120,milestoneLevel:6,buyable:true,lockedUntilLevel:null}},
  merchant: params.get('merchant') === '1' ? {offers:[{id:'potions',name:'Three potions',quantity:3,price:30},{id:'bag',name:'Shipping Crate',quantity:1,price:4000,tierId:'crate'}],expiresAtTick:10,ticksLeft:3,biomeId:'server_room'} : null,
  gear:[gear('w','weapon','Uncommon Cable Cutter',true),gear('a','armor','Insulated Cardigan',true),gear('s','weapon',long?'Rare Microwave-Slaying Letter Opener':'Rare Letter Opener',false,false,{templateId:'letter_opener'}),gear('r','armor',long?'Rare Cafeteria Depths Safety Apron':'Rare Safety Apron',false,false,{templateId:'apron_of_warding'}),...(held?[gear('h','weapon','Rare Spork Halberd',false,true,{templateId:'spork_halberd'})]:[]),...filler]};
const hero = {simulationState:'healthy',activationState:'active',status:held?'sleeping':(params.get('status')||'exploring'),level:8,maxHp:136,gold:250,biomeId:'server_room',wakeAtTick:null,biomes:[{id:'office_cubicles',name:'Office Cubicles',unlocked:true},{id:'server_room',name:'Server Room',unlocked:true},{id:'cafeteria_depths',name:'Cafeteria Depths',unlocked:false}]};
const data = {'inventory.mine':inventory,'heroes.mine':hero,'users.me':{user:{publicAlias:'Maximilian_Wolfgangs'}},'connections.mine':[{id:'installation',uuid:'abcdef12-1234-1234-1234-123456789abc',state:'active'}],'keepsakes.mine':{totalCollected:0,lastClaimWeek:null,nextAvailableAt:Date.now()+86400000,connected:true}};
export const api = {inventory:{mine:'inventory.mine',equip:'equip',unequip:'unequip',sellMany:'sellMany',claimHeld:'claimHeld',resumeAdventures:'resumeAdventures',buyBag:'buyBag',buyPouch:'buyPouch',buyOffer:'buyOffer'},heroes:{mine:'heroes.mine',pause:'pause',resume:'resume'},users:{me:'users.me'},connections:{mine:'connections.mine',disconnect:'disconnect'},deletion:{requestGameDeletion:'requestGameDeletion'},keepsakes:{mine:'keepsakes.mine',claim:'claim'}};
export const convexQuery = (fn) => ({queryKey:[fn]});
export const useQuery = (options) => ({data:data[options.queryKey[0]]});
export const useMutation = () => async () => { await new Promise((r) => setTimeout(r, 1200)); throw new Error('Synthetic QA: all server mutations are disabled') };
export const getFunctionName = (fn) => String(fn);
export class ConvexError extends Error {}
`)
write('analytics.js', 'export const captureAnalytics = () => {}; export const captureAnalyticsException = () => {};')
write('main.jsx', `import React from 'react';
import {createRoot} from 'react-dom/client';
import {Route as Bag} from '../../apps/web/src/routes/app/desk-crawler/inventory';
import {Route as Settings} from '../../apps/web/src/routes/app/desk-crawler/settings';
import {NetworkProvider} from '../../apps/web/src/lib/network';
import './styles.css';
const params = new URLSearchParams(location.search);
document.documentElement.classList.toggle('dark',params.get('theme')==='dark');
document.body.className='bg-ground text-ink';
const Page = params.get('view') === 'settings' ? Settings.options.component : Bag.options.component;
createRoot(document.getElementById('root')).render(<NetworkProvider><div className="mx-auto max-w-3xl px-4 py-8"><p className="mb-8 border-b border-rule pb-4 text-sm">Synthetic QA · fictional data · server actions disabled</p><main className="flex min-w-0 flex-col gap-8"><Page/></main></div></NetworkProvider>);
`)
write('vite.config.mjs', `import {defineConfig} from 'vite';
import react from '@vitejs/plugin-react';
import tailwind from '@tailwindcss/vite';
import {resolve} from 'node:path';
const root=resolve(import.meta.dirname,'../..');
const mock=resolve(import.meta.dirname,'data.js');
export default defineConfig({root:import.meta.dirname,publicDir:resolve(root,'apps/web/public'),plugins:[react(),tailwind()],resolve:{alias:{'@tanstack/react-router':resolve(import.meta.dirname,'router.jsx'),'@convex-dev/react-query':mock,'@tanstack/react-query':mock,'convex/react':mock,'@trmnl-games/backend/api':mock,'convex/server':mock,'convex/values':mock,'../../../lib/analytics':resolve(import.meta.dirname,'analytics.js')}},server:{host:'127.0.0.1',port:4197,strictPort:true,fs:{allow:[root]}}});
`)
console.log('Prepared .previews/submission-companion. Start with pnpm exec vite --config .previews/submission-companion/vite.config.mjs')
