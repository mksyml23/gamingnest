#!/usr/bin/env python3
# INACTIVE STAGING ONLY: not referenced by netlify.toml. Do not activate before final snapshot validation.
"""Verify a removed-line-free delta against its base, then build an isolated preview."""
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
PACK = ROOT / 'scripts' / 'preview-patch-v2-staged'
JUST_CLICK = 'soepgames/games/justclick.html'
NEW_FILES = frozenset({
    'soepgames/games/chrono-core/sync.js',
    'soepgames/games/soulreaper/sync.js',
    'soepgames/games/spacejumper-sync.js',
})
RISKY = re.compile(rb'AIza[0-9A-Za-z_-]{30,}|\$2[aby]\$\d\d\$|jsonbin\.io|firebaseapp\.com|firebasedatabase\.app|firebaseio\.com|(?i:(?:api[_-]?key|password|secret|token|jsonBinKey|jsonBinId)\s*[:=]\s*[\"\'][^\"\']{8,}[\"\'])', re.I)

def digest(data):
    return hashlib.sha256(data).hexdigest()

def source_file(name):
    path = Path(name)
    if (not isinstance(name, str) or not name.startswith('soepgames/') or path.is_absolute()
            or '..' in path.parts or path.as_posix() != name or name == JUST_CLICK):
        raise RuntimeError(f'Invalid package path: {name}')
    candidate = ROOT / path
    if any(p.is_symlink() for p in (candidate, *candidate.parents) if p != ROOT.parent):
        raise RuntimeError(f'Symlink in package path: {name}')
    return candidate

def main():
    output = ROOT / '.preview-publish'
    if output.is_symlink():
        output.unlink()
    elif output.exists():
        shutil.rmtree(output)
    context = os.environ.get('CONTEXT')
    if context and context not in ('branch-deploy', 'deploy-preview'):
        raise RuntimeError(f'Package is restricted to preview contexts, not {context}')
    m = json.loads((PACK / 'manifest.json').read_text(encoding='utf-8'))
    if m['format'] != 2 or not m['chunks']:
        raise RuntimeError('Invalid package manifest')
    parts = []
    for i, name in enumerate(m['chunks']):
        if name != f'chunk-{i:04d}.txt':
            raise RuntimeError('Invalid chunk ordering or name')
        text = (PACK / name).read_text(encoding='ascii')
        if not text or len(text) > 8000 or not re.fullmatch(r'[A-Za-z0-9+/=]+', text):
            raise RuntimeError(f'Invalid chunk: {name}')
        parts.append(text)
    payload = gzip.decompress(base64.b64decode(''.join(parts), validate=True))
    if len(payload) != m['payload_bytes'] or digest(payload) != m['payload_sha256'] or RISKY.search(payload):
        raise RuntimeError('Package checksum or safety check failed')
    files = json.loads(payload)['files']
    if not isinstance(files, dict) or not files:
        raise RuntimeError('Empty package')
    just_click = ROOT / JUST_CLICK
    if just_click.is_symlink() or not just_click.is_file() or digest(just_click.read_bytes()) != m['just_click_sha256']:
        raise RuntimeError('Just Click differs from the original')
    results = {}
    all_inserts = []
    for name, info in files.items():
        path = source_file(name)
        new_file = info['base_sha256'] is None
        if new_file:
            if name not in NEW_FILES or path.exists() or info['result_sha256'] is None:
                raise RuntimeError(f'Invalid new file: {name}')
            if not path.parent.is_dir():
                raise RuntimeError(f'Missing parent for new file: {name}')
            lines = []
        else:
            if not path.is_file() or path.stat().st_mode & 0o111 or digest(path.read_bytes()) != info['base_sha256']:
                raise RuntimeError(f'Base source mismatch: {name}')
            lines = path.read_bytes().splitlines(keepends=True)
        pos, result = 0, []
        if info['result_sha256'] is None:
            if info['ops']:
                raise RuntimeError(f'Invalid deletion: {name}')
            results[path] = None
            continue
        for op in info['ops']:
            if not isinstance(op, list) or len(op) != 2:
                raise RuntimeError(f'Invalid operation: {name}')
            kind, value = op
            if kind in ('copy', 'copy-lf', 'skip'):
                if type(value) is not int or value <= 0 or pos + value > len(lines):
                    raise RuntimeError(f'Invalid line range: {name}')
                if kind == 'copy':
                    result.extend(lines[pos:pos + value])
                elif kind == 'copy-lf':
                    result.extend(line.replace(b'\r\n', b'\n') for line in lines[pos:pos + value])
                pos += value
            elif kind == 'insert':
                data = base64.b64decode(value, validate=True)
                if not data or RISKY.search(data):
                    raise RuntimeError(f'Unsafe insertion: {name}')
                all_inserts.append(data)
                result.append(data)
            else:
                raise RuntimeError(f'Unknown operation: {name}')
        data = b''.join(result)
        if pos != len(lines) or digest(data) != info['result_sha256']:
            raise RuntimeError(f'Result checksum mismatch: {name}')
        results[path] = data
    if RISKY.search(b''.join(all_inserts)):
        raise RuntimeError('Unsafe content across insertions')
    # All source/result checks complete before modifying any file.
    for path, data in results.items():
        if data is None:
            path.unlink()
        else:
            path.write_bytes(data)
    if digest(just_click.read_bytes()) != m['just_click_sha256']:
        raise RuntimeError('Just Click changed unexpectedly')
    print(f"Applied verified preview delta ({len(files)} files, base {m['base_commit']})", flush=True)
    subprocess.run([sys.executable, str(ROOT / 'scripts' / 'build-preview.py')], cwd=ROOT, check=True)

if __name__ == '__main__':
    main()
