// Dependency-free offline behavior tests for the production invitation module.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('soepgames/account-invite.js', 'utf8').replace(/^import .*;\s*$/gm, '');
function setup({stored = false, blocked = false} = {}) {
  let now = 0, nextId = 1, pending = new Map(), listener, error;
  const handlers = {};
  const auth = {currentUser: null};
  const document = {hidden:false, activeElement:null, addEventListener(type, fn) { handlers[type] = fn; }};
  const el = id => ({id, hidden:false, display:'none', handlers:{}, focus() { document.activeElement = this; }, addEventListener(type, fn) { this.handlers[type] = fn; }, click() { this.handlers.click(); }});
  const invite = el('account-invite'); invite.hidden = true;
  const close = el('account-invite-close'), create = el('account-invite-create'), dock = el('account-dock-button'), email = el('account-email');
  invite.contains = target => target === close || target === create;
  const modal = el('modal-account'); modal.display = blocked ? 'flex' : 'none';
  const nodes = Object.fromEntries([invite,close,create,dock,email,modal].map(n => [n.id,n]));
  document.getElementById = id => nodes[id];
  document.querySelectorAll = () => [modal];
  const store = stored ? {'gamingnest-account-invite-dismissed':'1'} : {};
  let opened = 0;
  const window = {accountMode:'signup', openAccount() { opened++; modal.display = 'flex'; }, switchAccountMode() { window.accountMode = window.accountMode === 'login' ? 'signup' : 'login'; }};
  const setTimeout = (fn, ms) => { const id = nextId++; pending.set(id,{fn, at:now+ms}); return id; };
  const clearTimeout = id => pending.delete(id);
  const context = {auth, document, window, setTimeout, clearTimeout, getComputedStyle: el => ({display:el.display}), sessionStorage:{getItem: key => store[key], setItem: (key,val) => store[key]=val}, onAuthStateChanged: (_auth, cb, err) => {listener = cb; error = err;}};
  vm.runInNewContext(source, context);
  function advance(ms) { const end = now + ms; while (true) { const entries = [...pending.entries()].sort((a,b) => a[1].at-b[1].at); if (!entries.length || entries[0][1].at > end) break; const [id, job] = entries[0]; pending.delete(id); now=job.at; job.fn(); } now=end; }
  function emit(user) { auth.currentUser = user; listener(user); }
  return {invite, close, create, dock, email, modal, auth, window, document, store, advance, emit, error: () => error(new Error()), key: k => handlers.keydown({key:k, preventDefault() {}}), opened: () => opened};
}
{
 const t=setup(); t.advance(100000); assert(t.invite.hidden, 'unresolved authentication must never show'); t.emit({uid:'signed-in'}); t.advance(100000); assert(t.invite.hidden, 'signed-in must never show');
}
{
 const t=setup(); t.emit(null); t.advance(7999); assert(t.invite.hidden); t.advance(1); assert(!t.invite.hidden); t.close.focus(); t.key('Escape'); assert(t.invite.hidden); assert.equal(t.document.activeElement,t.dock); assert.equal(t.store['gamingnest-account-invite-dismissed'],'1'); t.emit(null); t.advance(9000); assert(t.invite.hidden);
}
{
 const t=setup({stored:true}); t.emit(null); t.advance(10000); assert(t.invite.hidden);
}
{
 const t=setup(); t.emit(null); t.advance(7999); t.emit({uid:'x'}); t.advance(9000); assert(t.invite.hidden); t.emit(null); t.advance(8000); assert(!t.invite.hidden); t.emit({uid:'x'}); assert(t.invite.hidden);
}
{
 const t=setup({blocked:true}); t.emit(null); t.advance(8000); assert(t.invite.hidden); t.modal.display='none'; t.advance(2000); assert(!t.invite.hidden); t.window.accountMode='login'; t.create.click(); assert.equal(t.window.accountMode,'signup'); assert.equal(t.opened(),1); assert(t.invite.hidden); assert.equal(t.document.activeElement,t.email);
}
{
 const t=setup(); t.emit(null); t.error(); t.advance(10000); assert(t.invite.hidden); t.emit(null); t.advance(8000); t.close.click(); assert(t.invite.hidden);
}
{
 const t=setup(); t.emit(null); t.advance(8000); t.auth.currentUser={uid:'new'}; t.create.click(); assert.equal(t.opened(),0); assert(t.invite.hidden);
}
console.log('PASS: unresolved/signed-in/signed-out timing, close/Escape/session/focus, auth changes/errors, existing modal, signup CTA and stale state');
