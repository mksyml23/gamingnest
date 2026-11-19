const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const source = fs.readFileSync('soepgames/firebase-app.js','utf8')
  .replace(/import[\s\S]*?from\s+"[^"]+";\s*/g,'')
  .replace(/export const /g,'const ').replace(/export \{[^}]+\};/g,'');
function setup(options={}) {
  const calls=[], nodes={}, auth={currentUser:null}; let observer, rejectProfile=false;
  for(const id of ['google-login','account-submit','account-reset','account-email','account-password','account-error','account-title','account-subtitle','logout-button']) {
    nodes[id]={id,style:{}, value:'',textContent:'',innerText:'',handlers:{}, addEventListener(type,fn){this.handlers[type]=fn;}};
  }
  const divider={style:{}}, sw={style:{},innerHTML:''};
  const document={getElementById:id=>nodes[id]||null,querySelector:s=>s==='.account-divider'?divider:s==='.account-switch'?sw:null};
  let result={user:{uid:'test',email:'test@example.invalid'}};
  let fail=null, deferred=null;
  const act = name => async (...args) => {calls.push([name,...args.slice(1)]); if (deferred) await deferred; if(fail) throw {code:fail,message:'sensitive details'}; return result;};
  const context={document,window:{accountMode:'signup'},location:{reload(){}},console,Promise,initializeApp:()=>({}),getAuth:()=>auth,getFirestore:()=>({}),GoogleAuthProvider:function(){},signInWithPopup:act('google'),signInWithEmailAndPassword:act('login'),createUserWithEmailAndPassword:act('signup'),sendPasswordResetEmail:act('reset'),signOut:act('logout'),onAuthStateChanged:(_a,cb)=>{observer=cb;return ()=>{}},doc:()=>({}),getDoc:async()=>{if(rejectProfile) throw Error('unavailable');return {exists:()=>true}},setDoc:async()=>{},serverTimestamp:()=>0,updateDoc(){},increment(){},collection(){},getDocs(){},query(){},orderBy(){},limit(){}};
  vm.runInNewContext(source,context);
  observer(null);
  return {nodes,calls,context,observer,fail:code=>fail=code,profileFail:()=>rejectProfile=true,defer:p=>deferred=p,click:id=>nodes[id].handlers.click()};
}
(async()=>{
  {const t=setup(); await t.click('account-submit'); assert.match(t.nodes['account-error'].textContent,/Enter your email/); assert.equal(t.calls.length,0);}
  {const t=setup(); t.nodes['account-email'].value='  x@example.invalid  '; t.nodes['account-password'].value=' password '; await t.click('account-submit'); assert.equal(t.calls[0][0],'signup'); assert.equal(t.calls[0][1],'x@example.invalid'); assert.equal(t.calls[0][2],' password '); assert.equal(t.nodes['account-title'].innerText,'Welcome back!'); assert.equal(t.nodes['account-reset'].style.display,'none');}
  {const t=setup(); t.context.window.accountMode='login'; t.nodes['account-email'].value='x@example.invalid';t.nodes['account-password'].value='p';t.profileFail(); await t.click('account-submit');await new Promise(r=>setImmediate(r)); assert.equal(t.calls[0][0],'login');assert.equal(t.nodes['account-title'].innerText,'Welcome back!'); assert.equal(t.nodes['account-error'].style.display,'none');}
  {const t=setup();t.context.window.accountMode=undefined;t.nodes['account-email'].value='x';t.nodes['account-password'].value='p';await t.click('account-submit');assert.equal(t.calls.length,0);assert.match(t.nodes['account-error'].textContent,/not ready/);}
  for(const [code,msg] of [['auth/invalid-credential',/incorrect/],['auth/operation-not-allowed',/unavailable/],['auth/network-request-failed',/Network/],['auth/email-already-in-use',/already in use/],['auth/weak-password',/stronger/],['unknown',/could not/]]) {const t=setup();t.nodes['account-email'].value='x';t.nodes['account-password'].value='p';t.fail(code);await t.click('account-submit');assert.match(t.nodes['account-error'].textContent,msg);assert(!t.nodes['account-error'].textContent.includes('sensitive'));assert.equal(t.nodes['account-submit'].disabled,false);}
  {const t=setup();await t.click('account-reset');assert.equal(t.calls.length,0);t.nodes['account-email'].value=' x@example.invalid ';await t.click('account-reset');assert.equal(t.calls[0][0],'reset');assert.equal(t.calls[0][1],'x@example.invalid');assert.match(t.nodes['account-error'].textContent,/If an account exists/);}
  {const t=setup(); t.observer({email:'restored@example.invalid'}); assert.equal(t.nodes['account-title'].innerText,'Welcome back!'); assert.equal(t.nodes['account-submit'].style.display,'none');}
  {const t=setup();let release;const promise=new Promise(r=>release=r);t.defer(promise);t.context.window.accountMode='login';t.nodes['account-email'].value='x';t.nodes['account-password'].value='p';const a=t.click('account-submit');await t.click('account-submit');assert.equal(t.calls.length,1);assert(t.nodes['account-submit'].disabled);release();await a;assert.equal(t.nodes['account-submit'].disabled,false);}
  {const t=setup();await t.click('google-login');assert.equal(t.calls[0][0],'google');assert.equal(t.nodes['account-title'].innerText,'Welcome back!');}
  console.log('PASS: validation, signup/login dispatch, password preservation, fail-closed mode, auth errors, reset, restored auth, duplicate guard, Google, profile-write failure');
})().catch(e=>{console.error(e);process.exitCode=1});
