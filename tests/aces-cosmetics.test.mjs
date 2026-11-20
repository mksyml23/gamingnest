import test from 'node:test';
import assert from 'node:assert/strict';
import {openGuest,openAccount} from '../soepgames/games/aces-assets/assets/core.mjs';
import {catalog,newSkins,change,changeSkin,selected,makeCosmetics} from '../scripts/aces-cosmetics/cosmetics.mjs';
class Storage { constructor(){this.m=new Map()} getItem(k){return this.m.has(k)?this.m.get(k):null} setItem(k,v){this.m.set(k,String(v))} removeItem(k){this.m.delete(k)} key(i){return [...this.m.keys()][i]} get length(){return this.m.size} }
const db=()=>{const docs=new Map();return {docs,transaction:async fn=>fn({read:async(uid,key)=>docs.get(uid+key)??null,write:async(uid,key,v)=>docs.set(uid+key,structuredClone(v))})}};
const init=(b,n=50000)=>{b.setItem('aces_bits',String(n));b.setItem('aces_unlocked_skins',JSON.stringify(['default','cyber_emerald']));b.setItem('aces_active_skin','cyber_emerald')};
test('catalog unique, affordable through to expensive, legacy names untouched',()=>{assert.equal(newSkins.length,10);assert.equal(new Set(newSkins.map(x=>x.id)).size,10);assert.equal(catalog.bg.length,7);assert.equal(catalog.theme.length,7);assert.ok(newSkins.some(x=>x.costBits>=30000));});
test('guest purchase, equip, defaults, duplicate, low balance and bad data',()=>{
 const raw=new Storage(),g=openGuest(raw);init(g,9000);
 let r=change(g,'bg','nebula');assert.equal(r.bits,7500);assert.equal(selected(r.inventory,'bg'),'nebula');
 r=change(g,'bg','nebula');assert.equal(r.bits,7500);
 r=change(g,'theme','violet');assert.equal(r.bits,4500);assert.equal(selected(r.inventory,'theme'),'violet');assert.equal(selected(r.inventory,'bg'),'nebula');
 r=change(g,'bg','default');assert.equal(selected(r.inventory,'bg'),'default');assert.ok(r.inventory.includes('cosmetic:bg:nebula'));
 assert.throws(()=>change(g,'theme','gold'),/Not enough/);assert.equal(g.getItem('aces_bits'),'4500');
 r=changeSkin(g,newSkins[0]);assert.equal(r.bits,3700);assert.equal(g.getItem('aces_active_skin'),'prism_ice');changeSkin(g,newSkins[0]);assert.equal(g.getItem('aces_bits'),'3700');
 assert.equal(g.getItem('aces_active_skin'),'prism_ice');assert.ok(JSON.parse(g.getItem('aces_unlocked_skins')).includes('cyber_emerald'));
 g.setItem('aces_bits','bad');assert.throws(()=>change(g,'bg','grid'),/Invalid Bits/);assert.equal(g.getItem('aces_bits'),'bad');
 g.setItem('aces_bits','1000');g.setItem('aces_unlocked_skins','bad');assert.throws(()=>change(g,'bg','grid'));assert.equal(g.getItem('aces_unlocked_skins'),'bad');
});
test('guest write failure restores inventory and balance',()=>{const raw=new Storage(),g=openGuest(raw);init(g,9000);const before=g.getItem('aces_unlocked_skins');const orig=raw.setItem.bind(raw);let fail=true;raw.setItem=(k,v)=>{if(fail&&k.endsWith('aces_bits')){fail=false;throw Error('full')}orig(k,v)};assert.throws(()=>change(g,'bg','grid'));assert.equal(g.getItem('aces_unlocked_skins'),before);assert.equal(g.getItem('aces_bits'),'9000');});
test('account purchases sync together and reload on another device',async()=>{
 const store=new Storage(),database=db();let a=await openAccount({uid:'synthetic',writerId:'one',db:database,storage:store});init(a,10000);await a.wait();
 change(a,'theme','violet');change(a,'bg','nebula');changeSkin(a,newSkins[0]);await a.wait();a.close();
 const b=await openAccount({uid:'synthetic',writerId:'two',db:database,storage:new Storage()});const inv=JSON.parse(b.getItem('aces_unlocked_skins'));
 assert.equal(b.getItem('aces_bits'),'4700');assert.equal(b.getItem('aces_active_skin'),'prism_ice');assert.equal(selected(inv,'bg'),'nebula');assert.equal(selected(inv,'theme'),'violet');assert.ok(inv.includes('cyber_emerald'));
 const other=await openAccount({uid:'different',writerId:'three',db:database,storage:new Storage()});assert.equal(other.getItem('aces_bits'),null);
});
test('old inventory defaults; invalid active markers cannot equip unowned',()=>{assert.equal(selected(['default','cyber_emerald'],'bg'),'default');assert.equal(selected(['cosmetic:active:theme:gold'],'theme'),'default');});
test('localized catalog renders and background/theme effects use safe named IDs',()=>{const react={useEffect:()=>{}};const jsx={jsx:(tag,props)=>({tag,props}),jsxs:(tag,props)=>({tag,props})};let node=makeCosmetics(react,jsx)({inventory:['default'],bits:1000,lang:'en',onChange:()=>{}});const s=JSON.stringify(node);assert.match(s,/BACKGROUNDS/);assert.match(s,/SYSTEM THEMES/);assert.match(s,/Quantum Grid/);node=makeCosmetics(react,jsx)({inventory:['default'],bits:1000,lang:'nl',onChange:()=>{}});assert.match(JSON.stringify(node),/ACHTERGRONDEN/);});
