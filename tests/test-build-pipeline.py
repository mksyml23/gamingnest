#!/usr/bin/env python3
"""Isolated release-pipeline regression; never modifies the working tree or networks."""
from pathlib import Path
import hashlib, shutil, subprocess, tempfile
ROOT = Path(__file__).resolve().parent.parent

def sha(p): return hashlib.sha256(p.read_bytes()).hexdigest()
def run(stage, script, ok=True):
    result = subprocess.run(['python3', 'scripts/' + script], cwd=stage, capture_output=True, text=True, timeout=30)
    assert (result.returncode == 0) == ok, (script, result.stdout, result.stderr)
    return result

with tempfile.TemporaryDirectory(prefix='gn-build-') as td:
    stage = Path(td)
    shutil.copytree(ROOT/'scripts', stage/'scripts')
    shutil.copytree(ROOT/'.release-aces-mobile-8ce7aec', stage/'.release-aces-mobile-8ce7aec')
    (stage/'soepgames').mkdir()
    shutil.copyfile(ROOT/'soepgames/firebase-app.js', stage/'soepgames/firebase-app.js')
    home = stage/'soepgames/index.html'; firebase = stage/'soepgames/firebase-app.js'
    run(stage, 'apply-release-8ce7aec.py'); run(stage, 'fix-homepage-stats.py')
    assert sha(home) == '1832853a53d9f71851246e2b6f6e2241f3964b05d9a78adb2195935000420216'
    assert sha(firebase) == '32f73f88180b4ce9ce809025a92eb6fce905e5f9b272fcc5ca0799a6d27c5b8a'
    before = home.read_bytes(); home.write_bytes(before+b' ')
    run(stage, 'apply-account-invite.py', False); assert home.read_bytes() == before+b' '
    home.write_bytes(before)
    bad = firebase.read_bytes(); firebase.write_bytes(bad+b' ')
    run(stage, 'apply-account-invite.py', False); assert home.read_bytes() == before
    firebase.write_bytes(bad)
    run(stage, 'apply-account-invite.py')
    assert sha(home) == '057df4e694cd197125c492bcda240c7b87aec045ab7a0cd7686df1563d0132aa'
    assert firebase.read_bytes() == bad
    after = home.read_bytes(); run(stage, 'apply-account-invite.py', False); assert home.read_bytes() == after
    home.write_bytes(after+b' ')
    run(stage, 'apply-account-auth.py', False); assert home.read_bytes() == after+b' '
    home.write_bytes(after)
    run(stage, 'apply-account-auth.py'); reset = home.read_bytes()
    assert sha(home) == 'c1a683d154afccdc72e1ad67924dc092656b20840a2dd72515576e893bcc175d'
    assert reset.count(b'id="account-reset"') == 1 and reset.count(b'id="account-invite"') == 1
    run(stage, 'apply-account-auth.py', False); assert home.read_bytes() == reset
    old = stage/'soepgames/games/aces-legacy.html'; old_hash = sha(old)
    assert old_hash == '0c0d387d4088d6cf60976c4c02ebb1adeb825e6ba5c5b590d1edae046e40460c'
    run(stage, 'apply-aces-ad-100.py'); assert sha(old) == old_hash
    assert sha(stage/'soepgames/games/aces.html') == 'c0a279877abe941d21935b339cad36e4c0451be59dcb9f63b910f573811d54f3'
    assert firebase.read_bytes() == bad
    final = home.read_bytes()
    assert final.count(b'id="language-select"') == 1
    assert final.count(b'id="account-invite-login"') == 1
    assert final.count(b'id="home-scrollbar-style"') == 1
    assert b'/language.js' in final and b'/language.css' in final
    assert (stage/'soepgames/language.js').is_file()
    run(stage, 'apply-language-switch.py', False); assert home.read_bytes() == final
    print('PASS: clean verified build, fixed intermediate/final hashes, replay/drift fail-closed, one reset/invite, unchanged auth and legacy ACES, new ACES output')
