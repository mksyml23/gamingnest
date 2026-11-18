#!/usr/bin/env python3
"""Patch ONLY the isolated PR13 preview; retain the game's original shop logic.

Do not apply to production. A change in the compiled bundle fails closed and
requires manual review. Keep catalog editable in aces-preview-skins.json.
"""
import hashlib
import json
import os
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / '.preview-publish'
TARGET = OUT / 'games/aces-assets/assets/index-OkqegR5F.js'
EXPECTED_SHA256 = '333d698c55c83e1d4236dc22ab663711dc3f001d38647359435415524d34c088'
ANCHOR = 'trailColor:"#7209b7",costBits:500}],cx=('

def main():
    if os.environ.get('CONTEXT') not in ('deploy-preview', 'branch-deploy'):
        raise RuntimeError('ACES skin patch is preview-only')
    if OUT.is_symlink() or not (OUT / '_headers').is_file() or TARGET.is_symlink():
        raise RuntimeError('Isolated preview is required')
    raw = TARGET.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_SHA256:
        raise RuntimeError('Unexpected ACES bundle; review before changing patch')
    text = raw.decode('utf-8')
    if text.count(ANCHOR) != 1:
        raise RuntimeError('ACES skin catalog anchor missing or ambiguous')
    skins = json.loads((ROOT / 'scripts/aces-preview-skins.json').read_text())
    if not isinstance(skins, list) or not skins:
        raise RuntimeError('Empty or invalid catalog')
    ids = set()
    for x in skins:
        if not isinstance(x, dict) or set(x) != {'id', 'name', 'nameNl', 'color', 'trailColor', 'costBits'}:
            raise RuntimeError('Invalid skin fields')
        if not isinstance(x['id'], str) or not re.fullmatch(r'[a-z][a-z0-9_]{1,40}', x['id']) or x['id'] in ids or ('id:"' + x['id'] + '"') in text:
            raise RuntimeError('Invalid or duplicate skin id')
        ids.add(x['id'])
        if any(not isinstance(x[k], str) or not x[k].strip() or len(x[k]) > 60 for k in ('name', 'nameNl')):
            raise RuntimeError('Invalid skin name')
        if any(not isinstance(x[k], str) or not re.fullmatch(r'#[0-9a-fA-F]{6}', x[k]) for k in ('color', 'trailColor')):
            raise RuntimeError('Invalid color')
        if type(x['costBits']) is not int or not 1 <= x['costBits'] <= 1000000:
            raise RuntimeError('Invalid cost')
    encoded = ','.join(json.dumps(x, ensure_ascii=True, separators=(',', ':')) for x in skins)
    text = text.replace(ANCHOR, 'trailColor:"#7209b7",costBits:500},' + encoded + '],cx=(', 1)
    TARGET.write_text(text, encoding='utf-8')
    print(f'Added {len(skins)} editable skins to the original ACES preview shop.')

if __name__ == '__main__':
    main()
