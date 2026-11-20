// Isolated regression coverage: no network, Firebase calls are in-memory fakes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const {execFileSync} = require('node:child_process');
const source = fs.readFileSync('soepgames/firebase-app.js', 'utf8');
const base = execFileSync('git', ['show','cfbe68f:soepgames/firebase-app.js'], {encoding:'utf8',timeout:5000});
const saves = s => s.slice(s.indexOf('window.saveGameData ='),s.indexOf('// ACCOUNT UI LOGICA'));
assert.equal(saves(source), saves(base), 'shared save/load implementation must be unchanged from base');
function setup({homepage=true, profileExists=true}={}) {
  const calls=[], listeners=[], auth={currentUser:null}, records=new Map(); let failure=null, reloads=0;
  const ids=['google-login','account-submit','account-reset','account-email','account-password','account-error','account-title','account-subtitle','logout-button','account-switch-text','account-switch-button'];
  const nodes=Object.fromEntries(ids.map(id=>[id,{id,style:{},value:'',innerText:'',textContent:'',disabled:false,handlers:{},addEventListener(k,f){this.handlers[k]=f}}]));
  const divider={style:{}}, sw={innerHTML:'<span id="account-switch-text">Already have an account?</span><span id="account-switch-button">Log in</span>'};
  const document={getElementById:id=>homepage?nodes[id]||null:null,querySelector:s=>homepage?(s==='.account-divider'?divider:s==='.account-switch'?sw:null):null};
  const invoke=name=>async (_auth,...args)=>{calls.push([name,...args]);if(failure)throw {code:failure,message:'private error'};return {user:{uid:'u1',email:'test@example.invalid'}}};
  const context={document,window:{accountMode:'signup'},location:{reload(){reloads++}},console:{log(){},warn(){},error(){}},Promise,initializeApp:()=>({}),getAuth:()=>auth,getFirestore:()=>({}),GoogleAuthProvider:function(){},signInWithPopup:invoke('google'),signInWithEmailAndPassword:invoke('login'),createUserWithEmailAndPassword:invoke('signup'),sendPasswordResetEmail:invoke('reset'),signOut:async()=>{calls.push(['logout']);if(failure)throw {code:failure,message:'private error'}},onAuthStateChanged:(_a,cb)=>{listeners.push(cb);return ()=>calls.push(['unsubscribe'])},doc:(_db,...path)=>path.join('/'),getDoc:async ref=>{calls.push(['getDoc',ref]); if(ref==='users/u1' && profileExists)return {exists:()=>true,data:()=>({})};return {exists:()=>records.has(ref),data:()=>records.get(ref)}},setDoc:async(ref,data,options)=>{calls.push(['setDoc',ref,data,options]);records.set(ref,data)},serverTimestamp:()=>123,updateDoc(){},increment(){},collection(){},getDocs(){},query(){},orderBy(){},limit(){}};
  vm.runInNewContext(source.replace(/import[\s\S]*?from\s+"[^"]+";\s*/g,'').replace(/export const /g,'const ').replace(/export \{[^}]+\};/g,''),context);
  listeners[0](null);
  return {nodes,calls,auth,context,listeners,records,emit(user){auth.currentUser=user; for(const f of [...listeners]) f(user)},fail(code){failure=code},reloads:()=>reloads,click(id){return nodes[id].handlers.click()}};
}
(async()=>{
 {const t=setup();t.fail('auth/user-not-found');t.nodes['account-email'].value='x@example.invalid';await t.click('account-reset');assert.match(t.nodes['account-error'].textContent,/If an account exists/);}
 {const t=setup();t.emit({uid:'u1',email:'test@example.invalid'});assert.equal(t.nodes['account-submit'].style.display,'none');t.emit(null);assert.equal(t.nodes['account-submit'].style.display,'');assert.equal(t.nodes['account-title'].innerText,'Create your account');assert.match(t.nodes['account-switch-button'].innerText,/Log in/);}
 {const t=setup();t.context.window.accountMode='login';t.emit({uid:'u1',email:'test@example.invalid'});t.emit(null);assert.equal(t.nodes['account-title'].innerText,'Welcome back');assert.equal(t.nodes['account-submit'].innerText,'Log In');assert.equal(t.nodes['account-switch-button'].innerText,'Create account');}
 {const t=setup();t.emit({uid:'u1',email:'test@example.invalid'});t.fail('auth/network-request-failed');await t.click('logout-button');assert.match(t.nodes['account-error'].textContent,/Network/);assert.equal(t.reloads(),0);t.fail(null);await t.click('logout-button');assert.equal(t.reloads(),0);}
 {const t=setup({profileExists:true});t.nodes['account-email'].value='u@example.invalid';t.nodes['account-password'].value=' password ';await t.click('account-submit');await new Promise(r=>setImmediate(r));assert.equal(t.nodes['account-password'].value,'');assert(t.calls.some(c=>c[0]==='getDoc'&&c[1]==='users/u1'));assert(!t.calls.some(c=>c[0]==='setDoc'));}
 {const t=setup({profileExists:false});t.nodes['account-email'].value='u@example.invalid';t.nodes['account-password'].value='p';await t.click('account-submit');await new Promise(r=>setImmediate(r));assert(t.calls.some(c=>c[0]==='setDoc'&&c[1]==='users/u1'));}
 {const t=setup({homepage:false});assert.equal(await t.context.window.saveGameData('aces',{bits:10}),false);assert(!t.calls.some(c=>c[0]==='setDoc'));t.auth.currentUser={uid:'u1'};assert.equal(await t.context.window.saveGameData('aces',{bits:10,optional:undefined,lastSave:77}),true);const write=t.calls.find(c=>c[0]==='setDoc');assert.equal(write[1],'users/u1/games/aces');assert.equal(write[2].bits,10);assert.equal(write[2].lastSave,77);assert.equal(write[2].serverUpdatedAt,123);assert(!('optional' in write[2]));assert.equal(write[3].merge,true);const p=t.context.window.loadGameData('aces');t.listeners.at(-1)(t.auth.currentUser);assert.equal((await p).bits,10);assert(t.calls.some(c=>c[0]==='unsubscribe'));const g=t.context.window.loadGameData('other');t.listeners.at(-1)(null);assert.equal(await g,null);}
 console.log('PASS: shared save/load byte-identical to base, guest and signed-in saves/loads, profile preservation/creation, cross-tab sign-out, logout failure/success, password clearing, reset enumeration');
})().catch(e=>{console.error(e);process.exitCode=1});
