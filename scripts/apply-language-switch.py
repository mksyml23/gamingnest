#!/usr/bin/env python3
"""Add language UI after the verified homepage patches. Refuse unexpected inputs."""
from pathlib import Path
import hashlib
import shutil
import runpy

ROOT = Path(__file__).resolve().parent.parent
home = ROOT / 'soepgames/index.html'
raw = home.read_bytes()
if hashlib.sha256(raw).hexdigest() != 'c1a683d154afccdc72e1ad67924dc092656b20840a2dd72515576e893bcc175d':
    raise RuntimeError('Unexpected homepage; refusing language patch')
s = raw.decode('utf-8')
def replace(old, new):
    global s
    if s.count(old) != 1:
        raise RuntimeError(f'Unexpected language patch anchor: {old!r}: {s.count(old)}')
    s = s.replace(old, new, 1)
scrollbar_style = runpy.run_path(str(ROOT / 'scripts/apply-home-scrollbar.py'))['STYLE'].decode('utf-8')
replace('</head>', scrollbar_style + '    <link rel="stylesheet" href="/language.css">\n</head>')
replace('''    <label class="sr-only" for="language-select">Language</label>
    <select id="language-select" class="language-select" aria-label="Choose language">
        <option value="en">EN</option><option value="nl">NL</option>
    </select>''', '''    <div class="language-control">
        <span class="language-control__icon" aria-hidden="true">🌐</span>
        <label class="language-control__label" for="language-select"><span id="language-label">Language</span><strong id="language-current">English</strong></label>
        <select id="language-select" class="language-control__select" aria-label="Choose language">
            <option value="en" lang="en">English</option><option value="nl" lang="nl">Nederlands</option>
        </select>
    </div>''')
replace('<section style="max-width:800px;', '<section id="homepage-description" style="max-width:800px;')
replace('<button id="account-invite-create" type="button">Create an account</button>', '<button id="account-invite-create" type="button">Create an account</button>\n    <button id="account-invite-login" type="button">Log in</button>')
replace('<script type="module" src="/firebase-app.js"></script>', '<script src="/language.js"></script>\n<script type="module" src="/firebase-app.js"></script>')
start = s.index('        // --- UI LOCALIZATION (English and Dutch) ---')
end = s.index('    </script>', start)
s = s[:start] + '''        // Static copy is independent of Firebase; the grid uses the same language.
        const t = window.GNLanguage.t;
        window.addEventListener('gn-language-change', () => {
            const subtitle = document.getElementById('funny-subtitle');
            subtitle.textContent = window.GNLanguage.locale === 'nl' ? 'Omdat je eigenlijk huiswerk hoort te maken.' : englishSubtitle;
            render();
        });
        window.addEventListener('load', () => {
            if (window.GNLanguage.locale === 'nl') document.getElementById('funny-subtitle').textContent = 'Omdat je eigenlijk huiswerk hoort te maken.';
            render();
        });
''' + s[end:]
replace("        document.getElementById('funny-subtitle').innerText = subtitles[Math.floor(Math.random() * subtitles.length)];", "        const englishSubtitle = subtitles[Math.floor(Math.random() * subtitles.length)];\n        document.getElementById('funny-subtitle').innerText = englishSubtitle;")
replace("document.getElementById('modal-subtitle').innerText = `Feedback for: ${gameName}`;", "document.getElementById('modal-subtitle').dataset.game = gameName;\n            document.getElementById('modal-subtitle').innerText = t('feedbackFor', {game: gameName});")
replace('Loading legends...</div>', '<span data-i18n="hofLoading">Loading legends...</span></div>')
replace('No legends have been forged yet. <br> <span style="color: #FFD700;">Will you be the first?</span>', '<span data-i18n="hofEmpty">${t(\'hofEmpty\')}</span> <br> <span data-i18n="hofFirst" style="color: #FFD700;">${t(\'hofFirst\')}</span>')
replace('Failed to load Hall of Fame.</div>`;', '<span data-i18n="hofFailed">${t(\'hofFailed\')}</span></div>`;')
# Text interpolated here comes only from the fixed local game catalogue.
s = s.replace('aria-label="Like ${game.title}"', 'aria-label="${t(\'like\', {game: game.title})}"')
s = s.replace('aria-label="Give feedback on ${game.title}"', 'aria-label="${t(\'feedback\', {game: game.title})}"')
s = s.replace('alt="Play ${game.title} - Free Online Browser Game"', 'alt="${t(\'image\', {game: game.title})}"')
s = s.replace('alt="Play ${game.title} - Free Browser Game"', 'alt="${t(\'image\', {game: game.title})}"')
for filename in ('language.js', 'language.css'):
    shutil.copyfile(ROOT / 'scripts/language-switch' / filename, ROOT / 'soepgames' / filename)
home.write_text(s, encoding='utf-8')
print('Language improvements applied to verified homepage')
