#!/usr/bin/env python3
"""Apply the account mock and ACES replacement to an already isolated preview only."""
import base64, gzip, hashlib, json, os, re
from pathlib import Path
from importlib.machinery import SourceFileLoader
ROOT=Path(__file__).resolve().parent.parent
PACK=ROOT/'scripts'/'preview-overlay'
OUT=ROOT/'.preview-publish'
if os.environ.get('CONTEXT') not in ('deploy-preview','branch-deploy'):
    raise RuntimeError('Preview context required')
if not OUT.is_dir() or OUT.is_symlink() or not (OUT/'_headers').is_file():
    raise RuntimeError('Isolated preview must be built first')
m=json.loads((PACK/'manifest.json').read_text())
if type(m['chunks']) is not int or not 1 <= m['chunks'] <= 100: raise RuntimeError('Invalid chunk count')
parts=[]
for i in range(m['chunks']):
    t=(PACK/f'chunk-{i:04d}.txt').read_text('ascii')
    if not t or len(t)>8000 or not re.fullmatch(r'[A-Za-z0-9+/=]+',t): raise RuntimeError('Invalid chunk')
    parts.append(t)
payload=gzip.decompress(base64.b64decode(''.join(parts),validate=True))
if len(payload)!=m['bytes'] or hashlib.sha256(payload).hexdigest()!=m['sha256']: raise RuntimeError('Overlay checksum mismatch')
files=json.loads(payload)
fixed={'index.html','games/aces.html','mock/firebase-app.js','mock/firebase-auth.js','mock/firebase-firestore.js'}
assets={n for n in files if re.fullmatch(r'games/aces-assets/assets/index-[A-Za-z0-9_-]+\.(?:js|css)',n)}
if set(files)!=fixed|assets or len(assets)!=2: raise RuntimeError('Unexpected overlay files')
risky=re.compile(r'AIza[0-9A-Za-z_-]{30,}|\$2[aby]\$\d\d\$|jsonbin\.io|firebaseapp\.com|firebasedatabase\.app|firebaseio\.com',re.I)
mod=SourceFileLoader('preview_builder',str(ROOT/'scripts/build-preview.py')).load_module()
for name,data in files.items():
 if not isinstance(data,str) or risky.search(data): raise RuntimeError('Unsafe content')
 if name.endswith('.html'):
  data=mod.transform_html(Path(name),data)
  if data.count('gn-preview-notice')!=1 or data.count('Content-Security-Policy')!=1: raise RuntimeError('Preview safeguards missing')
 if name=='index.html':
  data=data.replace('PREVIEW ONLY — Cloud saves, accounts, leaderboards and online services disabled','PREVIEW ONLY — Test accounts are fake. Cloud saves and online services disabled')
  if any('https://www.gstatic.com/firebasejs' in data for _ in [0]): raise RuntimeError('Real SDK in preview')
 p=OUT/name
 p.parent.mkdir(parents=True,exist_ok=True)
 if p.is_symlink(): raise RuntimeError('Symlink in overlay')
 p.write_text(data,encoding='utf-8')
print('Applied safe account mock and ACES preview overlay.',flush=True)
