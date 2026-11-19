#!/usr/bin/env python3
"""Add password reset to the exact previously assembled homepage, or fail closed."""
from pathlib import Path
import hashlib

home = Path(__file__).resolve().parent.parent / 'soepgames' / 'index.html'
raw = home.read_bytes()
if hashlib.sha256(raw).hexdigest() != '057df4e694cd197125c492bcda240c7b87aec045ab7a0cd7686df1563d0132aa':
    raise RuntimeError('Unexpected account-invite homepage; refusing auth patch')
old = b'''        <p class="account-switch">'''
new = b'''        <button id="account-reset" type="button" class="account-switch-button">Forgot password?</button>

        <p class="account-switch">'''
if raw.count(old) != 1:
    raise RuntimeError('Account reset anchor missing or ambiguous')
home.write_bytes(raw.replace(old, new, 1))
print('Account password reset added')
