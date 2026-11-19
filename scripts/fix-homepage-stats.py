#!/usr/bin/env python3
"""Patch the reconstructed release homepage; fail closed if its source changes."""
import hashlib
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
homepage = ROOT / 'soepgames' / 'index.html'
source = homepage.read_bytes()
expected = '054a91c4a7b158bc11392f87435c2de973881803917b0fcba5c33b479d59d1a6'
if hashlib.sha256(source).hexdigest() != expected:
    raise RuntimeError('Unexpected reconstructed homepage; refusing stats patch')
old = b'                await Promise.all([fetchDB(), fetchHallOfFame()]);'
new = b'''                // The 1.5s fallback may already have rendered empty data. Refresh
                // the cards when stats arrive, even if Hall of Fame is still pending.
                const statsLoad = fetchDB().then(() => { if (isLoaded) render(); });
                await Promise.all([statsLoad, fetchHallOfFame()]);'''
if source.count(old) != 1:
    raise RuntimeError('Stats loading patch anchor is missing or ambiguous')
homepage.write_bytes(source.replace(old, new, 1))
print('Patched late-arriving homepage statistics')
