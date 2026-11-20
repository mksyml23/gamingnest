#!/usr/bin/env python3
"""Apply daily-mode integration to the exact assembled live ACES bundle, fail closed."""
from pathlib import Path
import hashlib
import shutil

ROOT = Path(__file__).resolve().parent.parent
assets = ROOT / 'soepgames/games/aces-assets/assets'
bundle = assets / 'game-bundle.mjs'
raw = bundle.read_bytes()
if hashlib.sha256(raw).hexdigest() != '503cb1d6b3a33b63ec95d90762ba261458d3a1d9b85ddb251d923f9be3e5ee4a':
    raise RuntimeError('Unexpected ACES bundle; refusing daily patch')
s = raw.decode('utf8')
replacements = [
 ('import { makeAdExperimentShop as acesMakeAdExperimentShop }', 'import { dailySectors as acesDailySectors } from "./aces-daily.mjs";\nimport { makeAdExperimentShop as acesMakeAdExperimentShop }'),
 ('function mx(){const[e,t]=', 'function mx(){const [acesDailyDate,acesSetDailyDate]=j.useState("");const[e,t]='),
 ('if((at>2||e==="RECOVERY")&&', 'if(e!=="DAILY"&&(at>2||e==="RECOVERY")&&'),
 ('Tr=(R,T)=>{if(R==="ARCHIVES")', 'Tr=(R,T)=>{if(e==="DAILY"){if(l+1>=r.length){t("DAILY_DONE")}else{a(l+1);v(ie=>ie+1)}return}if(R==="ARCHIVES")'),
 ('sh=R=>{if(e!=="BOOT"){', 'sh=R=>{if(e==="DAILY"){_t(T=>T+1);v(T=>T+1);return}if(e!=="BOOT"){'),
 ('Ar=()=>{t("BOOT")', 'acesStartDaily=()=>{const result=acesDailySectors([Wo,p1,b1.filter(R=>R.goal)],new Date());acesSetDailyDate(result.date);f(result.sectors);a(0);_t(0);Gl.current=0;Ye(1);v(R=>R+1);t("DAILY")},Ar=()=>{t("BOOT")'),
 ('e==="ARCHIVES"?fh():e==="FINAL"?dh():s.jsxs("div",', 'e==="ARCHIVES"?fh():e==="FINAL"?dh():e==="DAILY_DONE"?s.jsxs("div",{id:"daily-complete",className:"text-center p-6 flex flex-col items-center gap-4",children:[s.jsx("h1",{className:"text-2xl font-black text-[#00ff9d]",children:o==="nl"?"DAGELIJKSE UITDAGING VOLTOOID":"DAILY CHALLENGE COMPLETE"}),s.jsx("p",{children:`${acesDailyDate} UTC · 3/3`}),s.jsx("p",{children:o==="nl"?"Alleen deze sessie; geen Bits-beloning.":"This session only; no Bits reward."}),s.jsx("button",{id:"daily-return",className:"btn-primary",onClick:()=>{t("BOOT");a(0)},children:o==="nl"?"TERUG NAAR HUB":"RETURN TO HUB"})]}):s.jsxs("div",'),
 ('children:["ACES // ",e==="BOOT"?"HUB":e]', 'children:["ACES // ",e==="BOOT"?"HUB":e==="DAILY"?`DAILY ${acesDailyDate} UTC`:e]'),
 ('s.jsx("span",{className:"text-[9px] text-stone-300 tracking-widest font-mono",children:o==="nl"?"OF BETREED DE GROENE PORTAAL":"OR STEP INTO THE GREEN PORTAL"})', 's.jsx("button",{id:"hub-daily-start-btn",onClick:acesStartDaily,className:"btn-primary px-5 py-2 text-xs sm:text-sm font-black cursor-pointer",children:o==="nl"?"DAGELIJKSE UITDAGING":"DAILY CHALLENGE"}),s.jsx("span",{className:"text-[9px] text-stone-300 text-center font-mono",children:o==="nl"?"3 sectoren · nieuwe dag om 00:00 UTC · alleen deze sessie · geen Bits":"3 sectors · new day at 00:00 UTC · session only · no Bits"})'),
]
for old, new in replacements:
    if s.count(old) != 1:
        raise RuntimeError(f'Unexpected ACES patch target: {old!r} count={s.count(old)}')
    s = s.replace(old, new, 1)
bundle.write_text(s, encoding='utf8')
shutil.copyfile(ROOT / 'scripts/aces-daily.mjs', assets / 'aces-daily.mjs')
print('Verified daily challenge patch applied')
