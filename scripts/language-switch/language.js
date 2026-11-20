(() => {
  'use strict';
  const messages = {
    en: { heroEyebrow:'Instant browser games', heroTitle:'Your next favourite game is already loaded.', heroText:'Pick a game, hit play, and jump straight in. No installs, no account required.', popular:'🔥 Popular', liked:'❤️ Most Liked', newest:'🆕 New', all:'🎮 All Games', search:'Search free browser games...', searchLabel:'Search for games', play:'Play', playNow:'Play Now', gameOfDay:'Game of the Day', featured:'One of GamingNest’s featured games. Jump in and see what makes it special.', results:'{count} games ready to play', noResults:'No games found. Try another title.', noResultsHint:'Nestor checked everywhere. Even behind the arcade cabinet.', heading:'Play Free Games Online Without Downloading', intro:'Play <strong style="color:#00bfff;">free online browser games</strong> instantly. No downloads. Just click and play action, idle, strategy and multiplayer games.', footerTitle:'Play Free Browser Games Online', footer1:'GamingNest is a free online gaming platform where you can play browser games instantly without downloads. Discover action games, idle games, strategy games and multiplayer games all in one place.', footer2:'Our games load directly in your browser, meaning you can start playing in seconds. No installation, no registration required, just click and play.', footer3:'Whether you enjoy fast-paced action, relaxing idle games, or competitive multiplayer experiences, GamingNest offers a growing collection of free games optimized for desktop and mobile.', label:'Language', current:'English', choose:'Choose language', inviteTitle:'Make GamingNest yours', inviteText:'Create a GamingNest account, or log in if you already have one. You can still play without an account.', inviteButton:'Create an account', inviteClose:'Dismiss account invitation', feedbackFor:'Feedback for: {game}', feedbackDefault:"What's on your mind?", feedbackName:'Your Name', feedbackEmail:'Your Email', feedbackMessage:'Type here...', messageLabel:'Your Message', submit:'Submit', close:'Close modal', hofLoading:'Loading legends...', hofEmpty:'No legends have been forged yet.', hofFirst:'Will you be the first?', hofFailed:'Failed to load Hall of Fame.', like:'Like {game}', feedback:'Give feedback on {game}', image:'Play {game} - Free Online Browser Game' },
    nl: { heroEyebrow:'Direct in je browser', heroTitle:'Je volgende favoriete game staat al klaar.', heroText:'Kies een game, druk op spelen en ga meteen los. Geen installatie en geen account nodig.', popular:'🔥 Populair', liked:'❤️ Meest geliket', newest:'🆕 Nieuw', all:'🎮 Alle games', search:'Zoek gratis browsergames...', searchLabel:'Zoek naar games', play:'Spelen', playNow:'Nu spelen', gameOfDay:'Game van de dag', featured:'Een uitgelichte GamingNest-game. Start hem en ontdek waarom.', results:'{count} games klaar om te spelen', noResults:'Geen games gevonden. Probeer een andere titel.', noResultsHint:'Nestor heeft overal gekeken. Zelfs achter de arcadekast.', heading:'Speel gratis online games zonder download', intro:'Speel direct <strong style="color:#00bfff;">gratis online browsergames</strong>. Geen downloads. Klik en speel actie-, idle-, strategie- en multiplayerspellen.', footerTitle:'Speel gratis browsergames online', footer1:'GamingNest is een gratis online spelplatform waar je direct browsergames speelt zonder downloads. Ontdek actie-, idle-, strategie- en multiplayergames op één plek.', footer2:'Onze games laden direct in je browser, zodat je binnen enkele seconden kunt spelen. Geen installatie of registratie nodig: klik en speel.', footer3:'Of je nu houdt van snelle actie, ontspannende idle-games of competitieve multiplayer: GamingNest biedt een groeiende verzameling gratis games voor desktop en mobiel.', label:'Taal', current:'Nederlands', choose:'Kies taal', inviteTitle:'Maak GamingNest van jou', inviteText:'Maak een GamingNest-account aan of log in als je er al een hebt. Je kunt ook zonder account spelen.', inviteButton:'Account aanmaken', inviteClose:'Accountuitnodiging sluiten', feedbackFor:'Feedback voor: {game}', feedbackDefault:'Wat wil je ons vertellen?', feedbackName:'Je naam', feedbackEmail:'Je e-mailadres', feedbackMessage:'Typ hier...', messageLabel:'Je bericht', submit:'Versturen', close:'Venster sluiten', hofLoading:'Legendes laden...', hofEmpty:'Er zijn nog geen legendes gemaakt.', hofFirst:'Ben jij de eerste?', hofFailed:'Hall of Fame kon niet worden geladen.', like:'Like {game}', feedback:'Geef feedback over {game}', image:'Speel {game} - gratis online browsergame' }
  };
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
      ['.account-divider', ['OR'], ['OF']]
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
    const picker = document.getElementById('language-select'); picker.value = locale; picker.setAttribute('aria-label', t('choose'));
    setText('#language-label', t('label')); setText('#language-current', t('current'));
    setText('.hero-desc h2', t('heading')); const intro = document.querySelector('.hero-desc p'); if (intro) intro.innerHTML = t('intro');
    const footer = document.getElementById('homepage-description'); if (footer) { footer.querySelector('h2').textContent = t('footerTitle'); footer.querySelectorAll('p').forEach((p,i) => { p.textContent = t('footer' + (i+1)); }); }
    setText('#account-invite-title', t('inviteTitle')); setText('#account-invite p', t('inviteText')); setText('#account-invite-create', t('inviteButton')); setText('#account-invite-login', locale === 'nl' ? 'Inloggen' : 'Log in');
    document.getElementById('account-invite-close')?.setAttribute('aria-label', t('inviteClose'));
    const feedback = document.getElementById('modal-subtitle'); if (feedback) feedback.textContent = feedback.dataset.game ? t('feedbackFor', {game: feedback.dataset.game}) : t('feedbackDefault');
    for (const [selector, placeholder, label] of [['#modal-contact input[name="name"]','feedbackName','feedbackName'],['#modal-contact input[name="email"]','feedbackEmail','feedbackEmail'],['#modal-contact textarea','feedbackMessage','messageLabel']]) { const el = document.querySelector(selector); if (el) { el.placeholder = t(placeholder); el.setAttribute('aria-label', t(label)); } }
    setText('#modal-contact .submit-btn', t('submit')); document.querySelector('#modal-contact .close-modal')?.setAttribute('aria-label', t('close'));
    updateAccount();
  }
  window.GNLanguage = { get locale() { return locale; }, t };
  document.getElementById('language-select').addEventListener('change', e => {
    if (e.target.value !== 'en' && e.target.value !== 'nl') return;
    locale = e.target.value; try { localStorage.setItem('gn_locale', locale); } catch (_) {}
    apply(); window.dispatchEvent(new Event('gn-language-change'));
  });
  apply();
  // The invitation is appended later in the document by the build pipeline.
  document.addEventListener('DOMContentLoaded', apply, {once:true});
  const account = document.getElementById('modal-account');
  if (account) new MutationObserver(updateAccount).observe(account, {childList:true, subtree:true, characterData:true});
})();
