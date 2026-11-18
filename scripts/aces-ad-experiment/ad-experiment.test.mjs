import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdExperiment, STORAGE_KEY } from './ad-experiment.mjs';

function memoryStore() {
  const values = new Map();
  return { getItem: k => values.has(k) ? values.get(k) : null, setItem: (k, v) => values.set(k, v), removeItem: k => values.delete(k) };
}
function fixture(storage = memoryStore()) {
  let time = 0, id = 0;
  const pending = new Map(), changes = [];
  const clock = { now: () => time, setTimeout: (fn, delay) => { pending.set(++id, { fn, at: time + delay }); return id; }, clearTimeout: key => pending.delete(key) };
  const api = createAdExperiment({ clock, storage, eventTarget: null, onChange: state => changes.push(state) });
  function advance(ms) { time += ms; for (const [key, job] of [...pending]) if (job.at <= time) { pending.delete(key); job.fn(); } }
  return { api, advance, pending, changes, storage };
}
const expected = (status, clicks, simulatedCompletions, persistent = true) => ({ status, clicks, simulatedCompletions, persistent });

test('counts clicks immediately and completion only after five seconds', () => {
  const f = fixture(); f.api.click(); assert.deepEqual(f.api.getState(), expected('running', 1, 0));
  assert.deepEqual(JSON.parse(f.storage.getItem(STORAGE_KEY)), { version: 1, clicks: 1, simulatedCompletions: 0 });
  f.advance(4999); assert.equal(f.api.getState().simulatedCompletions, 0); f.advance(1);
  assert.deepEqual(f.api.getState(), expected('completed', 1, 1)); f.advance(10000);
  assert.equal(f.api.getState().simulatedCompletions, 1);
});
test('counts survive closing and reconstructing; cancelled run does not complete', () => {
  const f = fixture(); f.api.click(); f.advance(3000); f.api.close(); f.advance(10000);
  assert.deepEqual(f.api.getState(), expected('closed', 1, 0));
  f.api.destroy(); const next = fixture(f.storage); assert.deepEqual(next.api.getState(), expected('closed', 1, 0));
  next.api.click(); next.advance(5000); next.api.close();
  assert.deepEqual(fixture(f.storage).api.getState(), expected('closed', 2, 1));
});
test('repeated activations count separately without duplicate completions', () => {
  const f = fixture(); f.api.click(); f.api.click(); f.advance(5000); f.api.click(); f.advance(50000);
  assert.deepEqual(f.api.getState(), expected('completed', 3, 1));
});
test('destroy cancels timer and stale callbacks cannot complete', () => {
  const f = fixture(); f.api.click(); const stale = [...f.pending.values()][0].fn; f.api.close(); f.api.click(); stale();
  assert.equal(f.api.getState().simulatedCompletions, 0); f.api.destroy(); f.advance(5000); stale();
  assert.equal(f.pending.size, 0); assert.equal(f.api.getState().simulatedCompletions, 0);
});
test('early timer callback reschedules', () => {
  const f = fixture(); f.api.click(); const first = [...f.pending.entries()][0]; f.pending.delete(first[0]); first[1].fn();
  f.advance(4999); assert.equal(f.api.getState().simulatedCompletions, 0); f.advance(1); assert.equal(f.api.getState().simulatedCompletions, 1);
});
test('denied reads or writes use clearly marked memory counters without double counting', () => {
  const denied = fixture({ getItem() { throw Error('denied'); } });
  denied.api.click(); denied.advance(5000); assert.deepEqual(denied.api.getState(), expected('completed', 1, 1, false));
  const failedWrite = fixture({ getItem: () => null, setItem() { throw Error('quota'); } });
  failedWrite.api.click(); failedWrite.advance(5000); assert.deepEqual(failedWrite.api.getState(), expected('completed', 1, 1, false));
});
test('corrupt storage is not overwritten, and falls back to session', () => {
  for (const raw of ['broken', '{"version":1,"clicks":-1,"simulatedCompletions":0}', '{"version":1,"clicks":0,"simulatedCompletions":1}']) {
    const store = memoryStore(); store.setItem(STORAGE_KEY, raw); const f = fixture(store);
    f.api.click(); f.advance(5000); assert.deepEqual(f.api.getState(), expected('completed', 1, 1, false)); assert.equal(store.getItem(STORAGE_KEY), raw);
  }
});
test('fresh instances and sequential tabs see latest local values', () => {
  const store = memoryStore(), a = fixture(store), b = fixture(store);
  a.api.click(); b.api.click(); a.advance(5000); b.advance(5000);
  assert.deepEqual(fixture(store).api.getState(), expected('closed', 2, 2));
});
test('storage events update other mounted tabs and listeners are removed', () => {
  const store = memoryStore(); let listener, removed = false; const changes = [];
  const target = { addEventListener: (name, cb) => { assert.equal(name, 'storage'); listener = cb; }, removeEventListener: (name, cb) => { removed = cb === listener; } };
  const api = createAdExperiment({ storage: store, eventTarget: target, onChange: s => changes.push(s) });
  store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, clicks: 4, simulatedCompletions: 2 }));
  listener({ key: STORAGE_KEY, storageArea: store }); assert.deepEqual(api.getState(), expected('closed', 4, 2)); assert.equal(changes.length, 1);
  api.destroy(); assert.equal(removed, true);
});
test('cleared storage during a run cannot persist a completion without its click', () => {
  const f = fixture(); f.api.click(); f.storage.removeItem(STORAGE_KEY); f.advance(5000);
  assert.deepEqual(f.api.getState(), expected('completed', 1, 1, false)); assert.equal(f.storage.getItem(STORAGE_KEY), null);
});
