#!/usr/bin/env python3
"""Apply the legacy-guest startup fix to the verified release output."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'soepgames/games/aces-assets/assets/browser.mjs'
EXPECTED_SHA256 = 'f1400e7b65b838240d7224706acef6a619337e6747673eb0c4ccaa15907598ff'

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Unexpected ACES guest-start patch target: ' + old[:100])
    return text.replace(old, new, 1)

def main():
    original = TARGET.read_bytes()
    if hashlib.sha256(original).hexdigest() != EXPECTED_SHA256:
        raise RuntimeError('Unexpected ACES browser release input; no changes made')
    text = original.decode('utf-8')
    text = replace_once(text,
        "document.body.append(panel,badge);",
        """const legacyLink=document.createElement('a'); legacyLink.id='aces-old-guest-link';
legacyLink.href='/games/aces-legacy.html'; legacyLink.style.cssText='display:none;position:fixed;z-index:2147483646;left:8px;bottom:8px;background:#111;color:#ccc;padding:6px;font:12px sans-serif';
document.body.append(panel,badge,legacyLink);""")
    text = replace_once(text,
        "    const prior=oldGuestInfo(localStorage), legacy=b.legacyInfo;\n    const messages=[];",
        """    const prior=oldGuestInfo(localStorage), legacy=b.legacyInfo;
    legacyLink.style.display=prior.legacy?'block':'none';
    legacyLink.textContent=uid?'Old guest game (sign out first)':'Old guest game';
    const messages=[];""")
    text = replace_once(text,
        "    if(prior.legacy) messages.push('An older guest save is on this device. It cannot be converted; open the old game to access it.');\n", "")
    TARGET.write_text(text, encoding='utf-8')
    print('Verified ACES legacy-guest startup fix applied')

if __name__ == '__main__':
    main()
