#!/usr/bin/env python3
"""Patch the verified, isolated preview only. No deployment or network access."""
import hashlib, os
from pathlib import Path
root=Path(__file__).resolve().parent.parent
out=root/'.preview-publish'
if os.environ.get('CONTEXT') not in ('deploy-preview','branch-deploy'):
    raise RuntimeError('Preview context required')
if not out.is_dir() or out.is_symlink() or not (out/'_headers').is_file():
    raise RuntimeError('Build isolated preview first')
js=out/'games/aces-assets/assets/index-OkqegR5F.js'
if js.is_symlink(): raise RuntimeError('Refusing symlink')
raw=js.read_bytes()
if hashlib.sha256(raw).hexdigest()!='300edea3dcfd61a945c0d885488fd5b7df4d48ddc89bdadb51599e9981a43137':
    raise RuntimeError('Unknown ACES bundle; refusing patch')
s=raw.decode()
def replace(a,b):
 global s
 if s.count(a)!=1: raise RuntimeError(f'Expected one patch point: {a[:100]!r}, got {s.count(a)}')
 s=s.replace(a,b,1)
s=(root/'scripts/aces-expansion.js').read_text()+'\n'+s
replace('[S,te]=j.useState(()=>{const R=localStorage.getItem("aces_bits");return R&&parseInt(R,10)||0})', '[S,te]=j.useState(()=>{try{return acesWallet().bits}catch{return 0}})')
replace('[Fe,qt]=j.useState(()=>{try{const R=localStorage.getItem("aces_unlocked_skins");if(R){const T=JSON.parse(R);if(Array.isArray(T))return T}}catch{}return["default"]})', '[Fe,qt]=j.useState(()=>{try{return acesWallet().skins}catch{return["default"]}})')
replace('[M,B]=j.useState(!1),[L,Z]', '[M,B]=j.useState(!1),[pendingReward,setPendingReward]=j.useState(null),[rewardBusy,setRewardBusy]=j.useState(!1),rewardLock=j.useRef(!1),[expOpen,setExpOpen]=j.useState(!1),[expDay,setExpDay]=j.useState(""),[expBg,setExpBg]=j.useState(()=>{try{return acesWallet().bg}catch{return "default"}}),[expOwned,setExpOwned]=j.useState(()=>{try{return acesWallet().backgrounds}catch{return[]}}),[L,Z]')
replace('const wr=S+200;te(wr);try{localStorage.setItem("aces_bits",wr.toString())}catch{Se(!0)}', 'try{const w=await acesCommit(w=>{w.bits+=200});te(w.bits)}catch{Se(!0);setPendingReward(()=>async()=>{const w=await acesCommit(w=>{w.bits+=200});te(w.bits)});ne("ACES: Reward not saved. Use RETRY SAVE; keep this tab open.","WARN")}')
replace('const Ot=S+20;te(Ot),localStorage.setItem("aces_bits",Ot.toString()),a(qe)', 'try{const w=await acesCommit(w=>{w.bits+=20});te(w.bits)}catch{Se(!0);setPendingReward(()=>async()=>{const w=await acesCommit(w=>{w.bits+=20});te(w.bits);a(qe);v(ie=>ie+1)});ne("ACES: Reward not saved. Use RETRY SAVE; keep this tab open.","WARN");return}a(qe)')
replace('oh=(R,T)=>{if(S<T)return;const D=S-T;te(D),localStorage.setItem("aces_bits",D.toString());const se=[...Fe,R];qt(se),localStorage.setItem("aces_unlocked_skins",JSON.stringify(se)),be(R),localStorage.setItem("aces_active_skin",R),ee.playEffect("success")}', 'oh=async(R,T)=>{try{const w=await acesCommit(w=>{if(w.skins.includes(R)||w.bits<T)return false;w.bits-=T;w.skins.push(R);w.activeSkin=R});if(!w)return;te(w.bits);qt(w.skins);be(R);ee.playEffect("success")}catch{ne("ACES: Could not save purchase.","WARN")}}')
replace('uh=j.useCallback((R,T,D,se)=>', 'uh=j.useCallback(async(R,T,D,se)=>')
replace('Tr=(R,T)=>{', 'Tr=async(R,T)=>{')
replace('[P,be]=j.useState(()=>localStorage.getItem("aces_active_skin")||"default")', '[P,be]=j.useState(()=>{try{return acesWallet().activeSkin||localStorage.getItem("aces_active_skin")||"default"}catch{return "default"}})')
replace('const rh=R=>{be(R),localStorage.setItem("aces_active_skin",R),ee.playEffect("jump")}', 'const rh=async R=>{try{const w=await acesCommit(w=>{if(!w.skins.includes(R))return false;w.activeSkin=R});if(w){be(R);ee.playEffect("jump")}}catch{ne("ACES: Could not save skin.","WARN")}}')
replace('V(ie=>ie+T.time),T.risk', 'if(e==="DAILY"){const result=await acesFinishDaily(T,Gl.current,expDay);if(result.error==="storage"){const deaths=Gl.current;setPendingReward(()=>async()=>{const retry=await acesFinishDaily(T,deaths,expDay);if(retry.error)throw Error(retry.error);te(retry.w.bits);Gl.current=0;t("BOOT");setExpOpen(!0);ne(`ACES: Daily sector complete. +${retry.reward} Bits.`,"ACES")});ne("ACES: Reward not saved. Use RETRY SAVE; keep this tab open.","WARN");return}Gl.current=0;t("BOOT");setExpOpen(!0);if(result.w)te(result.w.bits);ne(result.error?(result.error==="day"?"ACES: UTC day changed; play the new daily.":"ACES: Could not save reward."):`ACES: Daily sector complete. +${result.reward} Bits.`,"ACES");return}V(ie=>ie+T.time),T.risk')
replace('const rh=async R=>', 'j.useEffect(()=>{const sync=ev=>{if(!ev||!ev.key||ev.key===ACES_WALLET_KEY){try{const w=acesWallet();te(w.bits);qt(w.skins);be(w.activeSkin||"default");setExpOwned(w.backgrounds);setExpBg(w.bg)}catch{ne("ACES: Invalid wallet.","WARN")}}};const refresh=()=>sync();window.addEventListener("storage",sync);window.addEventListener("focus",refresh);window.addEventListener("pageshow",refresh);document.addEventListener("visibilitychange",refresh);return()=>{window.removeEventListener("storage",sync);window.removeEventListener("focus",refresh);window.removeEventListener("pageshow",refresh);document.removeEventListener("visibilitychange",refresh)}},[]);const rh=async R=>')
replace('sh=R=>{if(e!=="BOOT"){', 'sh=R=>{if(e==="DAILY"){Gl.current++;v(T=>T+1);ne("ACES: Daily sector retry.","WARN");return}if(e!=="BOOT"){')
replace('T.code==="KeyR"&&e!=="BOOT"&&e!=="FINAL"&&!C&&!M&&(v(D=>D+1),ee.playEffect("death",.5))', 'T.code==="KeyR"&&e!=="BOOT"&&e!=="FINAL"&&!C&&!M&&!expOpen&&(e==="DAILY"&&Gl.current++,v(D=>D+1),ee.playEffect("death",.5))')
replace('[e,C,M]);j.useEffect(()=>{const sync=ev=>', '[e,C,M,expOpen]);j.useEffect(()=>{const sync=ev=>')
replace('children:[S," BITS"]})]}),s.jsxs("button",{id:"header-lang-btn"', 'children:[S," BITS"]})]}),s.jsx("button",{id:"aces-daily-open",onClick:()=>setExpOpen(!0),className:"px-2 py-1 rounded border border-[#00ff9d]/40 text-[#00ff9d] text-[10px] font-bold",children:o==="nl"?"DAGELIJKS":"DAILY"}),s.jsxs("button",{id:"header-lang-btn"')
replace('s.jsx(cx,{isOpen:M', 'pendingReward&&s.jsxs("div",{id:"aces-retry-reward",role:"alert",style:{position:"fixed",zIndex:20000,inset:0,padding:16,background:"rgba(30,20,15,.97)",color:"white"},children:["Reward not saved. Keep this tab open and retry. Closing or refreshing loses the pending reward. ",s.jsx("button",{id:"aces-retry-save",disabled:rewardBusy,onClick:async()=>{if(rewardLock.current)return;rewardLock.current=!0;setRewardBusy(!0);try{await pendingReward();setPendingReward(null);ne("ACES: Reward saved.","ACES")}catch{ne("ACES: Still unable to save. Try again.","WARN")}finally{rewardLock.current=!1;setRewardBusy(!1)}},children:rewardBusy?"SAVING...":"RETRY SAVE"})]}),expOpen&&s.jsx(AcesExpansionPanel,{lang:o,bits:S,unlocked:expOwned,bg:expBg,onClose:()=>setExpOpen(!1),onStart:()=>{if(e!=="BOOT"&&!window.confirm(o==="nl"?"Huidige sessie verlaten?":"Leave the current session?"))return;const day=acesDay();setExpDay(day);Gl.current=0;f([ACES_DAILY_LEVELS[acesDailyIndex(day)]]);a(0);v(q=>q+1);t("DAILY");setExpOpen(!1)},onBg:async item=>{try{const w=await acesCommit(w=>{if(item.cost&&!w.backgrounds.includes(item.id)){if(w.bits<item.cost)return false;w.bits-=item.cost;w.backgrounds.push(item.id)}w.bg=item.id});if(!w)return;setExpOwned(w.backgrounds);setExpBg(w.bg);te(w.bits)}catch{ne("ACES: Could not save background.","WARN")}}}),s.jsx(cx,{isOpen:M')
replace(' ${e==="RECOVERY"?"recovery-mode":""}`,children:[d&&', ' ${e==="RECOVERY"?"recovery-mode":""}`,style:{backgroundImage:expBg==="default"?undefined:`linear-gradient(#ffffff06 1px,transparent 1px),linear-gradient(90deg,#ffffff06 1px,transparent 1px),${(ACES_BACKGROUNDS.find(q=>q.id===expBg)||ACES_BACKGROUNDS[0]).background}`,backgroundSize:expBg==="default"?undefined:"32px 32px,32px 32px,100% 100%"},children:[d&&')
replace('isPaused:nt.active||C||M', 'isPaused:nt.active||C||M||expOpen||!!pendingReward')
js.write_text(s)
print('ACES expansion applied to verified preview bundle')
