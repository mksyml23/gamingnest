import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createAdExperiment } from './ad-experiment.mjs';

function fixture() {
  let time = 0;
  let id = 0;
  const pending = new Map();
  const changes = [];
  const clock = {
    now: () => time,
    setTimeout: (fn, delay) => { pending.set(++id, { fn, at: time + delay }); return id; },
    clearTimeout: (key) => pending.delete(key),
  };
  const api = createAdExperiment({ clock, onChange: (state) => changes.push(state) });
  function advance(ms) {
    time += ms;
    for (const [key, job] of [...pending]) if (job.at <= time) { pending.delete(key); job.fn(); }
  }
  return { api, advance, pending, changes };
}

test('counts clicks separately, waits five seconds, completes exactly once', () => {
  const { api, advance, changes } = fixture();
  api.click();
  assert.deepEqual(api.getState(), { status: 'running', clicks: 1, simulatedCompletions: 0 });
  advance(4999);
  assert.equal(api.getState().simulatedCompletions, 0);
  advance(1);
  assert.deepEqual(api.getState(), { status: 'completed', clicks: 1, simulatedCompletions: 1 });
  advance(9999);
  assert.equal(api.getState().simulatedCompletions, 1);
  assert.equal(changes.length, 2);
});

test('close cancels completion; a new click starts another run', () => {
  const { api, advance } = fixture();
  api.click(); advance(3000); api.close(); advance(10000);
  assert.deepEqual(api.getState(), { status: 'closed', clicks: 1, simulatedCompletions: 0 });
  api.click(); advance(5000);
  assert.deepEqual(api.getState(), { status: 'completed', clicks: 2, simulatedCompletions: 1 });
});

test('repeated clicks while open are counted but do not start multiple completions', () => {
  const { api, advance } = fixture();
  api.click(); api.click(); advance(5000); api.click(); advance(5000);
  assert.deepEqual(api.getState(), { status: 'completed', clicks: 3, simulatedCompletions: 1 });
});

test('destroy cancels timers and never emits after teardown', () => {
  const { api, advance, pending, changes } = fixture();
  api.click(); api.destroy(); advance(5000); api.click(); api.close();
  assert.equal(pending.size, 0);
  assert.equal(changes.length, 1);
});

test('each fresh instance starts with zero in-memory counters', () => {
  const a = fixture(); a.api.click(); a.advance(5000);
  assert.deepEqual(fixture().api.getState(), { status: 'closed', clicks: 0, simulatedCompletions: 0 });
});

test('stale timer callbacks cannot complete a cancelled run', () => {
  const { api, pending, advance } = fixture();
  api.click(); const stale = [...pending.values()][0].fn; api.close(); api.click();
  stale();
  assert.equal(api.getState().simulatedCompletions, 0);
  advance(5000);
  assert.equal(api.getState().simulatedCompletions, 1);
});

test('early timer callback reschedules until five seconds have elapsed', () => {
  const { api, pending, advance } = fixture();
  api.click(); const first = [...pending.entries()][0]; pending.delete(first[0]); first[1].fn();
  assert.equal(api.getState().simulatedCompletions, 0);
  advance(4999); assert.equal(api.getState().simulatedCompletions, 0);
  advance(1); assert.equal(api.getState().simulatedCompletions, 1);
});
