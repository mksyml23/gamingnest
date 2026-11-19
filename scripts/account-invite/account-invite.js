import { auth } from '/firebase-app.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

// Never infer signed-out state from currentUser before Firebase's first callback.
const invite = document.getElementById('account-invite');
const closeButton = document.getElementById('account-invite-close');
const createButton = document.getElementById('account-invite-create');
const storageKey = 'gamingnest-account-invite-dismissed';
let dismissed = false;
let signedOut = false;
let timer;
try { dismissed = sessionStorage.getItem(storageKey) === '1'; } catch (_) { /* optional storage */ }

function hide() {
  clearTimeout(timer);
  invite.hidden = true;
}
function dismiss() {
  const hadFocus = invite.contains(document.activeElement);
  dismissed = true;
  try { sessionStorage.setItem(storageKey, '1'); } catch (_) { /* remember for this page */ }
  hide();
  if (hadFocus) document.getElementById('account-dock-button')?.focus();
}
function showWhenReady() {
  if (dismissed || !signedOut || auth.currentUser) return;
  // Do not interrupt another modal or open in a background tab.
  if (document.hidden || typeof window.openAccount !== 'function' ||
      [...document.querySelectorAll('.modal-overlay')].some(el => getComputedStyle(el).display !== 'none')) {
    timer = setTimeout(showWhenReady, 2000);
    return;
  }
  invite.hidden = false;
}
onAuthStateChanged(auth, user => {
  hide();
  signedOut = !user;
  if (signedOut && !dismissed) timer = setTimeout(showWhenReady, 8000);
}, () => {
  // On an auth error, fail closed rather than guessing the visitor is signed out.
  signedOut = false;
  hide();
});
closeButton.addEventListener('click', dismiss);
createButton.addEventListener('click', () => {
  if (!signedOut || auth.currentUser || typeof window.openAccount !== 'function') { hide(); return; }
  dismiss();
  if (window.accountMode === 'login') window.switchAccountMode();
  window.openAccount();
  document.getElementById('account-email')?.focus();
});
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !invite.hidden && invite.contains(document.activeElement)) {
    event.preventDefault();
    dismiss();
  }
});
