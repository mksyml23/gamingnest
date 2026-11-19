/* ACES preview extension: injected into the verified PR #13 bundle by
 * apply-aces-expansion.py. Local-only, no network, no Firebase. */
const ACES_BACKGROUNDS = [
  {id:'default',name:'Classic',nameNl:'Klassiek',cost:0,background:''},
  {id:'bg_aurora',name:'Aurora Grid',nameNl:'Aurora Raster',cost:1200,background:'radial-gradient(ellipse at 25% 30%, #074337, #030308 70%)'},
  {id:'bg_nebula',name:'Nebula Grid',nameNl:'Nevel Raster',cost:2200,background:'radial-gradient(ellipse at 70% 40%, #31104f, #030308 70%)'},
  {id:'bg_sunset',name:'Solar Grid',nameNl:'Zonneraster',cost:3500,background:'radial-gradient(ellipse at 50% 80%, #59221a, #030308 70%)'}
];
// Fixed handmade layouts rotate by UTC day. They use the existing platformer engine.
const ACES_DAILY_LEVELS = [
 {title:'DAILY_01',instr:'CROSS_THE_GAP',instrNl:'STEEK_DE_KLOOF_OVER',start:{x:50,y:400},goal:{x:755,y:380,w:50,h:60},platforms:[{x:0,y:440,w:320,h:40},{x:445,y:440,w:395,h:40},{x:345,y:345,w:100,h:12}]},
 {title:'DAILY_02',instr:'ASCEND_THE_STEPS',instrNl:'BEKLIM_DE_TRAPPEN',start:{x:50,y:400},goal:{x:720,y:210,w:55,h:60},platforms:[{x:0,y:440,w:840,h:40},{x:220,y:375,w:150,h:12},{x:420,y:320,w:150,h:12},{x:650,y:270,w:160,h:12}]},
 {title:'DAILY_03',instr:'CROSS_THE_MOVING_PLATFORM',instrNl:'STEEK_HET_BEWEGENDE_PLATFORM_OVER',start:{x:50,y:400},goal:{x:750,y:380,w:50,h:60},platforms:[{x:0,y:440,w:300,h:40},{x:500,y:440,w:340,h:40},{x:340,y:375,w:120,h:12,vx:1,minX:320,maxX:500}]}
];
function acesDay(){return new Date().toISOString().slice(0,10)}
function acesDailyIndex(day){return Math.floor(Date.parse(day+'T00:00:00Z')/86400000)%ACES_DAILY_LEVELS.length}
// One record per browser origin; Web Locks serialize all modified-game writes.
// Legacy keys are never overwritten; aces_v2 records are not touched.
const ACES_WALLET_KEY='aces_expansion_wallet_v2';
function acesWallet(){
 const raw=localStorage.getItem(ACES_WALLET_KEY);
 if(raw!==null){const w=JSON.parse(raw);if(!w||!Number.isSafeInteger(w.bits)||w.bits<0||!Array.isArray(w.skins)||!Array.isArray(w.backgrounds)||typeof w.bg!=='string'||!w.daily||typeof w.daily!=='object')throw Error('Invalid ACES wallet');return w}
 const parseArray=(key,fallback)=>{const raw=localStorage.getItem(key);if(raw===null)return fallback;const v=JSON.parse(raw);if(!Array.isArray(v))throw Error('Invalid legacy '+key);return v};
 const rawBits=localStorage.getItem('aces_bits'), bits=rawBits===null?0:Number(rawBits);
 if(!Number.isSafeInteger(bits)||bits<0)throw Error('Invalid legacy balance');
 const oldDaily=localStorage.getItem('aces_expansion_daily_v1');
 const daily=oldDaily===null?{}:JSON.parse(oldDaily);
 if(!daily||typeof daily!=='object'||Array.isArray(daily))throw Error('Invalid legacy daily');
 return {bits,skins:parseArray('aces_unlocked_skins',['default']),backgrounds:parseArray('aces_exp_owned',[]),bg:localStorage.getItem('aces_exp_bg')||'default',daily};
}
async function acesCommit(edit){if(!navigator.locks)throw Error('Web Locks unavailable');return navigator.locks.request('aces-preview-wallet-v2',()=>{const w=acesWallet();const result=edit(w);if(result===false)return false;if(!Number.isSafeInteger(w.bits)||w.bits<0)throw Error('Invalid balance');localStorage.setItem(ACES_WALLET_KEY,JSON.stringify(w));return w})}
function acesReadDaily(){try{const r=acesWallet().daily;return r.day===acesDay()?r:{day:acesDay(),clear:false,clean:false,fast:false}}catch{return {day:acesDay(),clear:false,clean:false,fast:false}}}
async function acesFinishDaily(stats,deaths,day){
 if(day!==acesDay())return {error:'day'};
 let reward=0;
 try{const w=await acesCommit(w=>{if(day!==acesDay())throw Error('day');const r=w.daily.day===day?{...w.daily}:{day,clear:false,clean:false,fast:false};
 if(!r.clear){r.clear=true;reward+=100}if(!r.clean&&deaths===0){r.clean=true;reward+=100}if(!r.fast&&Number.isFinite(stats.time)&&stats.time>=0&&stats.time<30000){r.fast=true;reward+=100}
 w.daily=r;w.bits+=reward;});return {reward,w}}catch(e){return {error:e.message==='day'?'day':'storage'}}
}
function AcesExpansionPanel({lang,bits,unlocked,bg,onBg,onClose,onStart}){
 const nl=lang==='nl', record=acesReadDaily();
 const button={padding:'8px 11px',border:'1px solid #39eac8',borderRadius:'5px',color:'#baffed',background:'#07342d',cursor:'pointer'};
 const row={display:'flex',justifyContent:'space-between',alignItems:'center',gap:'12px',padding:'9px 0',borderBottom:'1px solid #293b3a'};
 return s.jsx('div',{id:'aces-expansion-panel',style:{position:'fixed',inset:0,zIndex:10000,background:'rgba(0,0,0,.9)',display:'flex',alignItems:'center',justifyContent:'center',padding:'12px'},children:s.jsxs('div',{style:{background:'#080f12',color:'#eff',border:'1px solid #22c8ac',borderRadius:'10px',padding:'20px',width:'min(520px, 100%)',maxHeight:'90vh',overflowY:'auto',fontFamily:'monospace'},children:[
 s.jsxs('div',{style:row,children:[s.jsx('strong',{children:nl?'DAGELIJKS & ACHTERGRONDEN':'DAILY & BACKGROUNDS'}),s.jsx('button',{id:'exp-close',style:button,onClick:onClose,children:'✕'})]}),
 s.jsx('p',{children:(nl?'Dagelijkse sector (UTC): ':'Daily sector (UTC): ')+acesDay()+' · '+(acesDailyIndex(acesDay())+1)+'/3'}),
 s.jsx('p',{children:nl?'Drie missies: voltooien, zonder sterfte, binnen 30 seconden. Elk 100 Bits; eenmaal per UTC-dag.':'Three quests: complete, no deaths, under 30 seconds. 100 Bits each, once per UTC day.'}),
 s.jsxs('p',{id:'daily-progress',children:[record.clear?'✓':'○',' CLEAR  ',record.clean?'✓':'○',' NO DEATHS  ',record.fast?'✓':'○',' <30s']}),
 s.jsx('button',{id:'daily-start',style:button,onClick:onStart,children:nl?'SPEEL DAGELIJKSE SECTOR':'PLAY DAILY SECTOR'}),
 s.jsxs('h3',{children:[nl?'ACHTERGRONDEN':'BACKGROUNDS',' · ',bits,' Bits']}),
 ...ACES_BACKGROUNDS.map(item=>{const owned=item.cost===0||unlocked.includes(item.id),active=bg===item.id;return s.jsxs('div',{style:row,id:'background-'+item.id,children:[s.jsx('span',{children:nl?item.nameNl:item.name}),s.jsx('button',{style:button,disabled:!owned&&bits<item.cost,onClick:()=>onBg(item),children:active?(nl?'GEKOZEN':'EQUIPPED'):owned?(nl?'KIES':'EQUIP'):`${item.cost} BITS`})]},item.id)}),
 s.jsx('p',{style:{fontSize:'11px',color:'#a9b9b7'},children:nl?'Preview-portemonnee alleen lokaal in deze browser, niet gesynchroniseerd. Oudere ACES-versies gebruiken een aparte portemonnee.':'Preview wallet stored locally on this browser only, not synced to your account. Older ACES versions use a separate wallet.'})
 ]})});
}
