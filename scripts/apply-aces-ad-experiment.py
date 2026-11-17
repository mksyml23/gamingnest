#!/usr/bin/env python3
"""Insert the tested ad experiment into the exact isolated PR preview bundle only."""
import hashlib
import os
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '.preview-publish'
ASSETS = OUT / 'games/aces-assets/assets'
BUNDLE = ASSETS / 'index-OkqegR5F.js'
SOURCE = ROOT / 'scripts/aces-ad-experiment'
EXPECTED = '8e010fee461757f63637f78565c7af8668c1b882fd692236ff0f7dba889a831f'
RESULT = '333d698c55c83e1d4236dc22ab663711dc3f001d38647359435415524d34c088'

def main():
    if os.environ.get('CONTEXT') not in ('deploy-preview', 'branch-deploy'):
        raise RuntimeError('Refusing non-preview context')
    for p in (OUT, OUT / 'games', OUT / 'games/aces-assets', ASSETS, BUNDLE, SOURCE):
        if p.is_symlink():
            raise RuntimeError(f'Symlink not allowed: {p}')
    html = OUT / 'games/aces.html'
    if not html.is_file() or "connect-src 'none'" not in html.read_text():
        raise RuntimeError('Isolated preview CSP missing')
    raw = BUNDLE.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED:
        raise RuntimeError('Unexpected preview bundle SHA-256; refusing to patch')
    text = raw.decode('utf-8')
    replacements = [
        ('},Ec=[{id:"default",name:"Pure White (Standard)"', '},acesAdShop=acesMakeAdExperimentShop(j,s),Ec=[{id:"default",name:"Pure White (Standard)"'),
        ('className:"p-4 overflow-y-auto space-y-3 flex-1",children:Ec.map(r=>', 'className:"p-4 overflow-y-auto space-y-3 flex-1",children:[s.jsx(acesAdShop,{lang:l}),...Ec.map(r=>'),
        (']},r.id)})})]})}):null,bs={init:async()=>{}', ']},r.id)})]})]})}):null,bs={init:async()=>{}'),
    ]
    for before, after in replacements:
        if text.count(before) != 1:
            raise RuntimeError('Bundle anchor mismatch')
        text = text.replace(before, after, 1)
    text = 'import { makeAdExperimentShop as acesMakeAdExperimentShop } from "./ad-experiment-shop.mjs";\n' + text
    data = text.encode('utf-8')
    if hashlib.sha256(data).hexdigest() != RESULT:
        raise RuntimeError('Patched bundle hash mismatch')
    for name in ('ad-experiment.mjs', 'ad-experiment-shop.mjs'):
        src, dest = SOURCE / name, ASSETS / name
        if not src.is_file() or src.is_symlink() or dest.exists() or dest.is_symlink():
            raise RuntimeError(f'Unexpected module path: {name}')
    for name in ('ad-experiment.mjs', 'ad-experiment-shop.mjs'):
        shutil.copyfile(SOURCE / name, ASSETS / name)
    BUNDLE.write_bytes(data)
    print('Applied ad experiment to isolated preview; no production files modified.')

if __name__ == '__main__':
    main()
