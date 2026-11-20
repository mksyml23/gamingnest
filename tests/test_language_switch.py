#!/usr/bin/env python3
"""Offline generated-page coverage using the existing mocked Firebase harness."""
import unittest
from test_account_invite import InviteTests

class LanguageTests(InviteTests):
    def choose(self, locale):
        self.page.locator("#language-trigger").click()
        self.page.locator(f'[data-language="{locale}"]').click()

    def test_switch_and_reload_preserve_search_and_account(self):
        self.emit()
        p = self.page
        p.locator('#search').fill('aces')
        self.choose('nl')
        self.assertEqual(p.locator('html').get_attribute('lang'), 'nl')
        self.assertEqual(p.locator('#search').input_value(), 'aces')
        self.assertIn('games klaar', p.locator('#results-summary').inner_text())
        self.assertIn('Populair', p.locator('.categories button').first.inner_text())
        self.assertEqual(p.locator('#account-invite-create').inner_text(), 'Account aanmaken')
        self.assertEqual(p.locator('#account-title').inner_text(), 'Maak je account aan')
        p.evaluate('window.switchAccountMode()')
        p.wait_for_function("document.querySelector('#account-title').textContent === 'Welkom terug'")
        self.choose('en')
        self.assertEqual(p.locator('#account-title').inner_text(), 'Welcome back')
        self.assertEqual(p.locator('#search').input_value(), 'aces')
        self.choose('nl')
        p.reload(wait_until='domcontentloaded')
        self.assertEqual(p.locator('html').get_attribute('lang'), 'nl')
        self.assertEqual(p.locator('[data-language="nl"]').get_attribute('aria-pressed'), 'true')
        self.assertEqual(p.locator('#language-current').inner_text(), 'NL')

    def test_invalid_preference_fallback_and_signed_in_identity(self):
        p = self.page
        p.evaluate("localStorage.setItem('gn_locale', 'xx')")
        p.reload(wait_until='domcontentloaded')
        p.wait_for_function('window.__listeners.length >= 2')
        self.assertIn(p.locator('html').get_attribute('lang'), ['en','nl'])
        self.emit("{uid:'returning',email:'return@example.com'}")
        self.choose('nl')
        self.assertEqual(p.locator('#account-subtitle').inner_text(), 'return@example.com')
        self.assertEqual(p.locator('#logout-button').inner_text(), 'Uitloggen')
        self.choose('en')
        self.assertEqual(p.locator('#logout-button').inner_text(), 'Log out')
        self.assertTrue(self.invite().is_hidden())

    def test_feedback_and_mobile_width(self):
        p = self.page
        self.choose('nl')
        p.evaluate("window.openFeedback('ACES', null)")
        self.assertEqual(p.locator('#modal-subtitle').inner_text(), 'Feedback voor: ACES')
        self.assertEqual(p.locator('#modal-contact textarea').get_attribute('placeholder'), 'Typ hier...')
        p.evaluate("window.closeModal('modal-contact')")
        box = p.locator('.language-control').bounding_box()
        self.assertGreaterEqual(box['x'], 0)
        self.assertLessEqual(box['x'] + box['width'], 390)

if __name__ == '__main__':
    suite = unittest.TestSuite(LanguageTests(name) for name in ('test_switch_and_reload_preserve_search_and_account','test_invalid_preference_fallback_and_signed_in_identity','test_feedback_and_mobile_width'))
    import sys
    sys.exit(not unittest.TextTestRunner(verbosity=2).run(suite).wasSuccessful())
