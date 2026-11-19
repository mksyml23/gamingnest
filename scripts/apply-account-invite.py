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
    text = replace_once(text, 'id="modal-account" class="modal-overlay" aria-modal="true" role="dialog"', 'id="modal-account" class="modal-overlay" aria-modal="true" role="dialog" aria-labelledby="account-title"')
    text = replace_once(text, 'id="account-error" class="account-error"', 'id="account-error" class="account-error" role="status" aria-live="polite"')
    text = replace_once(text, 'id="account-email"\n            type="email"', 'id="account-email"\n            aria-label="Email"\n            type="email"')
    text = replace_once(text, 'id="account-password"\n            type="password"', 'id="account-password"\n            aria-label="Password"\n            type="password"')
    text = replace_once(text, 'autocomplete="current-password"', 'autocomplete="new-password"')
    text = replace_once(text, '            Save your progress across GamingNest.', '            Create an account or log in to GamingNest.')
    text = replace_once(text, 'subtitle.innerText = "Save your progress across GamingNest.";', 'subtitle.innerText = "Create an account or log in to GamingNest.";')
    text = replace_once(text, 'let accountMode = "signup";', 'let accountMode = "signup";\nwindow.accountMode = accountMode;')
    text = replace_once(text, 'accountMode = "login";', 'accountMode = "login";\n        window.accountMode = accountMode;')
    # The declaration also contains the signup assignment; target the indented switch branch.
    text = replace_once(text, '        accountMode = "signup";', '        accountMode = "signup";\n        window.accountMode = accountMode;')
    text = replace_once(text, '    const switchButton = document.getElementById("account-switch-button");', '    const switchButton = document.getElementById("account-switch-button");\n    if (!switchButton || switchButton.disabled) return;\n    document.getElementById("account-error").textContent = "";')
    text = replace_once(text, '        window.accountMode = accountMode;\n\n        title.innerText = "Welcome back";', '        window.accountMode = accountMode;\n        document.getElementById("account-password").autocomplete = "current-password";\n\n        title.innerText = "Welcome back";')
    text = replace_once(text, '        window.accountMode = accountMode;\n\n        title.innerText = "Create your account";', '        window.accountMode = accountMode;\n        document.getElementById("account-password").autocomplete = "new-password";\n\n        title.innerText = "Create your account";')
    text = replace_once(text, '''            <span
                id="account-switch-button"
                class="account-switch-button"
                onclick="switchAccountMode()"
            >Log in</span>''', '''            <button type="button"
                id="account-switch-button"
                class="account-switch-button"
                onclick="switchAccountMode()"
            >Log in</button>''')
    invitation = '''<aside id="account-invite" role="region" aria-labelledby="account-invite-title" aria-live="polite" hidden>
    <button id="account-invite-close" type="button" aria-label="Dismiss account invitation">×</button>
    <h2 id="account-invite-title">Make GamingNest yours</h2>
    <p>Create a GamingNest account, or log in if you already have one. You can still play without an account.</p>
    <button id="account-invite-create" type="button">Create an account</button>
</aside>
<script type="module" src="/account-invite.js"></script>
'''
    text = replace_once(text, '</body>', invitation + '</body>')
    firebase = PUBLISH / 'firebase-app.js'
    if hashlib.sha256(firebase.read_bytes()).hexdigest() != '32f73f88180b4ce9ce809025a92eb6fce905e5f9b272fcc5ca0799a6d27c5b8a':
        raise RuntimeError('Account auth module differs from the verified version')
    for name in ('account-invite.js', 'account-invite.css'):
        shutil.copyfile(SOURCE / name, PUBLISH / name)
    HOME.write_text(text, encoding='utf-8')
    print('Account invitation added to verified release homepage')


if __name__ == '__main__':
    main()
