#!/usr/bin/env python3
"""Assemble the verified ACES/mobile release into the Netlify publish tree."""
import base64
import hashlib
import io
from pathlib import Path
import stat
import zipfile

ROOT = Path(__file__).resolve().parent.parent
CHUNKS = ROOT / '.release-aces-mobile-8ce7aec'
EXPECTED_SHA256 = '96a5d1f8e05c0cc8061f7cc43422c3198687d859bd9ea139956fe8383c8f7119'
EXPECTED_CHUNKS = 98


def main():
    paths = [CHUNKS / f'chunk-{i:04d}.txt' for i in range(EXPECTED_CHUNKS)]
    actual = sorted(CHUNKS.glob('chunk-*.txt'))
    if actual != paths:
        raise RuntimeError('Release archive chunks are missing or unexpected')
    encoded = b''.join(path.read_bytes() for path in paths)
    archive = base64.b64decode(encoded, validate=True)
    if hashlib.sha256(archive).hexdigest() != EXPECTED_SHA256:
        raise RuntimeError('Release archive SHA-256 mismatch')
    with zipfile.ZipFile(io.BytesIO(archive)) as zf:
        entries = zf.infolist()
        names = [entry.filename for entry in entries]
        if len(entries) != 44 or len(names) != len(set(names)):
            raise RuntimeError('Unexpected release archive contents')
        for entry in entries:
            parts = Path(entry.filename).parts
            if not parts or Path(entry.filename).is_absolute() or '..' in parts or stat.S_ISLNK(entry.external_attr >> 16):
                raise RuntimeError(f'Unsafe archive path: {entry.filename}')
            if parts[0] != 'soepgames':
                continue
            destination = ROOT.joinpath(*parts)
            if not destination.resolve().is_relative_to(ROOT.resolve() / 'soepgames'):
                raise RuntimeError(f'Unsafe destination: {entry.filename}')
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(zf.read(entry))
    print('Verified ACES/mobile release assembled for Netlify')


if __name__ == '__main__':
    main()
