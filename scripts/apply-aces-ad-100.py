#!/usr/bin/env python3
"""Patch only the verified decoded ACES release; fail closed on unexpected input."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / 'soepgames/games/aces-assets/assets'
FILES = {
    'game-bundle.mjs': ('7b720cde273b5e4f1d07140160d94503f395d64a7dd7f452aefa62b1d0590894', [
        ('onAdReward:()=>{const R=S+25;try{localStorage.setItem("aces_bits",R.toString());te(R);return !0}catch{return !1}}',
         'onAdReward:()=>{const R=S+100;try{localStorage.setItem("aces_bits",R.toString());te(R);return !0}catch{return !1}}'),
    ]),
    'ad-experiment-shop.mjs': ('77ac475e522187402e41b5c9473b191855de2ce68ec9b63cd06235db4e393fd3', [
        ("dutch ? 'Advertentiesimulatie' : 'Ad simulation'", "dutch ? 'Advertentie' : 'Ad'"),
        ("dutch ? 'Bekijk simulatie voor 25 Bits (5 sec)' : 'Watch simulation for 25 Bits (5 sec)'", "dutch ? 'Bekijk advertentie voor 100 Bits (5 sec)' : 'Watch ad for 100 Bits (5 sec)'"),
        ("dutch ? 'FICTIEVE RECLAME — SIMULATIE' : 'FICTIONAL AD — SIMULATION'", "dutch ? 'ADVERTENTIE' : 'AD'"),
        ("dutch ? 'Geen echte advertentie. Bekijk de volledige simulatie voor 25 Bits. Vroeg sluiten of herladen levert niets op; de teller pauzeert als het tabblad verborgen is.' : 'Not a real ad. Watch the full simulation for 25 Bits. Closing early or reloading gives nothing; the timer pauses while this tab is hidden.'", "dutch ? 'Er wordt nog geen advertentie afgespeeld. Wacht 5 seconden voor 100 Bits. Vroeg sluiten of herladen levert niets op; de timer pauzeert als het tabblad verborgen is.' : 'No ad is playing yet. Wait 5 seconds for 100 Bits. Closing early or reloading gives nothing; the timer pauses while this tab is hidden.'"),
        ("dutch ? 'Simulatie voltooid: +25 Bits!' : 'Simulation complete: +25 Bits!'", "dutch ? 'Klaar: +100 Bits!' : 'Done: +100 Bits!'"),
    ]),
}

def main():
    outputs = {}
    for name, (expected, replacements) in FILES.items():
        path = ASSETS / name
        raw = path.read_bytes()
        if hashlib.sha256(raw).hexdigest() != expected:
            raise RuntimeError(f'Unexpected release input: {name}')
        text = raw.decode('utf-8')
        for old, new in replacements:
            if text.count(old) != 1:
                raise RuntimeError(f'Unexpected patch target in {name}: {old!r}')
            text = text.replace(old, new, 1)
        outputs[path] = text
    for path, text in outputs.items():
        path.write_text(text, encoding='utf-8')
    print('Verified ACES ad label and 100 Bits patch applied')

if __name__ == '__main__':
    main()
