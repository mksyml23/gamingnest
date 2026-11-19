'use strict';
const fs=require('fs');
const root='.preview-publish/';
const htmlPath=root+'games/aces.html';
const headersPath=root+'_headers';
const shopPath=root+'games/aces-assets/assets/ad-experiment-shop.mjs';
const modulePath=root+'games/aces-assets/assets/preview-click-counter.mjs';
function once(s,a,b,label){if(s.split(a).length!==2)throw Error(label);return s.replace(a,b)}
const policy=s=>once(once(s,"connect-src 'none'","connect-src https://firestore.googleapis.com wss://firestore.googleapis.com",'connect CSP'),"script-src 'self'","script-src 'self' https://www.gstatic.com",'script CSP');
const cfg=fs.readFileSync('soepgames/firebase-app.js','utf8').match(/const\s+firebaseConfig\s*=\s*(\{[\s\S]*?\})\s*;/);
if(!cfg)throw Error('Firebase config not found');
let html=policy(fs.readFileSync(htmlPath,'utf8'));
html=once(html,'</head>','<script type="module" src="/games/aces-assets/assets/preview-click-counter.mjs"></script>\n</head>','head');
html=once(html,'PREVIEW ONLY — Cloud saves, accounts, leaderboards and online services disabled','PREVIEW ONLY — Accounts, cloud saves and leaderboards disabled; button clicks counted online','banner');
let headers=policy(fs.readFileSync(headersPath,'utf8'));
const shop=fs.readFileSync(shopPath,'utf8');
// Validate the actual start button, not UI copy that has intentionally been removed.
const button="id: 'aces-ad-start', style: button, onClick: () => controller.current?.click()";
if(shop.split(button).length!==2 || shop.split("id: 'aces-ad-start'").length!==2)throw Error('Ad start button mismatch');
if(shop.includes('preview-click-counter') || shop.includes('aces_preview_ad_experiment_clicks'))throw Error('Unexpected counter in shop');
if(fs.existsSync(modulePath) || html.includes('preview-click-counter.mjs') && html.split('preview-click-counter.mjs').length!==2)throw Error('Duplicate counter module');
const code=`import { initializeApp } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js';\nimport { getFirestore, doc, updateDoc, increment } from 'https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js';\nconst app=initializeApp(${cfg[1]},'aces-preview-click-counter');\nconst counter=doc(getFirestore(app),'gamingnest','stats');\ndocument.addEventListener('click',event=>{const target=event.target;if(!(target instanceof Element)||!target.closest('#aces-ad-start')||!event.isTrusted)return;updateDoc(counter,{aces_preview_ad_experiment_clicks:increment(1)}).catch(()=>console.warn('Preview click could not be counted'));},true);\n`;
fs.writeFileSync(htmlPath,html);fs.writeFileSync(headersPath,headers);fs.writeFileSync(modulePath,code);console.log('Preview Firebase counter prepared');
