// Preview-only simulation. The online counter is attached separately to trusted start clicks.
export const STORAGE_KEY = 'gamingnest.aces.preview.adExperiment.v1';
export function createAdExperiment({ onChange = () => {}, onReward = () => false, clock = {}, storage, visibility = globalThis.document, eventTarget = globalThis } = {}) {
  const now = clock.now || (() => performance.now());
  const schedule = clock.setTimeout || ((fn, ms) => setTimeout(fn, ms));
  const cancel = clock.clearTimeout || (id => clearTimeout(id));
  let status = 'closed', remaining = 10000, last = 0, timer = null, generation = 0, destroyed = false;
  let clicks = 0, persistent = true, store;
  try {
    store = storage === undefined ? globalThis.localStorage : storage;
    const raw = store.getItem(STORAGE_KEY);
    if (raw !== null) {
      const data = JSON.parse(raw);
      if (data.version !== 1 || !Number.isSafeInteger(data.clicks) || data.clicks < 0 || !Number.isSafeInteger(data.simulatedCompletions) || data.simulatedCompletions < 0 || data.simulatedCompletions > data.clicks) throw Error('Invalid counter');
      clicks = data.clicks;
    }
  } catch { persistent = false; }
  const state = () => Object.freeze({ status, seconds: Math.ceil(remaining / 1000), clicks, persistent });
  const emit = () => onChange(state());
  function countClick() {
    if (persistent) {
      try {
        const raw = store.getItem(STORAGE_KEY);
        const old = raw === null ? { version: 1, clicks: 0, simulatedCompletions: 0 } : JSON.parse(raw);
        if (old.version !== 1 || !Number.isSafeInteger(old.clicks) || old.clicks < 0 || old.clicks >= Number.MAX_SAFE_INTEGER || !Number.isSafeInteger(old.simulatedCompletions) || old.simulatedCompletions < 0 || old.simulatedCompletions > old.clicks) throw Error('Invalid counter');
        const next = old.clicks + 1;
        store.setItem(STORAGE_KEY, JSON.stringify({ ...old, clicks: next }));
        clicks = next;
        return;
      } catch { persistent = false; }
    }
    clicks = Math.min(clicks + 1, Number.MAX_SAFE_INTEGER);
  }
  function tick(run) {
    if (destroyed || run !== generation || status !== 'running') return;
    timer = null;
    if (!visibility?.hidden) {
      const t = now();
      remaining = Math.max(0, remaining - Math.max(0, t - last));
      last = t;
      if (remaining === 0) {
        // Mark before invoking the callback: stale timers and re-entrancy cannot pay twice.
        status = 'finishing';
        let paid = false;
        try { paid = onReward() === true; } catch { /* no reward if local save fails */ }
        status = paid ? 'completed' : 'failed';
        emit();
        return;
      }
      timer = schedule(() => tick(run), Math.min(200, remaining));
    }
    emit();
  }
  function onVisibility() {
    if (destroyed || status !== 'running') return;
    if (timer !== null) { cancel(timer); timer = null; }
    if (visibility?.hidden) {
      // Attribute time only up to the visibility change, and never pay while hidden.
      remaining = Math.max(0, remaining - Math.max(0, now() - last));
      emit();
    } else { last = now(); tick(generation); }
  }
  function close() {
    if (destroyed || status === 'closed') return;
    ++generation;
    if (timer !== null) cancel(timer);
    timer = null; status = 'closed'; emit();
  }
  visibility?.addEventListener?.('visibilitychange', onVisibility);
  eventTarget?.addEventListener?.('pagehide', close);
  return {
    click() {
      if (destroyed || status !== 'closed') return;
      countClick(); status = 'running'; remaining = 10000; last = now();
      const run = ++generation;
      if (!visibility?.hidden) timer = schedule(() => tick(run), 200);
      emit();
    },
    close,
    getState: state,
    destroy() {
      if (destroyed) return;
      close(); destroyed = true;
      visibility?.removeEventListener?.('visibilitychange', onVisibility);
      eventTarget?.removeEventListener?.('pagehide', close);
    },
  };
}
