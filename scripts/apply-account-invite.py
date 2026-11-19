#!/usr/bin/env python3
"""Patch the verified release homepage after archive assembly; fail closed on drift."""
from pathlib import Path
import hashlib
import shutil

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'scripts' / 'account-invite'
PUBLISH = ROOT / 'soepgames'
HOME = PUBLISH / 'index.html'
EXPECTED_HOME_SHA256 = '1832853a53d9f71851246e2b6f6e2241f3964b05d9a78adb2195935000420216'


def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError(f'Unexpected homepage anchor count: {old!r}')
    return text.replace(old, new, 1)


def main():
    raw = HOME.read_bytes()
    if hashlib.sha256(raw).hexdigest() != EXPECTED_HOME_SHA256:
        raise RuntimeError('Generated release homepage differs from the verified version')
    text = raw.decode('utf-8')
    text = replace_once(text, '</head>', '    <link rel="stylesheet" href="/account-invite.css">\n</head>')
    text = replace_once(text, '<button class="dock-btn" onclick="openAccount()">', '<button id="account-dock-button" class="dock-btn" onclick="openAccount()" aria-label="Open account">')
    text = replace_once(text, '            Save your progress across GamingNest.', '            Create an account or log in to GamingNest.')
    text = replace_once(text, 'subtitle.innerText = "Save your progress across GamingNest.";', 'subtitle.innerText = "Create an account or log in to GamingNest.";')
    text = replace_once(text, 'let accountMode = "signup";', 'let accountMode = "signup";\nwindow.accountMode = accountMode;')
    text = replace_once(text, 'accountMode = "login";', 'accountMode = "login";\n        window.accountMode = accountMode;')
    # The declaration also contains the signup assignment; target the indented switch branch.
    text = replace_once(text, '        accountMode = "signup";', '        accountMode = "signup";\n        window.accountMode = accountMode;')
    text = replace_once(text, '''            <span
                id="account-switch-button"
                class="account-switch-button"
                onclick="switchAccountMode()"
            >Log in</span>''', '''            <button type="button"
                id="account-switch-button"
                class="account-switch-button"
                onclick="switchAccountMode()"
            >Log in</button>''')
    invitation = '''<aside id="account-invite" role="region" aria-labelledby="account-invite-title" hidden>
    <button id="account-invite-close" type="button" aria-label="Dismiss account invitation">×</button>
    <h2 id="account-invite-title">Make GamingNest yours</h2>
    <p>Create a GamingNest account, or log in if you already have one. You can still play without an account.</p>
    <button id="account-invite-create" type="button">Create an account</button>
</aside>
<script type="module" src="/account-invite.js"></script>
'''
    text = replace_once(text, '</body>', invitation + '</body>')
    for name in ('account-invite.js', 'account-invite.css'):
        shutil.copyfile(SOURCE / name, PUBLISH / name)
    HOME.write_text(text, encoding='utf-8')
    print('Account invitation added to verified release homepage')


if __name__ == '__main__':
    main()
