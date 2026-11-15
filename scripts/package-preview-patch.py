#!/usr/bin/env python3
"""Package the current tracked soepgames diff into small reproducible text files."""
import base64
import gzip
import hashlib
import io
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parent.parent
OUT = ROOT / 'scripts' / 'preview-patch'
CHUNK_SIZE = 8000
JUST_CLICK = 'soepgames/games/justclick.html'

def git(*args):
    return subprocess.run(['git', *args], cwd=ROOT, check=True, stdout=subprocess.PIPE).stdout

def digest(data):
    return hashlib.sha256(data).hexdigest()

def main():
    if git('diff', '--cached', '--name-only', '-z', '--', 'soepgames'):
        raise RuntimeError('Staged soepgames changes are not included by git diff; unstage them first')
    if git('ls-files', '--others', '--exclude-standard', '-z', '--', 'soepgames'):
        raise RuntimeError('Untracked soepgames files are not included by git diff')
    names = [x.decode('utf-8') for x in git('diff', '--name-only', '-z', '--', 'soepgames').split(b'\0') if x]
    if not names or JUST_CLICK in names:
        raise RuntimeError('Patch must be nonempty and must not modify Just Click')
    patch = git('diff', '--binary', '--', 'soepgames')
    subprocess.run(['git', 'apply', '--check', '--reverse', '-'], input=patch, cwd=ROOT, check=True)
    files = {}
    for name in sorted(names):
        base = git('show', 'HEAD:' + name)
        path = ROOT / name
        if path.is_symlink():
            raise RuntimeError('Symlink changes are not supported: ' + name)
        files[name] = {'base_sha256': digest(base), 'result_sha256': digest(path.read_bytes()) if path.is_file() else None}
    just_click = digest(git('show', 'HEAD:' + JUST_CLICK))
    if digest((ROOT / JUST_CLICK).read_bytes()) != just_click:
        raise RuntimeError('Just Click differs from HEAD')
    stream = io.BytesIO()
    with gzip.GzipFile(fileobj=stream, mode='wb', filename='', mtime=0, compresslevel=9) as compressed:
        compressed.write(patch)
    encoded = base64.b64encode(stream.getvalue()).decode('ascii')
    chunks = [encoded[i:i + CHUNK_SIZE] for i in range(0, len(encoded), CHUNK_SIZE)]
    OUT.mkdir(parents=True, exist_ok=True)
    for old in OUT.glob('chunk-*.txt'):
        old.unlink()
    chunk_names = []
    for index, text in enumerate(chunks):
        name = f'chunk-{index:04d}.txt'
        (OUT / name).write_text(text, encoding='ascii')
        chunk_names.append(name)
    manifest = {'format': 1, 'base_commit': git('rev-parse', 'HEAD').decode().strip(),
                'patch_sha256': digest(patch), 'patch_bytes': len(patch),
                'chunks': chunk_names, 'files': files, 'just_click_sha256': just_click}
    (OUT / 'manifest.json').write_text(json.dumps(manifest, indent=2, sort_keys=True) + '\n', encoding='utf-8')
    print(f'Packaged {len(patch)} patch bytes into {len(chunks)} chunks; sha256 {digest(patch)}')

if __name__ == '__main__':
    main()
