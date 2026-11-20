// Offline test against the generated homepage and the real account module.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const html = fs.readFileSync('soepgames/index.html', 'utf8');
const start = html.indexOf('let accountMode = "signup";');
const end = html.indexOf('        function openAdminPanel()', start);
assert(start >= 0 && end > start);
const switchSource = html.slice(start, end);
const firebase = fs.readFileSync('soepgames/firebase-app.js', 'utf8');
const uiSource = firebase.slice(firebase.indexOf('// ACCOUNT UI LOGICA'), firebase.indexOf('// EXPORTS VOOR INDEX.HTML'));
assert(uiSource.length > 100);

function setup() {
  const nodes = {}, calls = [];
  function element(id) {
    return nodes[id] = {id, style:{}, disabled:false, value:'', textContent:'', innerText:'',
      handlers:{}, addEventListener(k, f) { this.handlers[k] = f; },
      click() { if (!this.disabled) return this.handlers.click?.(); }};
  }
  for (const id of ['google-login','account-submit','account-reset','account-email','account-password',
                    'account-error','account-title','account-subtitle','account-switch-text','account-switch-button']) element(id);
  const divider = {style:{}};
  let original = '<span id="account-switch-text"></span><button id="account-switch-button"></button>';
  const switchBox = {get innerHTML() { return original; }, set innerHTML(value) {
    original = value;
    delete nodes['account-switch-button']; delete nodes['account-switch-text']; delete nodes['logout-button'];
    if (value.includes('id="logout-button"')) element('logout-button');
    else { element('account-switch-text'); element('account-switch-button'); }
  }};
  const document = {getElementById:id=>nodes[id] || null,
    querySelector:s=>s === '.account-switch' ? switchBox : s === '.account-divider' ? divider : null};
  let observer, failure, resolve, reject;
  const pending = new Promise((a,b) => { resolve=a; reject=b; });
  const action = name => async (_auth, email) => {
    calls.push(name); await pending;
    if (name === 'reset') return;
    const user={uid:'fake', email:typeof email === 'string' ? email : 'fake@example.invalid'};
    observer(user); return {user};
  };
  const ctx = {document, window:{}, console, Promise, auth:{}, firestore:{}, GoogleAuthProvider:class {},
    doc:()=>({}), getDoc:async()=>({exists:()=>true}), setDoc:async()=>{}, serverTimestamp:()=>0,
    onAuthStateChanged:(_auth, next, error)=>{observer=next; failure=error;},
    createUserWithEmailAndPassword:action('signup'), signInWithEmailAndPassword:action('login'),
    sendPasswordResetEmail:action('reset'), signInWithPopup:action('google'), signOut:async()=>observer(null)};
  vm.createContext(ctx); vm.runInContext(switchSource,ctx); vm.runInContext(uiSource,ctx);
  const toggle = () => vm.runInContext('switchAccountMode()',ctx);
  observer(null);
  nodes['account-email'].value='fake@example.invalid'; nodes['account-password'].value='fake-password';
  return {nodes,calls,ctx,observer,failure,resolve,reject,toggle};
}

(async () => {
  for (const name of ['signup','login','reset','google']) for (const success of [false,true]) {
    const t=setup();
    if (name==='login' || name==='reset') t.toggle();
    const original=t.ctx.window.accountMode;
    const id={signup:'account-submit',login:'account-submit',reset:'account-reset',google:'google-login'}[name];
    const running=t.nodes[id].click();
    assert.deepEqual(t.calls,[name]);
    assert.equal(t.nodes['account-switch-button'].disabled,true,`${name} pending`);
    t.toggle(); // Programmatic call must be guarded as well as native click.
    assert.equal(t.ctx.window.accountMode,original);
    if (success) t.resolve(); else t.reject({code:'auth/network-request-failed',message:'secret-test-detail'});
    await running;
    if (success && name !== 'reset') t.observer(null);
    assert.equal(t.nodes['account-switch-button'].disabled,false,`${name} completed`);
    if (!success) {
      assert.match(t.nodes['account-error'].textContent,/Network/);
      assert(!t.nodes['account-error'].textContent.includes('secret-test-detail'));
    }
    if (success && name === 'reset') assert.match(t.nodes['account-error'].textContent,/reset email may arrive/);
    t.toggle(); assert.notEqual(t.ctx.window.accountMode,original);
    assert.equal(t.nodes['account-error'].textContent,'');
  }
  {
    const t=setup(); const running=t.nodes['account-reset'].click();
    t.observer({uid:'another',email:'fake@example.invalid'}); t.observer(null);
    assert.equal(t.nodes['account-switch-button'].disabled,true);
    t.toggle(); assert.equal(t.ctx.window.accountMode,'signup');
    t.resolve(); await running; assert.equal(t.nodes['account-switch-button'].disabled,false);
    assert.match(t.nodes['account-error'].textContent,/reset email may arrive/);
    t.toggle(); assert.equal(t.nodes['account-error'].textContent,'');
  }
  {
    const t=setup(); const running=t.nodes['account-reset'].click();
    t.failure(new Error('offline')); t.resolve(); await running;
    assert.equal(t.nodes['account-submit'].disabled,true);
    assert.equal(t.nodes['account-switch-button'].disabled,false);
  }
  console.log('PASS: generated mode toggle blocks delayed signup/login/reset/Google on success and failure; sign-out recreation, message clearing and auth failure');
})().catch(error=>{console.error(error);process.exitCode=1});
