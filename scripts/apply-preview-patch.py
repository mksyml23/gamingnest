#!/usr/bin/env python3
"""Fail closed on an incompatible source tree, then build the isolated preview."""
import base64
import gzip
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import sys

ROOT = Path(__file__).resolve().parent.parent
PACK = ROOT / 'scripts' / 'preview-patch'
JUST_CLICK = 'soepgames/games/justclick.html'

def digest(data):
    return hashlib.sha256(data).hexdigest()

def source_file(name):
    path = Path(name)
    if not name.startswith('soepgames/') or path.is_absolute() or '..' in path.parts or name == JUST_CLICK:
        raise RuntimeError(f'Invalid patch path: {name}')
    candidate = ROOT / path
    if any(p.is_symlink() for p in (candidate, *candidate.parents) if p != ROOT.parent):
        raise RuntimeError(f'Symlink in patch path: {name}')
    return candidate

def main():
    context = os.environ.get('CONTEXT')
    if context and context not in ('branch-deploy', 'deploy-preview'):
        raise RuntimeError(f'Patch is restricted to preview contexts, not {context}')
    # A failed validation must never leave an old publish directory available.
    output = ROOT / '.preview-publish'
    if output.is_symlink():
        output.unlink()
    elif output.exists():
        shutil.rmtree(output)
    m = json.loads((PACK / 'manifest.json').read_text(encoding='utf-8'))
    if m['format'] != 1 or not m['files'] or not m['chunks']:
        raise RuntimeError('Invalid patch manifest')
    parts = []
    for i, name in enumerate(m['chunks']):
        if name != f'chunk-{i:04d}.txt':
            raise RuntimeError('Invalid chunk ordering or name')
        text = (PACK / name).read_text(encoding='ascii')
        if not text or len(text) > 8000 or not re.fullmatch(r'[A-Za-z0-9+/=]+', text):
            raise RuntimeError(f'Invalid chunk: {name}')
        parts.append(text)
    patch = gzip.decompress(base64.b64decode(''.join(parts), validate=True))
    if len(patch) != m['patch_bytes'] or digest(patch) != m['patch_sha256']:
        raise RuntimeError('Patch checksum mismatch')
    for name, info in m['files'].items():
        path = source_file(name)
        if not path.is_file() or digest(path.read_bytes()) != info['base_sha256']:
            raise RuntimeError(f'Base source mismatch: {name}')
    just_click = ROOT / JUST_CLICK
    if just_click.is_symlink() or not just_click.is_file() or digest(just_click.read_bytes()) != m['just_click_sha256']:
        raise RuntimeError('Just Click differs from the original')
    # Check the patch's entire path set, not just its declared manifest entries.
    result = subprocess.run(['git', 'apply', '--numstat', '-z', '-'], input=patch, cwd=ROOT, check=True, stdout=subprocess.PIPE)
    names = []
    for record in result.stdout.split(b'\0'):
        if record:
            fields = record.split(b'\t', 2)
            if len(fields) != 3 or not fields[2]:
                raise RuntimeError('Unsupported patch path or rename')
            names.append(fields[2].decode('utf-8'))
    if sorted(names) != sorted(m['files']):
        raise RuntimeError('Patch paths do not match manifest')
    subprocess.run(['git', 'apply', '--check', '-'], input=patch, cwd=ROOT, check=True)
    subprocess.run(['git', 'apply', '-'], input=patch, cwd=ROOT, check=True)
    for name, info in m['files'].items():
        path = source_file(name)
        expected = info['result_sha256']
        if (expected is None and path.exists()) or (expected is not None and (not path.is_file() or digest(path.read_bytes()) != expected)):
            raise RuntimeError(f'Patched source mismatch: {name}')
    if digest(just_click.read_bytes()) != m['just_click_sha256']:
        raise RuntimeError('Just Click changed unexpectedly')
    print(f"Applied verified preview patch ({len(names)} files, base {m['base_commit']})", flush=True)
    subprocess.run([sys.executable, str(ROOT / 'scripts' / 'build-preview.py')], cwd=ROOT, check=True)

if __name__ == '__main__':
    main()
