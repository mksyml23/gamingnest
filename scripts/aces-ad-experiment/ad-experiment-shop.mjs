import { createAdExperiment } from './ad-experiment.mjs';

// Adaptable source: receives the same React and JSX runtime as the compiled preview.
// This deliberately never imports the game's save, progression, or network code.
export function makeAdExperimentShop(React, jsx) {
  return function AdExperimentShop({ lang }) {
    const dutch = lang === 'nl';
    const [state, setState] = React.useState({ status: 'closed', clicks: 0, simulatedCompletions: 0, persistent: true });
    const controller = React.useRef(null);
    const dialog = React.useRef(null);
    const opener = React.useRef(null);
    React.useEffect(() => {
      const instance = createAdExperiment({ onChange: setState });
      controller.current = instance;
      setState(instance.getState());
      return () => { instance.destroy(); controller.current = null; };
    }, []);
    React.useEffect(() => {
      const node = dialog.current;
      if (!node) return;
      if (state.status !== 'closed' && !node.open) node.showModal();
      if (state.status === 'closed' && node.open) { node.close(); opener.current?.focus(); }
    }, [state.status]);
    const close = () => controller.current?.close();
    const panel = { padding: '12px', border: '1px solid #00e5ff66', borderRadius: '6px', background: '#071318', color: '#fff', fontSize: '12px' };
    const button = { padding: '8px 10px', background: '#00e5ff', color: '#001014', border: 0, borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };
    return jsx.jsxs('section', { id: 'aces-ad-experiment', 'aria-label': dutch ? 'Advertentie-experiment' : 'Ad experiment', style: panel, children: [
      jsx.jsx('button', { ref: opener, type: 'button', id: 'aces-ad-start', style: button, onClick: () => controller.current?.click(), children: dutch ? 'Probeer het advertentie-experiment (5 sec)' : 'Try the watch-ad experiment (5 sec)' }),
      jsx.jsxs('p', { id: 'aces-ad-counts', style: { margin: '8px 0 0', color: '#ccc' }, children: [dutch ? 'Alleen preview: knopklikken ' : 'Preview only: button presses ', state.clicks, dutch ? '; gesimuleerde voltooiingen ' : '; simulated completions ', state.simulatedCompletions, state.persistent ? (dutch ? '. Alleen lokaal in deze browser opgeslagen, niet gedeeld of naar de cloud gestuurd.' : '. Stored locally in this browser only; not shared or sent to the cloud.') : (dutch ? '. Opslag niet beschikbaar: alleen tijdens deze opening; tellers worden niet bewaard.' : '. Storage unavailable: counts last only while the locker stays open.')] }),
      jsx.jsxs('dialog', { ref: dialog, id: 'aces-ad-dialog', 'aria-labelledby': 'aces-ad-title', 'aria-describedby': 'aces-ad-description', onKeyDown: (event) => { if (event.key === 'Escape') event.stopPropagation(); }, onCancel: (event) => { event.preventDefault(); close(); }, onClose: close, style: { ...panel, maxWidth: 'min(90vw, 400px)', lineHeight: 1.5 }, children: [
        jsx.jsx('h2', { id: 'aces-ad-title', children: dutch ? 'Advertentie-experiment' : 'Ad experiment' }),
        jsx.jsx('p', { id: 'aces-ad-description', children: dutch ? 'Dit is een experiment van vijf seconden, geen echte advertentie. Er wordt geen advertentie getoond en je krijgt geen beloning.' : 'This is a five-second experiment, not a real ad. No ad is shown and no reward is given.' }),
        jsx.jsx('p', { role: 'status', 'aria-live': 'polite', id: 'aces-ad-status', children: state.status === 'completed' ? (dutch ? 'Experiment voltooid. Geen beloning gegeven.' : 'Experiment complete. No reward was given.') : (dutch ? 'Experiment bezig…' : 'Experiment in progress…') }),
        jsx.jsx('button', { type: 'button', id: 'aces-ad-close', style: button, onClick: close, children: dutch ? 'Sluiten' : 'Close' })
      ] })
    ] });
  };
}
