import test from 'node:test';
import assert from 'node:assert/strict';
import { createAdExperiment, STORAGE_KEY } from '../../soepgames/games/aces-assets/assets/ad-experiment.mjs';
function fixture({ reward = () => true } = {}) {
  let time = 0, id = 0, paid = 0;
  const jobs = new Map(), listeners = new Map(), data = new Map();
  const visibility = { hidden: false, addEventListener: (n,f) => listeners.set(n,f), removeEventListener: n => listeners.delete(n) };
  const storage = { getItem: k => data.get(k) ?? null, setItem: (k,v) => data.set(k,v) };
  const clock = { now: () => time, setTimeout: (fn, ms) => { jobs.set(++id,{fn,at:time+ms}); return id; }, clearTimeout: key => jobs.delete(key) };
  const api = createAdExperiment({clock,storage,visibility,eventTarget:null,onReward:()=>{paid++;return reward();}});
  function advance(ms) { const end=time+ms; while(true) { const entry=[...jobs].sort((a,b)=>a[1].at-b[1].at)[0]; if(!entry || entry[1].at>end) break; time=entry[1].at; jobs.delete(entry[0]); entry[1].fn(); } time=end; }
  function hidden(v) { visibility.hidden=v; listeners.get('visibilitychange')(); }
  return {api,advance,hidden,storage,paid:()=>paid,jobs};
}
test('5 visible seconds pay once; repeated activation and stale timers cannot duplicate',()=>{ const f=fixture(); f.api.click(); f.api.click(); f.advance(4999); assert.equal(f.paid(),0); assert.equal(f.api.getState().seconds,1); f.advance(1); assert.equal(f.api.getState().status,'completed'); assert.equal(f.paid(),1); f.advance(5000); f.api.click(); assert.equal(f.paid(),1); const counter=JSON.parse(f.storage.getItem(STORAGE_KEY)); assert.equal(counter.clicks,1); assert.equal(counter.simulatedCompletions,0); });
test('early close and destroy cancel pending reward',()=>{ for(const action of ['close','destroy']) { const f=fixture(); f.api.click(); f.advance(2000); const stale=[...f.jobs.values()][0].fn; f.api[action](); f.advance(20000); stale(); assert.equal(f.paid(),0); } });
test('hidden time does not count and reward waits until visible',()=>{const f=fixture();f.api.click();f.advance(2200);f.hidden(true);const seconds=f.api.getState().seconds;f.advance(20000);assert.equal(f.paid(),0);assert.equal(f.api.getState().seconds,seconds);f.hidden(false);f.advance(2799);assert.equal(f.paid(),0);f.advance(1);assert.equal(f.paid(),1);});
test('failed save reports failure and does not retry',()=>{const f=fixture({reward:()=>false});f.api.click();f.advance(5000);assert.equal(f.api.getState().status,'failed');f.advance(5000);assert.equal(f.paid(),1);});
