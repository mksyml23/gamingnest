#!/usr/bin/env python3
"""Offline Chromium regression for the reconstructed homepage (no network)."""
import json
from pathlib import Path
import sys
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
HTML = Path(sys.argv[1]).read_text() if len(sys.argv) > 1 else (ROOT / 'soepgames/index.html').read_text()
BASELINE = '--baseline' in sys.argv
MOCK = r'''
export const firestore = {};
export const doc = (...x) => x;
export const collection = (...x) => x;
export const query = (...x) => x;
export const orderBy = (...x) => x;
export const limit = (...x) => x;
export const increment = x => x;
export async function updateDoc() { window.__writes++; throw new Error('blocked write'); }
export async function setDoc() { window.__writes++; throw new Error('blocked write'); }
export async function getDoc() { await window.__statsGate; return {exists: () => true, data: () => window.__fixture}; }
export async function getDocs() { await window.__hallGate; return {empty: false, forEach: f => f({data: () => ({username: '<img src=x onerror=alert(1)>', reason: '<script>bad()</script>', date: 'today'})})}; }
'''
INIT = r'''
sessionStorage.setItem('visited_gn','true');
localStorage.setItem('gameOfTheDay', JSON.stringify({date: new Date().toISOString().split('T')[0], id: 'tictac'}));
window.__writes = 0;
window.__statsGate = new Promise(resolve => window.__resolveStats = resolve);
window.__hallGate = new Promise(resolve => window.__resolveHall = resolve);
window.__fixture = {aces: 371, justclick: 117, tictac: 47, index: 4057, likes: {aces: 94, justclick: 36, tictac: 8}};
'''

def run(browser, kind, expected_old=False):
    page = browser.new_page()
    page.add_init_script(INIT)
    errors = []
    page.on('pageerror', lambda e: errors.append(str(e)))
    def route(r):
        url = r.request.url
        if url == 'http://site.invalid/':
            r.fulfill(status=200, content_type='text/html', body=HTML)
        elif url == 'http://site.invalid/firebase-app.js':
            r.fulfill(status=200, content_type='text/javascript', body=MOCK)
        else:
            r.abort()
    page.route('**/*', route)
    page.goto('http://site.invalid/', wait_until='load')
    if kind == 'fast':
        page.evaluate('__resolveStats(); __resolveHall()')
        page.wait_for_function("document.querySelector('[data-game=aces]')?.innerText.includes('371')")
    else:
        if kind == 'late-hall-ready': page.evaluate('__resolveHall()')
        page.wait_for_selector('[data-game=aces]', timeout=3000)
        before = page.locator('[data-game=aces]').inner_text()
        assert '371' not in before and '0' in before, ('fallback should render before stats', before)
        # Preserve user filtering even while data is pending.
        if kind == 'late-search': page.locator('#search').fill('ACES')
        page.evaluate('__resolveStats()')
        if expected_old:
            page.wait_for_timeout(500)
            assert '371' not in page.locator('[data-game=aces]').inner_text(), 'baseline unexpectedly refreshed'
        else:
            page.wait_for_function("document.querySelector('[data-game=aces]')?.innerText.includes('371')", timeout=2000)
        if kind == 'late-search': assert page.locator('article').count() == 1
        if kind in ('late-hall-pending','late-search'): page.evaluate('__resolveHall()')
    if not expected_old:
        aces = page.locator('[data-game=aces]').inner_text()
        tictac = page.locator('[data-game=tictac]').inner_text() if kind != 'late-search' else ''
        assert '371' in aces and '94' in aces, aces
        if tictac: assert '47' in tictac and '8' in tictac, tictac
        if kind != 'late-search':
            page.evaluate("setCategory('liked')")
            ids = page.locator('article').evaluate_all('(els) => els.map(e => e.dataset.game)')
            assert ids[:3] == ['tictac', 'aces', 'justclick'], ids[:3]
        page.wait_for_selector('.hof-card')
        assert page.locator('.hof-card img, .hof-card script').count() == 0
        assert '<img src=x onerror=alert(1)>' in page.locator('.hof-card').inner_text()
    assert page.evaluate('__writes') == 0
    assert not errors, errors
    page.close()
    print('PASS', kind, '(baseline reproduces stale zeros)' if expected_old else '')

def invalid(browser):
    page = browser.new_page()
    page.add_init_script(INIT + "\nwindow.__fixture.aces='<img src=x onerror=alert(1)>'; window.__fixture.likes.aces=-5; window.__fixture.justclick=Number.MAX_SAFE_INTEGER+1;")
    def route(r):
        if r.request.url == 'http://site.invalid/': r.fulfill(status=200, content_type='text/html', body=HTML)
        elif r.request.url == 'http://site.invalid/firebase-app.js': r.fulfill(status=200, content_type='text/javascript', body=MOCK)
        else: r.abort()
    page.route('**/*', route)
    page.goto('http://site.invalid/', wait_until='load')
    page.wait_for_selector('[data-game=aces]')
    page.evaluate('__resolveStats(); __resolveHall()')
    page.wait_for_selector('.hof-card')
    page.wait_for_timeout(100)
    aces = page.locator('[data-game=aces]')
    assert aces.locator('.hover-stats').inner_text().strip().split() == ['0', '0']
    assert aces.locator('img').count() == 1 and aces.locator('script').count() == 0
    assert page.locator('[data-game=justclick] .hover-stats').inner_text().split()[0] == '0'
    assert page.locator('.hof-card img, .hof-card script').count() == 0
    assert page.evaluate('__writes') == 0
    page.close()
    print('PASS malformed counters and Hall of Fame XSS')

with sync_playwright() as p:
    browser = p.chromium.launch(executable_path='/usr/bin/chromium', headless=True, args=['--no-sandbox'])
    if BASELINE:
        run(browser, 'late-hall-ready', expected_old=True)
    else:
        for kind in ['fast', 'late-hall-ready', 'late-hall-pending', 'late-search']:
            run(browser, kind)
        invalid(browser)
    browser.close()
