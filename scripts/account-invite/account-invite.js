import { auth } from '/firebase-app.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js';

const invite = document.getElementById('account-invite');
const closeButton = document.getElementById('account-invite-close');
const createButton = document.getElementById('account-invite-create');
const loginButton = document.getElementById('account-invite-login');
const accountModal = document.getElementById('modal-account');
const dock = document.getElementById('account-dock-button');
const storageKey = 'gamingnest-account-invite-dismissed';
let dismissed = false;
let signedOut = false;
let timer;
let previousFocus = null;
let accountWasOpen = false;
try { dismissed = sessionStorage.getItem(storageKey) === '1'; } catch (_) { /* page-only dismissal */ }

function modalOpen(el) { return getComputedStyle(el).display !== 'none'; }
function otherModalOpen() { return [...document.querySelectorAll('.modal-overlay')].some(modalOpen); }
function hide() { clearTimeout(timer); timer = undefined; invite.hidden = true; }
function schedule(delay) { clearTimeout(timer); timer = setTimeout(showWhenReady, delay); }
function dismiss() {
  const hadFocus = invite.contains(document.activeElement);
  dismissed = true;
  try { sessionStorage.setItem(storageKey, '1'); } catch (_) { /* page-only dismissal */ }
  hide();
  if (hadFocus) dock?.focus();
}
function showWhenReady() {
  timer = undefined;
  if (dismissed || !signedOut || auth.currentUser) return;
  if (document.hidden || typeof window.openAccount !== 'function' ||
      typeof window.switchAccountMode !== 'function' || otherModalOpen()) {
    schedule(2000);
    return;
  }
  invite.hidden = false;
}
onAuthStateChanged(auth, user => {
  const hadFocus = invite.contains(document.activeElement);
  hide();
  signedOut = !user;
  if (hadFocus && user) dock?.focus();
  if (signedOut && !dismissed) schedule(8000);
}, () => { signedOut = false; hide(); });
closeButton.addEventListener('click', dismiss);
function openMode(mode) {
  if (!signedOut || auth.currentUser || typeof window.openAccount !== 'function' ||
      typeof window.switchAccountMode !== 'function') { hide(); return; }
  if (window.accountMode !== mode) window.switchAccountMode();
  if (window.accountMode !== mode) return;
  dismiss();
  window.openAccount();
  document.getElementById('account-email')?.focus();
}
createButton.addEventListener('click', () => openMode('signup'));
loginButton.addEventListener('click', () => openMode('login'));

// Existing modals may open after the invitation has appeared. Never overlay them.
const modalObserver = new MutationObserver(() => {
  if (!invite.hidden && otherModalOpen()) { hide(); if (signedOut && !dismissed) schedule(2000); }
  const open = modalOpen(accountModal);
  if (open && !accountWasOpen) {
    previousFocus = accountModal.contains(document.activeElement) ? dock : document.activeElement;
    if (!accountModal.contains(document.activeElement)) {
      (auth.currentUser ? document.getElementById('logout-button') : document.getElementById('account-email'))?.focus();
      if (!accountModal.contains(document.activeElement)) accountModal.querySelector('.close-modal')?.focus();
    }
  } else if (!open && accountWasOpen && previousFocus?.isConnected && !otherModalOpen()) {
    previousFocus.focus();
  }
  accountWasOpen = open;
});
document.querySelectorAll('.modal-overlay').forEach(el => modalObserver.observe(el, {attributes:true, attributeFilter:['style', 'class', 'hidden']}));

document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !invite.hidden && invite.contains(document.activeElement)) {
    event.preventDefault(); dismiss(); return;
  }
  if (!modalOpen(accountModal)) return;
  if (event.key === 'Escape') {
    event.preventDefault(); accountModal.style.display = 'none'; return;
  }
  if (event.key !== 'Tab') return;
  const items = [...accountModal.querySelectorAll('button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])')]
    .filter(el => el.getClientRects().length && getComputedStyle(el).visibility !== 'hidden');
  if (!items.length) { event.preventDefault(); return; }
  if (event.shiftKey && (document.activeElement === items[0] || !accountModal.contains(document.activeElement))) {
    event.preventDefault(); items[items.length - 1].focus();
  } else if (!event.shiftKey && (document.activeElement === items[items.length - 1] || !accountModal.contains(document.activeElement))) {
    event.preventDefault(); items[0].focus();
  }
});
