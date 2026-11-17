// Preview-only, browser-local counters. No network, Firebase, ads, or rewards.
export const STORAGE_KEY = 'gamingnest.aces.preview.adExperiment.v1';

export function createAdExperiment({ onChange = () => {}, clock = {}, storage = undefined, eventTarget = globalThis } = {}) {
  const now = clock.now || (() => performance.now());
  const schedule = clock.setTimeout || ((fn, ms) => globalThis.setTimeout(fn, ms));
  const cancel = clock.clearTimeout || ((id) => globalThis.clearTimeout(id));
  let clicks = 0, simulatedCompletions = 0, persistent = true;
  let status = 'closed', timer = null, startedAt = 0, generation = 0, destroyed = false;
  let store;
  const state = () => Object.freeze({ status, clicks, simulatedCompletions, persistent });
  const emit = () => onChange(state());
  function readCounts() {
    const raw = store.getItem(STORAGE_KEY);
    if (raw === null) return { clicks: 0, simulatedCompletions: 0 };
    const data = JSON.parse(raw);
    if (!data || data.version !== 1 || !Number.isSafeInteger(data.clicks) || data.clicks < 0 ||
        !Number.isSafeInteger(data.simulatedCompletions) || data.simulatedCompletions < 0 ||
        data.simulatedCompletions > data.clicks) throw new Error('Invalid local counter data');
    return data;
  }
  try {
    store = storage === undefined ? globalThis.localStorage : storage;
    if (!store) throw new Error('Local storage unavailable');
    ({ clicks, simulatedCompletions } = readCounts());
  } catch { persistent = false; }

  function update(field) {
    let incremented = false;
    if (persistent) {
      try {
        const latest = readCounts();
        if (field === 'simulatedCompletions' && latest.simulatedCompletions >= latest.clicks) throw new Error('Click history was removed');
        ({ clicks, simulatedCompletions } = latest);
        if ((field === 'clicks' ? clicks : simulatedCompletions) >= Number.MAX_SAFE_INTEGER) throw new Error('Counter limit');
        if (field === 'clicks') clicks++; else simulatedCompletions++;
        incremented = true;
        store.setItem(STORAGE_KEY, JSON.stringify({ version: 1, clicks, simulatedCompletions }));
      } catch { persistent = false; }
    }
    if (!incremented) {
      if (field === 'clicks') clicks = Math.min(Number.MAX_SAFE_INTEGER, clicks + 1);
      else simulatedCompletions = Math.min(Number.MAX_SAFE_INTEGER, simulatedCompletions + 1);
    }
  }
  function onStorage(event) {
    if (!persistent || (event.key !== STORAGE_KEY && event.key !== null) || (event.storageArea && event.storageArea !== store)) return;
    try {
      const latest = readCounts();
      if (status === 'running' && latest.clicks <= latest.simulatedCompletions) throw new Error('Click history was removed');
      ({ clicks, simulatedCompletions } = latest);
    } catch { persistent = false; }
    emit();
  }
  try { eventTarget?.addEventListener?.('storage', onStorage); } catch { /* event support is optional */ }

  function finishWhenReady(run) {
    if (destroyed || status !== 'running' || run !== generation) return;
    const remaining = 5000 - (now() - startedAt);
    if (remaining > 0) { timer = schedule(() => finishWhenReady(run), remaining); return; }
    timer = null;
    status = 'completed';
    update('simulatedCompletions');
    emit();
  }
  return {
    click() {
      if (destroyed) return;
      update('clicks');
      if (status === 'closed') {
        status = 'running'; startedAt = now();
        const run = ++generation;
        timer = schedule(() => finishWhenReady(run), 5000);
      }
      emit();
    },
    close() {
      if (destroyed || status === 'closed') return;
      ++generation;
      if (timer !== null) cancel(timer);
      timer = null; status = 'closed'; emit();
    },
    getState: state,
    destroy() {
      if (destroyed) return;
      destroyed = true; ++generation;
      if (timer !== null) cancel(timer);
      timer = null; status = 'closed';
      try { eventTarget?.removeEventListener?.('storage', onStorage); } catch { /* optional */ }
    },
  };
}
