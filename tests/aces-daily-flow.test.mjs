import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const source=readFileSync(new URL('../soepgames/games/aces-assets/assets/game-bundle.mjs', import.meta.url),'utf8');
function expression(start,end) {
 const i=source.indexOf(start), j=source.indexOf(end,i+start.length);
 assert.ok(i>=0&&j>i,`missing ${start}`);
 return source.slice(i+start.length,j);
}
test('production daily callback advances, finishes, and never writes Bits',()=>{
 const body=expression('Tr=',',sh=R=>');
 let writes=[];const box={e:'DAILY',l:0,r:[1,2,3],a:x=>{box.l=x},v:fn=>{box.g=fn(box.g)},g:0,t:x=>{box.e=x},localStorage:{setItem:(...a)=>writes.push(a)}};
 const complete=vm.runInNewContext('('+body+')',box);
 complete('CONTINUE',{});assert.equal(box.l,1);assert.equal(box.g,1);
 complete('CONTINUE',{});assert.equal(box.l,2);assert.equal(box.g,2);
 complete('CONTINUE',{});assert.equal(box.e,'DAILY_DONE');assert.deepEqual(writes,[]);
});
test('production failure retries the same daily sector without reward or recovery',()=>{
 const start=source.indexOf('sh=R=>{if(e==="DAILY")');
 const end=source.indexOf(',acesStartDaily=()=>',start);
 assert.ok(start>=0&&end>start);
 const body=source.slice(start+3,end);
 let writes=[];const box={e:'DAILY',g:0,deaths:0,_t:fn=>{box.deaths=fn(box.deaths)},v:fn=>{box.g=fn(box.g)},localStorage:{setItem:(...a)=>writes.push(a)}};
 vm.runInNewContext('('+body+')',box)();
 assert.equal(box.e,'DAILY');assert.equal(box.g,1);assert.equal(box.deaths,1);assert.deepEqual(writes,[]);
});
test('daily integrations are present and protect existing adaptation',()=>{
 for(const text of ['id:"hub-daily-start-btn"','id:"daily-complete"','id:"daily-return"','e!=="DAILY"&&(at>2||e==="RECOVERY")','new day at 00:00 UTC','session only · no Bits']) assert.ok(source.includes(text),text);
});
