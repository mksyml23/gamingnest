// Standalone, preview-only experiment. No persistence, network, Firebase or rewards.
// Supply a renderer for your existing game/shop modal via onChange.
export function createAdExperiment({ onChange = () => {}, clock = {} } = {}) {
  const now = clock.now || (() => performance.now());
  const schedule = clock.setTimeout || ((fn, ms) => globalThis.setTimeout(fn, ms));
  const cancel = clock.clearTimeout || ((id) => globalThis.clearTimeout(id));
  let clicks = 0;
  let simulatedCompletions = 0;
  let status = 'closed';
  let timer = null;
  let startedAt = 0;
  let generation = 0;
  let destroyed = false;
  const state = () => Object.freeze({ status, clicks, simulatedCompletions });
  const emit = () => onChange(state());

  function finishWhenReady(run) {
    if (destroyed || status !== 'running' || run !== generation) return;
    const remaining = 5000 - (now() - startedAt);
    if (remaining > 0) {
      timer = schedule(() => finishWhenReady(run), remaining);
      return;
    }
    timer = null;
    status = 'completed';
    simulatedCompletions += 1;
    emit();
  }
  return {
    // Call once per actual Watch ad button activation, not when mounting/rendering.
    click() {
      if (destroyed) return;
      clicks += 1;
      if (status === 'closed') {
        status = 'running';
        startedAt = now();
        const run = ++generation;
        timer = schedule(() => finishWhenReady(run), 5000);
      }
      emit();
    },
    close() {
      if (destroyed || status === 'closed') return;
      ++generation;
      if (timer !== null) cancel(timer);
      timer = null;
      status = 'closed';
      emit();
    },
    getState: state,
    destroy() {
      if (destroyed) return;
      destroyed = true;
      ++generation;
      if (timer !== null) cancel(timer);
      timer = null;
      status = 'closed';
    },
  };
}
