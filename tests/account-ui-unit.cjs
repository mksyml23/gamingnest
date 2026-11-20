const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
const nodes = {};
function element(id) { return nodes[id] = {id, style:{}, value:'', textContent:'', disabled:false, handlers:{}, autocomplete:'', addEventListener(k,f){this.handlers[k]=f}, click(){if(!this.disabled) this.handlers.click?.({});}}; }
['google-login','account-submit','account-email','account-password','account-error','account-title','account-subtitle','account-switch-text','account-switch-button','logout-button','account-reset'].forEach(element);
const switchBox = {innerHTML:'initial'};
const divider = {style:{}};
const document = {getElementById:id=>nodes[id]||null, querySelector:s=>s==='.account-switch'?switchBox:s==='.account-divider'?divider:null};
let callback, fail, calls=[];
const auth={};
const context={console,Promise,document,window:{accountMode:'signup'},auth,firestore:{},GoogleAuthProvider:class{},doc:()=>({}),getDoc:async()=>({exists:()=>true}),setDoc:async()=>{},serverTimestamp:()=>0,onAuthStateChanged:(_a,cb,err)=>{callback=cb;fail=err},createUserWithEmailAndPassword:async(_a,e,p)=>{calls.push(['signup',e,p]); callback({uid:'u',email:e});return {user:{uid:'u',email:e}}},signInWithEmailAndPassword:async(_a,e,p)=>{calls.push(['login',e,p]);callback({uid:'u',email:e});return {user:{uid:'u',email:e}}},signInWithPopup:async()=>{calls.push(['google']);callback({uid:'u'});return {user:{uid:'u'}}},signOut:async()=>callback(null),sendPasswordResetEmail:async()=>{}};
const source=fs.readFileSync('soepgames/firebase-app.js','utf8');
vm.runInNewContext(source.slice(source.indexOf('// ACCOUNT UI LOGICA'),source.indexOf('// EXPORTS VOOR INDEX.HTML')),context);
(async()=>{
 assert.equal(nodes['account-submit'].disabled,true); assert.equal(nodes['account-reset'].disabled,true); callback(null); assert.equal(nodes['account-submit'].disabled,false);
 nodes['account-submit'].click(); await new Promise(r=>setImmediate(r)); assert.match(nodes['account-error'].textContent,/Enter/);
 nodes['account-email'].value=' a@example.com '; nodes['account-password'].value='pw'; nodes['account-submit'].click(); await new Promise(r=>setImmediate(r));
 assert.deepEqual(calls[0],['signup','a@example.com','pw']); assert.equal(nodes['account-title'].innerText,'Welcome back!'); assert.equal(nodes['account-email'].style.display,'none');
 callback(null); assert.equal(nodes['account-email'].style.display,''); assert.equal(nodes['account-title'].innerText,'Create your account');
 context.window.accountMode='login'; nodes['account-password'].value='pw'; let prevented=false; nodes['account-password'].handlers.keydown({key:'Enter',preventDefault(){prevented=true}}); assert.equal(prevented,true); await new Promise(r=>setImmediate(r)); assert.equal(calls[1][0],'login');
 callback(null); nodes['google-login'].click(); await new Promise(r=>setImmediate(r)); assert.equal(calls[2][0],'google');
 assert.match(switchBox.innerHTML, /<button type="button" id="logout-button"/); fail(new Error('offline')); assert.equal(nodes['account-submit'].disabled,true); assert.equal(nodes['account-reset'].disabled,true); assert.match(nodes['account-error'].textContent,/unavailable/);
 console.log('PASS: auth pending/error, signup/login/Google dispatch, signed-in UI and external sign-out restoration');
})().catch(e=>{console.error(e); process.exitCode=1});
