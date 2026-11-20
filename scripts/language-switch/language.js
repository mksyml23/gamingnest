(() => {
  'use strict';
  const messages = window.GNMessages;
  let saved;
  try { saved = localStorage.getItem('gn_locale'); } catch (_) {}
  let locale = saved === 'nl' || saved === 'en' ? saved : ((navigator.language || '').toLowerCase().startsWith('nl') ? 'nl' : 'en');
  const t = (key, vars = {}) => (messages[locale][key] || messages.en[key] || key).replace(/\{(\w+)\}/g, (_, k) => vars[k] ?? '');
  const setText = (selector, value) => { const el = document.querySelector(selector); if (el && el.textContent !== value) el.textContent = value; };
  function updateAccount() {
    // Translate only known UI strings. Never touch the user identity or account messages.
    const pairs = [
      ['#account-title', ['Create your account','Welcome back','Welcome back!'], ['Maak je account aan','Welkom terug','Welkom terug!']],
      ['#account-subtitle', ['Create an account or log in to GamingNest.','Log in to continue your GamingNest journey.'], ['Maak een account aan of log in bij GamingNest.','Log in om verder te gaan bij GamingNest.']],
      ['#account-submit', ['Create Account','Log In'], ['Account aanmaken','Inloggen']],
      ['#account-switch-text', ['Already have an account?',"Don't have an account?"], ['Heb je al een account?','Nog geen account?']],
      ['#account-switch-button', ['Log in','Create account'], ['Inloggen','Account aanmaken']],
      ['#account-reset', ['Forgot password?'], ['Wachtwoord vergeten?']],
      ['#logout-button', ['Log out'], ['Uitloggen']],
      ['.account-divider', ['OR'], ['OF']],
      ...(window.GNAccountMessageTranslations ? [window.GNAccountMessageTranslations] : [])
    ];
    for (const [selector, en, nl] of pairs) {
      const el = document.querySelector(selector); if (!el) continue;
      const text = el.textContent.trim(); let index = en.indexOf(text); if (index < 0) index = nl.indexOf(text);
      if (index >= 0) { const target = (locale === 'nl' ? nl : en)[index]; if (el.textContent !== target) el.textContent = target; }
    }
    const password = document.getElementById('account-password');
    if (password) { password.placeholder = locale === 'nl' ? 'Wachtwoord' : 'Password'; password.setAttribute('aria-label', password.placeholder); }
    const google = document.getElementById('google-login');
    if (google) { const node = [...google.childNodes].find(n => n.nodeType === 3 && n.textContent.trim()); if (node) { const value = locale === 'nl' ? ' Doorgaan met Google' : ' Continue with Google'; if (node.textContent !== value) node.textContent = value; } }
  }
  function apply() {
    document.documentElement.lang = locale;
    document.querySelectorAll('[data-i18n]').forEach(el => { el.textContent = t(el.dataset.i18n); });
    document.querySelectorAll('.categories button').forEach((el, i) => { const key = ['popular','liked','newest','all'][i]; if (key) el.textContent = t(key); });
    const search = document.getElementById('search'); if (search) { search.placeholder = t('search'); search.setAttribute('aria-label', t('searchLabel')); }
    const trigger = document.getElementById('language-trigger');
    trigger.setAttribute('aria-label', `${t('choose')}: ${t('current')}`);
    document.querySelector('.language-control__options').setAttribute('aria-label', t('choose'));
    document.querySelectorAll('[data-language]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.language === locale)));
    setText('#language-current', locale.toUpperCase());
    setText('.hero-desc h2', t('heading')); const intro = document.querySelector('.hero-desc p'); if (intro) intro.innerHTML = t('intro');
    const footer = document.getElementById('homepage-description'); if (footer) { footer.querySelector('h2').textContent = t('footerTitle'); footer.querySelectorAll('p').forEach((p,i) => { p.textContent = t('footer' + (i+1)); }); }
    setText('#account-invite-title', t('inviteTitle')); setText('#account-invite p', t('inviteText')); setText('#account-invite-create', t('inviteButton')); setText('#account-invite-login', locale === 'nl' ? 'Inloggen' : 'Log in');
    document.getElementById('account-invite-close')?.setAttribute('aria-label', t('inviteClose'));
    const feedback = document.getElementById('modal-subtitle'); if (feedback) feedback.textContent = feedback.dataset.game ? t('feedbackFor', {game: feedback.dataset.game}) : t('feedbackDefault');
    for (const [selector, placeholder, label] of [['#modal-contact input[name="name"]','feedbackName','feedbackName'],['#modal-contact input[name="email"]','feedbackEmail','feedbackEmail'],['#modal-contact textarea','feedbackMessage','messageLabel']]) { const el = document.querySelector(selector); if (el) { el.placeholder = t(placeholder); el.setAttribute('aria-label', t(label)); } }
    setText('#modal-contact .submit-btn', t('submit')); document.querySelector('#modal-contact .close-modal')?.setAttribute('aria-label', t('close'));
    const stats = document.querySelectorAll('.hero-stats > div');
    const labels = locale === 'nl' ? ['🎮 18 games', '👥 3600+ keer gespeeld', '❤️ 500+ likes'] : ['🎮 18 Games', '👥 3600+ Plays', '❤️ 500+ Likes'];
    stats.forEach((el, i) => { if (labels[i] && el.textContent !== labels[i]) el.textContent = labels[i]; });
    document.querySelector('.dock')?.setAttribute('aria-label', locale === 'nl' ? 'Sociale media' : 'Social Media Links');
    document.querySelector('#modal-account .close-modal')?.setAttribute('aria-label', locale === 'nl' ? 'Accountvenster sluiten' : 'Close account');
    updateAccount();
  }

  window.GNLanguage = { get locale() { return locale; }, t, nestor: text => locale === 'nl' ? ((window.GNNestorNL || {})[text] || text) : text };
  const control = document.getElementById('language-control');
  const trigger = document.getElementById('language-trigger');
  control.querySelectorAll('[data-language]').forEach(button => button.addEventListener('click', () => {
    const next = button.dataset.language;
    control.open = false;
    trigger.focus();
    if ((next !== 'en' && next !== 'nl') || next === locale) return;
    locale = next; try { localStorage.setItem('gn_locale', locale); } catch (_) {}
    apply(); window.dispatchEvent(new Event('gn-language-change'));
  }));
  control.addEventListener('keydown', e => {
    if (e.key === 'Escape' && control.open) { e.preventDefault(); control.open = false; trigger.focus(); }
  });
  control.addEventListener('focusout', e => {
    if (control.open && e.relatedTarget && !control.contains(e.relatedTarget)) control.open = false;
  });
  document.addEventListener('click', e => { if (control.open && !control.contains(e.target)) control.open = false; });
  apply();
  // The invitation is appended later in the document by the build pipeline.
  document.addEventListener('DOMContentLoaded', apply, {once:true});
  const account = document.getElementById('modal-account');
  if (account) new MutationObserver(updateAccount).observe(account, {childList:true, subtree:true, characterData:true});
})();
