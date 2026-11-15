#!/usr/bin/env python3
"""Build a static, cloud-disabled Netlify preview without touching source files."""
from pathlib import Path
import re
import shutil
import tempfile

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'soepgames'
OUTPUT = ROOT / '.preview-publish'
CSP = ("default-src 'none'; base-uri 'none'; object-src 'none'; "
       "connect-src 'none'; form-action 'none'; frame-src 'none'; worker-src 'none'; "
       "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://unpkg.com https://esm.sh https://cdnjs.cloudflare.com; "
       "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdnjs.cloudflare.com; "
       "font-src 'self' data: https://fonts.gstatic.com https://cdnjs.cloudflare.com; "
       "img-src 'self' data: blob: https://images.unsplash.com https://www.transparenttextures.com https://media.istockphoto.com https://ui-avatars.com; "
       "media-src 'self' data: blob:; manifest-src 'self'")
META = '<meta http-equiv="Content-Security-Policy" content="' + CSP + '">\n<meta name="robots" content="noindex, nofollow">\n'
BANNER = ('<div id="gn-preview-notice" role="status" style="position:fixed;z-index:2147483647;bottom:0;left:0;right:0;'
          'background:#391b65;color:white;text-align:center;padding:6px;font: bold 14px sans-serif;pointer-events:none">'
          'PREVIEW ONLY — Cloud saves, accounts, leaderboards and online services disabled</div>')
STUB = '''// Preview only: no production Firebase SDK or network access.
window.saveGameData = async () => false;
window.loadGameData = async () => null;
export const auth = Object.freeze({currentUser: null});
export const firestore = null;
const disabled = () => { throw new Error('Cloud services are disabled in preview'); };
export const updateDoc = disabled, increment = disabled, doc = disabled, getDoc = disabled,
  setDoc = disabled, collection = disabled, getDocs = disabled, query = disabled,
  orderBy = disabled, limit = disabled;
'''

def must_sub(pattern, repl, text, label, flags=0):
    text, n = re.subn(pattern, repl, text, flags=flags)
    if n != 1:
        raise RuntimeError(f'{label}: expected exactly one match, got {n}')
    return text

def transform_html(path, text):
    # Current games contain absolute home links to production. Keep those
    # navigations (and the production-hosted logo) on the preview origin.
    def localize_production_url(match):
        suffix = match.group(2) or '/'
        if not suffix.startswith('/'):
            suffix = '/' + suffix
        return match.group(1) + suffix + match.group(3)
    text = re.sub(
        r'''(?i)(<(?:a|img)\b[^>]*?\b(?:href|src)\s*=\s*["'])https?://(?:www\.)?gamingnest\.nl(?=[:/?#"'])([^"']*)(["'])''',
        localize_production_url, text)
    if path.as_posix() == 'games/justclick.html':
        # Remove the complete sync function, not merely an early return.
        text = must_sub(r'// syncGlobal \(Complete replacement\).*?(?=// CLOUD SAVE OPHALEN)',
                        'async function syncGlobal() { /* preview: local only */ }\n\n', text,
                        'Just Click cloud sync', re.S)
        for field in ('jsonBinKey', 'jsonBinId'):
            text = must_sub(r'(' + field + r'\s*:\s*)[\'"][^\'"]*[\'"]', r'\1""', text, field)
        if re.search(r'jsonbin\.io|\$2[aby]\$\d\d\$', text, re.I):
            raise RuntimeError('Just Click still contains a JSONBin endpoint or credential')
    # Do not load third-party analytics even though connect-src blocks its beacons.
    text = re.sub(r'<script\b[^>]*\bsrc=[\'"]https://cloud\.umami\.is/[^\'"]*[\'"][^>]*>\s*</script\s*>', '', text, flags=re.I)
    text = re.sub(r'<script\b[^>]*\bsrc=[\'"]/?\.netlify/scripts/rum[^\'"]*[\'"][^>]*>\s*</script\s*>', '', text, flags=re.I)
    if 'cloud.umami.is' in text or '.netlify/scripts/rum' in text:
        raise RuntimeError(f'unhandled analytics in {path}')
    # Two .html files contain robots.txt data, and two games are HTML fragments.
    if not re.search(r'(?im)^\s*<body(?:\s[^>]*)?>', text):
        if path.name != 'robots.html':
            raise RuntimeError(f'no real body in {path}')
        text = '<!doctype html>\n<html>\n<head>\n</head>\n<body>\n<pre>' + text + '</pre>\n</body></html>'
    elif not re.search(r'(?im)^\s*<head(?:\s[^>]*)?>', text):
        text = '<!doctype html>\n<html>\n<head>\n' + text
    text = must_sub(r'(?im)^(\s*<head(?:\s[^>]*)?>)', lambda m: m.group(1) + '\n' + META, text, f'head {path}')
    text, body_count = re.subn(r'(?im)^(\s*<body(?:\s[^>]*)?>)', lambda m: m.group(1) + '\n' + BANNER, text, count=1)
    if body_count != 1:
        raise RuntimeError(f'missing body: {path}')
    return text

def build():
    # Never leave an old, potentially unsafe publish directory after a failed build.
    if OUTPUT.is_symlink():
        OUTPUT.unlink()
    elif OUTPUT.exists():
        shutil.rmtree(OUTPUT)
    if not SOURCE.is_dir() or SOURCE.is_symlink():
        raise RuntimeError('invalid source directory')
    with tempfile.TemporaryDirectory(prefix='gn-preview-', dir=ROOT) as tmp:
        stage = Path(tmp) / 'publish'
        stage.mkdir()
        html_count = 0
        for src in SOURCE.rglob('*'):
            if src.is_symlink():
                raise RuntimeError(f'symlinks are not allowed: {src}')
            if not src.is_file():
                continue
            rel = src.relative_to(SOURCE)
            if src.name in ('_headers', '_redirects', 'netlify.toml') or '.netlify' in rel.parts:
                raise RuntimeError(f'unsafe source routing/config: {rel}')
            dest = stage / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            if rel.as_posix() in ('firebase-app.js', 'games/firebase-app.js'):
                dest.write_text(STUB, encoding='utf-8')
            elif src.suffix.lower() == '.html':
                dest.write_text(transform_html(rel, src.read_text(encoding='utf-8')), encoding='utf-8')
                html_count += 1
            elif src.name == 'robots.txt':
                dest.write_text('User-agent: *\nDisallow: /\n', encoding='utf-8')
            else:
                shutil.copyfile(src, dest)
        if html_count < 20:
            raise RuntimeError(f'Unexpectedly few HTML pages: {html_count}')
        for name in ('firebase-app.js', 'games/firebase-app.js', 'index.html', 'games/justclick.html'):
            if not (stage / name).is_file():
                raise RuntimeError(f'Missing required file {name}')
        # Check the entire published tree, including non-HTML assets, for the
        # actual credential formats and endpoints present in the current source.
        risky = re.compile(rb'AIza[0-9A-Za-z_-]{30,}|\$2[aby]\$\d\d\$|jsonbin\.io|firebaseapp\.com|firebasedatabase\.app|firebaseio\.com', re.I)
        for f in stage.rglob('*'):
            if not f.is_file():
                continue
            raw = f.read_bytes()
            if risky.search(raw):
                raise RuntimeError(f'Production service configuration found in preview asset: {f.relative_to(stage)}')
            if f.suffix.lower() == '.html':
                content = raw.decode('utf-8')
                if content.count('gn-preview-notice') != 1 or content.count('Content-Security-Policy') != 1:
                    raise RuntimeError(f'Preview protection missing from {f}')
                if re.search(r'''(?i)<(?:a|img)\b[^>]*?\b(?:href|src)\s*=\s*["']https?://(?:www\.)?gamingnest\.nl(?=[:/?#"'])''', content):
                    raise RuntimeError(f'Production link remains in {f.relative_to(stage)}')
        (stage / '_headers').write_text('/*\n  Content-Security-Policy: ' + CSP + '\n  X-Robots-Tag: noindex, nofollow\n  X-Content-Type-Options: nosniff\n', encoding='utf-8')
        (stage / 'preview-blocked.html').write_text('<!doctype html><html><head>' + META + '</head><body>' + BANNER + '<h1>Preview service disabled</h1></body></html>', encoding='utf-8')
        (stage / '_redirects').write_text('/api/*  /preview-blocked.html  404!\n/.netlify/functions/*  /preview-blocked.html  404!\n', encoding='utf-8')
        stage.rename(OUTPUT)
        print(f'Preview built: {html_count + 1} HTML files, isolated Firebase and JSONBin, cloud requests blocked.')

if __name__ == '__main__':
    build()
