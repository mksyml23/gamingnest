// Offline deterministic test of the actual reconstructed inline initialization.
const fs = require('fs'), vm = require('vm'), assert = require('assert');
const file = process.argv[2] || 'soepgames/index.html';
const baseline = process.argv.includes('--baseline');
const html = fs.readFileSync(file, 'utf8');
const start = html.indexOf("        window.addEventListener('load', async () => {");
const end = html.indexOf('        async function fetchDB()', start);
assert(start >= 0 && end > start, 'initialization anchor missing');
const init = html.slice(start, end);
const flush = () => new Promise(resolve => setImmediate(resolve));
async function trial(statsFirst, hallFirst, oldExpected) {
  let load, timer, resolveStats, resolveHall, db = {likes:{}}, renders = [];
  const stats = new Promise(resolve => {resolveStats = () => {db = {aces:371, likes:{aces:94}}; resolve()}});
  const hall = new Promise(resolve => resolveHall = resolve);
  const c = {window:{addEventListener: (name, cb) => {assert.equal(name,'load'); load=cb}},
    setTimeout: (cb, ms) => {if(ms===1500) timer=cb},
    fetchDB: () => stats, fetchHallOfFame: () => hall,
    render: () => renders.push([db.aces || 0, db.likes.aces || 0]),
    document:{getElementById: () => null}, sessionStorage:{getItem: () => 'true'},
    console, updateDoc: () => {throw Error('write forbidden')}, increment: () => {throw Error('write forbidden')}, statsRef:{}};
  vm.runInNewContext(init, c); const completion = load();
  if(statsFirst) {resolveStats(); await flush()}
  if(hallFirst) {resolveHall(); await flush()}
  if(!statsFirst || !hallFirst) {assert(timer); timer(); await flush()}
  if(!statsFirst) {assert.deepEqual(renders.at(-1),[0,0]); resolveStats(); await flush()}
  if(oldExpected) assert.deepEqual(renders.at(-1),[0,0]);
  else assert.deepEqual(renders.at(-1),[371,94]);
  if(!hallFirst) {resolveHall(); await flush()}
  await completion;
  if(!oldExpected) assert.deepEqual(renders.at(-1),[371,94]);
}
(async () => {
  if(baseline) {
    await trial(false,true,true);
    console.log('PASS baseline reproduces permanently stale zeros after 1.5s');
  } else {
    await trial(true,true,false);
    await trial(true,false,false);
    await trial(false,true,false);
    await trial(false,false,false);
    const a = html.indexOf('        function safeCounter(value)');
    const b = html.indexOf('        let db =',a);
    assert(a>=0 && b>a);
    const ctx = {GAMES:[{id:'aces'},{id:'tictac'}]}; vm.createContext(ctx);
    vm.runInContext(html.slice(a,b),ctx);
    assert.equal(ctx.safeCounter(371),371);
    for(const bad of [-1, 1.5, Number.MAX_SAFE_INTEGER+1, '<img onerror=alert(1)>', null]) assert.equal(ctx.safeCounter(bad),0);
    const sanitized = ctx.safeStats({aces:'<img src=x onerror=alert(1)>', tictac:47, likes:{aces:94,tictac:-1}});
    assert.equal(sanitized.aces,0); assert.equal(sanitized.tictac,47); assert.equal(sanitized.likes.aces,94); assert.equal(sanitized.likes.tictac,0);
    assert.equal(ctx.escapeText('<img onerror="x">'), '&lt;img onerror=&quot;x&quot;&gt;');
    console.log('PASS fast, delayed stats, delayed Hall, both delayed; safe counters and escaping');
  }
})().catch(e => { console.error(e); process.exitCode=1; });
