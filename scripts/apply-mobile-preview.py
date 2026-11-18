#!/usr/bin/env python3
"""Apply the hash-locked mobile patch after all ACES deploy-preview overlays."""
import base64, hashlib, io, os, pathlib, subprocess, tempfile, zipfile
if os.environ.get('CONTEXT') != 'deploy-preview':
    raise SystemExit('Mobile patch is restricted to Netlify deploy-preview context')
encoded = ''.join((pathlib.Path(__file__).resolve().parent / 'mobile-preview' / f'chunk-{i:04}.txt').read_text() for i in range(53))
payload = base64.b64decode(encoded, validate=True)
if hashlib.sha256(payload).hexdigest() != '10f96be2050b13e27c1544244b7df6a379b56059e5cdce50446c742116db13c4':
    raise SystemExit('Mobile patch archive checksum mismatch')
with tempfile.TemporaryDirectory() as tmp:
    root=pathlib.Path(tmp)
    with zipfile.ZipFile(io.BytesIO(payload)) as archive:
        for item in archive.infolist():
            parts=pathlib.PurePosixPath(item.filename).parts
            if item.is_dir() or not parts or any(p in ('', '.', '..') for p in parts) or pathlib.PurePosixPath(item.filename).is_absolute():
                raise SystemExit('Unsafe mobile patch archive path')
            out=root.joinpath(*parts)
            out.parent.mkdir(parents=True,exist_ok=True)
            out.write_bytes(archive.read(item))
    subprocess.run(['python3',str(root/'apply-mobile.py'),str(pathlib.Path('.preview-publish').resolve())],check=True)
