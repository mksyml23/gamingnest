import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
import {makeAdExperimentShop} from '../../soepgames/games/aces-assets/assets/ad-experiment-shop.mjs';
const path = new URL('../../soepgames/games/aces-assets/assets/game-bundle.mjs', import.meta.url);
const source = readFileSync(path,'utf8');
const fakeReact={useState:()=>[{status:'completed',seconds:0,clicks:987,persistent:true},()=>{}],useRef:x=>({current:x}),useEffect:()=>{}};
const jsx={jsx:(tag,props)=>({tag,props}),jsxs:(tag,props)=>({tag,props})};
function strings(node) { if(typeof node==='string')return [node]; if(Array.isArray(node))return node.flatMap(strings); if(!node || typeof node!=='object')return []; return [node.props?.['aria-label'],...strings(node.props?.children)].filter(Boolean); }
test('English and Dutch UI labels and completion do not expose counts or claim an actual ad',()=>{
 for(const [lang, required] of [['en',['Watch ad for 100 Bits (5 sec)','No ad is playing yet.','Done: +100 Bits!']],['nl',['Bekijk advertentie voor 100 Bits (5 sec)','Er wordt nog geen advertentie afgespeeld.','Klaar: +100 Bits!']]]){
   const text=strings(makeAdExperimentShop(fakeReact,jsx)({lang,onReward:()=>true})).join(' ');
   for(const s of required) assert.ok(text.includes(s),text);
   assert.doesNotMatch(text,/simulation|simulatie|987|25 Bits/i);
 }
});
test('actual production callback increments saved Bits by 100 and fails closed on storage error',()=>{
 const match=source.match(/onAdReward:(\(\)=>\{const R=S\+100;try\{localStorage\.setItem\("aces_bits",R\.toString\(\)\);te\(R\);return !0\}catch\{return !1\}\})/);
 assert.ok(match,'production reward handler must match');
 let saved,rendered;const sandbox={S:37,localStorage:{setItem:(key,value)=>{assert.equal(key,'aces_bits');saved=value;}},te:v=>{rendered=v}};
 assert.equal(vm.runInNewContext('('+match[1]+')()',sandbox),true);assert.equal(saved,'137');assert.equal(rendered,137);
 sandbox.localStorage.setItem=()=>{throw Error('unavailable')};rendered=undefined;
 assert.equal(vm.runInNewContext('('+match[1]+')()',sandbox),false);assert.equal(rendered,undefined);
});
