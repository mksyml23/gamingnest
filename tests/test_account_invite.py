#!/usr/bin/env python3
"""Offline browser tests against Netlify's generated homepage, with mocked Firebase."""
import functools
import hashlib
import http.server
from pathlib import Path
import subprocess
import threading
import unittest
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
PUBLISH = ROOT / 'soepgames'

APP = 'export const initializeApp = (config) => ({config});'
AUTH = '''
export const getAuth = () => window.__auth;
export class GoogleAuthProvider {}
export function onAuthStateChanged(auth, next, error) {
  const item = {next, error}; window.__listeners.push(item);
  return () => { window.__listeners = window.__listeners.filter(x => x !== item); };
}
export async function createUserWithEmailAndPassword(auth, email, password) {
  window.__calls.push('signup'); const user = {uid:'fake', email}; window.__emitAuth(user); return {user};
}
export async function signInWithEmailAndPassword(auth, email, password) {
  window.__calls.push('login'); const user = {uid:'fake', email}; window.__emitAuth(user); return {user};
}
export async function signInWithPopup(auth) { window.__calls.push('google'); const user={uid:'fake',email:'test@example.com'}; window.__emitAuth(user); return {user}; }
export async function signOut() { window.__emitAuth(null); }
'''
FIRESTORE = '''
export const getFirestore = () => ({});
export const doc = (...args) => ({});
export const collection = (...args) => ({});
export const setDoc = async () => {};
export const updateDoc = async () => {};
export const increment = () => 1;
export const serverTimestamp = () => 0;
export const getDoc = async () => ({ exists: () => true, data: () => ({}) });
export const getDocs = async () => ({ forEach: () => {}, docs: [] });
export const query = (...args) => ({});
export const orderBy = (...args) => ({});
export const limit = (...args) => ({});
'''
INIT = '''
window.__auth = {currentUser: null}; window.__listeners = []; window.__calls = [];
window.__emitAuth = user => { window.__auth.currentUser = user; for (const item of [...window.__listeners]) item.next(user); };
window.__authError = () => { for (const item of [...window.__listeners]) if (item.error) item.error(new Error('offline')); };
const realSetTimeout = window.setTimeout;
window.setTimeout = (fn, ms, ...args) => realSetTimeout(fn, ms === 8000 ? 120 : ms === 2000 ? 60 : ms, ...args);
'''

class QuietHandler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *args): pass


def digest(path): return hashlib.sha256(path.read_bytes()).hexdigest()


class InviteTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        subprocess.run(['python3', 'scripts/apply-release-8ce7aec.py'], cwd=ROOT, check=True)
        subprocess.run(['python3', 'scripts/fix-homepage-stats.py'], cwd=ROOT, check=True)
        before = {str(p.relative_to(PUBLISH)): digest(p) for p in PUBLISH.rglob('*') if p.is_file()}
        subprocess.run(['python3', 'scripts/apply-account-invite.py'], cwd=ROOT, check=True)
        after = {str(p.relative_to(PUBLISH)): digest(p) for p in PUBLISH.rglob('*') if p.is_file()}
        changed = {p for p in before.keys() | after.keys() if before.get(p) != after.get(p)}
        # Old output files from a previous build may already be present and identical.
        assert changed <= {'index.html', 'account-invite.js', 'account-invite.css'} and 'index.html' in changed, changed
        cls.output_hashes = {k: after[k] for k in ['index.html', 'account-invite.js', 'account-invite.css']}
        failed = subprocess.run(['python3', 'scripts/apply-account-invite.py'], cwd=ROOT, capture_output=True)
        assert failed.returncode != 0 and b'differs from the verified version' in failed.stderr
        assert cls.output_hashes == {k: digest(PUBLISH / k) for k in cls.output_hashes}
        subprocess.run(['python3', 'scripts/apply-release-8ce7aec.py'], cwd=ROOT, check=True)
        subprocess.run(['python3', 'scripts/fix-homepage-stats.py'], cwd=ROOT, check=True)
        subprocess.run(['python3', 'scripts/apply-account-invite.py'], cwd=ROOT, check=True)
        assert cls.output_hashes == {k: digest(PUBLISH / k) for k in cls.output_hashes}
        cls.server = http.server.ThreadingHTTPServer(('127.0.0.1', 0), functools.partial(QuietHandler, directory=str(PUBLISH)))
        threading.Thread(target=cls.server.serve_forever, daemon=True).start()
        cls.pw = sync_playwright().start()
        cls.browser = cls.pw.chromium.launch(executable_path='/usr/bin/chromium', args=['--no-sandbox'])
        cls.url = f'http://127.0.0.1:{cls.server.server_port}/'

    @classmethod
    def tearDownClass(cls):
        cls.browser.close(); cls.pw.stop(); cls.server.shutdown(); cls.server.server_close()

    def setUp(self):
        self.context = self.browser.new_context(viewport={'width': 390, 'height': 844})
        self.context.add_init_script(INIT)
        def route_request(route):
            url = route.request.url
            if url.endswith('/firebase-app.js') and 'gstatic.com' in url: body = APP
            elif url.endswith('/firebase-auth.js') and 'gstatic.com' in url: body = AUTH
            elif url.endswith('/firebase-firestore.js') and 'gstatic.com' in url: body = FIRESTORE
            elif url.startswith(self.url): return route.continue_()
            else: return route.abort()
            route.fulfill(status=200, content_type='text/javascript', body=body, headers={'Access-Control-Allow-Origin':'*'})
        self.context.route('**/*', route_request)
        self.page = self.context.new_page()
        self.page.goto(self.url, wait_until='domcontentloaded')
        self.page.wait_for_function('window.__listeners.length >= 2 && typeof window.openAccount === "function"')

    def tearDown(self): self.context.close()

    def emit(self, user='null'): self.page.evaluate(f'window.__emitAuth({user})')
    def invite(self): return self.page.locator('#account-invite')
    def test_auth_wait_and_signed_in_never_flash(self):
        self.page.wait_for_timeout(350)
        self.assertTrue(self.invite().is_hidden())
        self.emit("{uid:'returning',email:'return@example.com'}")
        self.page.wait_for_timeout(350)
        self.assertTrue(self.invite().is_hidden())
        self.assertEqual(self.page.locator('#account-title').inner_text(), 'Welcome back!')

    def test_guest_delay_close_session_keyboard_and_focus(self):
        self.emit()
        self.assertTrue(self.invite().is_hidden())
        self.invite().wait_for(state='visible')
        self.page.locator('#account-invite-close').focus()
        self.page.keyboard.press('Escape')
        self.assertTrue(self.invite().is_hidden())
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'account-dock-button')
        self.page.reload(wait_until='domcontentloaded')
        self.page.wait_for_function('window.__listeners.length >= 2')
        self.emit(); self.page.wait_for_timeout(250)
        self.assertTrue(self.invite().is_hidden())
        self.page.locator('#account-dock-button').click()
        self.assertTrue(self.page.locator('#modal-account').is_visible())

    def test_create_routes_to_real_existing_flow_and_signup(self):
        self.emit(); self.invite().wait_for(state='visible')
        box = self.invite().bounding_box()
        self.assertGreaterEqual(box['x'], 0); self.assertLessEqual(box['x'] + box['width'], 390)
        self.page.locator('#account-invite-create').focus(); self.page.keyboard.press('Enter')
        self.assertTrue(self.invite().is_hidden())
        self.assertTrue(self.page.locator('#modal-account').is_visible())
        self.assertEqual(self.page.evaluate('document.activeElement.id'), 'account-email')
        self.assertEqual(self.page.evaluate('window.accountMode'), 'signup')
        self.page.locator('#account-email').fill('test@example.com')
        self.page.locator('#account-password').fill('fake-password')
        self.page.locator('#account-submit').click()
        self.page.wait_for_function('window.__calls.includes("signup")')
        self.assertEqual(self.page.evaluate('window.__calls'), ['signup'])
        self.assertTrue(self.invite().is_hidden())

    def test_existing_login_mode_works_and_invite_selects_signup(self):
        self.page.locator('#account-dock-button').click()
        self.page.locator('#account-switch-button').focus(); self.page.keyboard.press('Enter')
        self.assertEqual(self.page.evaluate('window.accountMode'), 'login')
        self.page.locator('#account-email').fill('test@example.com')
        self.page.locator('#account-password').fill('fake-password')
        self.page.locator('#account-submit').click()
        self.page.wait_for_function('window.__calls.includes("login")')
        self.assertEqual(self.page.evaluate('window.__calls'), ['login'])

    def test_invite_opens_signup_even_after_login_selected(self):
        self.page.locator('#account-dock-button').click()
        self.page.locator('#account-switch-button').click()
        self.emit(); self.page.wait_for_timeout(300)
        self.assertTrue(self.invite().is_hidden())  # an account modal is already open
        self.page.locator('#modal-account .close-modal').click()
        self.invite().wait_for(state='visible')
        self.page.locator('#account-invite-create').click()
        self.assertEqual(self.page.evaluate('window.accountMode'), 'signup')
        self.assertEqual(self.page.locator('#account-title').inner_text(), 'Create your account')

    def test_auth_changes_cancel_timer_and_hide_visible_invite(self):
        self.emit(); self.page.wait_for_timeout(30)
        self.emit("{uid:'x',email:'a@example.com'}")
        self.page.wait_for_timeout(250); self.assertTrue(self.invite().is_hidden())
        self.emit(); self.invite().wait_for(state='visible')
        self.emit("{uid:'x',email:'a@example.com'}")
        self.assertTrue(self.invite().is_hidden())

    def test_auth_error_fails_closed_and_close_button_works(self):
        self.page.evaluate('window.__authError()'); self.page.wait_for_timeout(200)
        self.assertTrue(self.invite().is_hidden())
        self.emit(); self.invite().wait_for(state='visible')
        self.page.locator('#account-invite-close').click()
        self.assertTrue(self.invite().is_hidden())
        self.assertEqual(self.page.evaluate('sessionStorage.getItem("gamingnest-account-invite-dismissed")'), '1')


if __name__ == '__main__': unittest.main(verbosity=2)
