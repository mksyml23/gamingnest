import { createAdExperiment } from './ad-experiment.mjs';

export function makeAdExperimentShop(React, jsx) {
  return function AdExperimentShop({ lang, onReward }) {
    const dutch = lang === 'nl';
    const [state, setState] = React.useState({ status: 'closed', seconds: 10, clicks: 0, persistent: true });
    const controller = React.useRef(null), dialog = React.useRef(null), opener = React.useRef(null), reward = React.useRef(onReward);
    reward.current = onReward;
    React.useEffect(() => {
      const instance = createAdExperiment({ onChange: setState, onReward: () => reward.current?.() === true });
      controller.current = instance; setState(instance.getState());
      return () => { instance.destroy(); controller.current = null; };
    }, []);
    React.useEffect(() => {
      const node = dialog.current;
      if (!node) return;
      if (state.status !== 'closed' && !node.open) node.showModal();
      if (state.status === 'closed' && node.open) { node.close(); opener.current?.focus(); }
    }, [state.status]);
    const close = () => controller.current?.close();
    const panel = { padding: '16px', border: '1px solid #00e5ff66', borderRadius: '6px', background: '#071318', color: '#fff', fontSize: '12px' };
    const button = { padding: '8px 10px', background: '#00e5ff', color: '#001014', border: 0, borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer' };
    return jsx.jsxs('section', { id: 'aces-ad-experiment', 'aria-label': dutch ? 'Advertentiesimulatie' : 'Ad simulation', style: panel, children: [
      jsx.jsx('button', { ref: opener, type: 'button', id: 'aces-ad-start', style: button, onClick: () => controller.current?.click(), children: dutch ? 'Bekijk simulatie voor 25 Bits (10 sec)' : 'Watch simulation for 25 Bits (10 sec)' }),
      jsx.jsxs('dialog', { ref: dialog, id: 'aces-ad-dialog', 'aria-labelledby': 'aces-ad-title', 'aria-describedby': 'aces-ad-description', onKeyDown: event => { if (event.key === 'Escape') event.stopPropagation(); }, onCancel: event => { event.preventDefault(); close(); }, onClose: close, style: { ...panel, width: 'min(90vw, 400px)', maxHeight: '90vh', overflowY: 'auto', lineHeight: 1.5 }, children: [
        jsx.jsx('h2', { id: 'aces-ad-title', style: { fontSize: '18px', color: '#00e5ff' }, children: dutch ? 'FICTIEVE RECLAME — SIMULATIE' : 'FICTIONAL AD — SIMULATION' }),
        jsx.jsx('p', { id: 'aces-ad-description', children: dutch ? 'Geen echte advertentie. Bekijk de volledige simulatie voor 25 Bits. Vroeg sluiten of herladen levert niets op; de teller pauzeert als het tabblad verborgen is.' : 'Not a real ad. Watch the full simulation for 25 Bits. Closing early or reloading gives nothing; the timer pauses while this tab is hidden.' }),
        jsx.jsxs('div', { style: { margin: '16px 0', padding: '18px', border: '1px solid #00ff9d', background: '#101b27', textAlign: 'center' }, children: [
          jsx.jsx('div', { style: { fontSize: '28px', color: '#00ff9d' }, 'aria-hidden': true, children: '◈ ◇ ◈' }),
          jsx.jsx('strong', { style: { fontSize: '17px' }, children: dutch ? 'RUIMTE VOOR EEN PAUZE' : 'SPACE FOR A BREAK' }),
          jsx.jsx('p', { style: { margin: '8px 0 0' }, children: dutch ? 'Een fictieve boodschap uit het ACES-universum: haal adem, inspecteur. De volgende sector wacht.' : 'A fictional message from the ACES universe: take a breath, inspector. The next sector awaits.' })
        ] }),
        jsx.jsx('p', { role: 'status', 'aria-live': 'polite', id: 'aces-ad-status', children: state.status === 'completed' ? (dutch ? 'Simulatie voltooid: +25 Bits!' : 'Simulation complete: +25 Bits!') : state.status === 'failed' ? (dutch ? 'Opslaan mislukt. Geen Bits toegekend.' : 'Save failed. No Bits awarded.') : (dutch ? `Resterend: ${state.seconds} seconden` : `Remaining: ${state.seconds} seconds`) }),
        jsx.jsx('button', { type: 'button', id: 'aces-ad-close', style: button, onClick: close, children: dutch ? 'Sluiten' : 'Close' })
      ] })
    ] });
  };
}
