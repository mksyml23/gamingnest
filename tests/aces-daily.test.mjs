import test from 'node:test';
import assert from 'node:assert/strict';
import {dailySectors, utcDay} from '../scripts/aces-daily.mjs';
const pools = [['T1','T2','T3'],['K1','K2','K3','K4','K5','K6'],['M1','M2','M4','M5','M6']];
test('same UTC day is deterministic everywhere, including midnight boundary',()=>{
  const a=dailySectors(pools,new Date('2026-01-01T00:00:00Z'));
  assert.deepEqual(a,dailySectors(pools,new Date('2025-12-31T19:00:00-05:00')));
  assert.deepEqual(a,dailySectors(pools,new Date('2026-01-01T23:59:59Z')));
  assert.notDeepEqual(a.sectors,dailySectors(pools,new Date('2026-01-02T00:00:00Z')).sectors);
  assert.equal(utcDay(new Date('2026-01-01T00:59:00+01:00')),'2025-12-31');
});
test('selection covers all candidate sectors and validates inputs',()=>{
  const seen=pools.map(()=>new Set());
  for(let n=0;n<270;n++) dailySectors(pools,new Date(n*86400000)).sectors.forEach((v,i)=>seen[i].add(v));
  seen.forEach((v,i)=>assert.equal(v.size,pools[i].length));
  assert.throws(()=>dailySectors([[]],new Date()));
  assert.throws(()=>utcDay(new Date(NaN)));
});
