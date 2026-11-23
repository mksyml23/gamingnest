#!/usr/bin/env python3
"""Remove routine ACES startup choices from the verified guest-start output."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parent.parent
TARGET = ROOT / 'soepgames/games/aces-assets/assets/browser.mjs'
EXPECTED_SHA256 = 'b328463a3d33329b92e22562561b2cc456365b3cce5ae60153ba1be5ba399f79'

def replace_once(text, old, new):
    if text.count(old) != 1:
        raise RuntimeError('Unexpected ACES silent-start patch target: ' + old[:100])
    return text.replace(old, new, 1)

def main():
    original = TARGET.read_bytes()
    if hashlib.sha256(original).hexdigest() != EXPECTED_SHA256:
        raise RuntimeError('Unexpected ACES guest-start input; no changes made')
    text = original.decode('utf-8')
    text = replace_once(text,
        "import {openAccount, openGuest, dirtyCaches, retryCache, oldGuestInfo, importOldGuest} from './core.mjs';",
        "import {KEYS, openAccount, openGuest, dirtyCaches, retryCache, oldGuestInfo} from './core.mjs';")
    text = replace_once(text,
        """const legacyLink=document.createElement('a'); legacyLink.id='aces-old-guest-link';
legacyLink.href='/games/aces-legacy.html'; legacyLink.style.cssText='display:none;position:fixed;z-index:2147483646;left:8px;bottom:8px;background:#111;color:#ccc;padding:6px;font:12px sans-serif';
document.body.append(panel,badge,legacyLink);""",
        """const recoveryLinks=document.createElement('nav'); recoveryLinks.setAttribute('aria-label','Earlier ACES saves');
recoveryLinks.style.cssText='display:none;position:fixed;z-index:2147483646;left:8px;bottom:8px;background:#111;padding:6px;font:12px sans-serif';
const oldAccountLink=document.createElement('a'), legacyLink=document.createElement('a'), earlierLink=document.createElement('a');
for(const a of [oldAccountLink,legacyLink,earlierLink]){a.style.cssText='display:none;color:#ccc;margin-right:10px';recoveryLinks.append(a);}
oldAccountLink.href=legacyLink.href='/games/aces-legacy.html';
oldAccountLink.textContent='Open old account game';
legacyLink.id='aces-old-guest-link';
earlierLink.href='#'; earlierLink.textContent='Download earlier device save';
earlierLink.onclick=e=>{
  e.preventDefault();
  try {
    const values=Object.fromEntries(KEYS.map(k=>[k,localStorage.getItem(k)]).filter(([,v])=>v!==null));
    if(!Object.keys(values).length) throw Error('Earlier device save is no longer available');
    const url=URL.createObjectURL(new Blob([JSON.stringify({format:'aces-earlier-device-save-v1',values},null,2)],{type:'application/json'}));
    const a=document.createElement('a');a.href=url;a.download='aces-earlier-device-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  } catch(err) {show('Could not export the earlier device save: '+err.message+'. The original data remains on this device.',[['Reload',()=>location.reload()]]);}
};
document.body.append(panel,badge,recoveryLinks);""")
    text = replace_once(text,
        "async function start(uid,my,ignoreRecovery=false,importLegacy=false,choiceMade=false){",
        "async function start(uid,my,ignoreRecovery=false){")
    text = replace_once(text,
        """    if(uid && !choiceMade) {
      const result=await db.transaction(async tx=>({modern:await tx.read(uid,'aces_v3'),legacy:await tx.read(uid,'aces')}));
      if(my!==generation || auth.currentUser?.uid!==uid)return;
      if(!result.modern && result.legacy) {
        show('An old ACES account save exists. You can copy only its unlocks and tutorial flag into a new separate save, or start fresh. Old sessions and profiles cannot be converted; the old save stays unchanged. The old game remains available.',[
          ['Copy supported old unlocks and tutorial',()=>start(uid,my,ignoreRecovery,true,true)],
          ['Start separate new save',()=>start(uid,my,ignoreRecovery,false,true)],
          ['Open old ACES',()=>location.href='/games/aces-legacy.html']]);return;
      }
    }
    const b=uid?await openAccount({uid,writerId,db,storage:localStorage,importLegacy,isCurrent:id=>auth.currentUser?.uid===id&&generation===my,""",
        """    const b=uid?await openAccount({uid,writerId,db,storage:localStorage,importLegacy:true,isCurrent:id=>auth.currentUser?.uid===id&&generation===my,""")
    text = replace_once(text,
        """    legacyLink.style.display=prior.legacy?'block':'none';
    legacyLink.textContent=uid?'Old guest game (sign out first)':'Old guest game';
    const messages=[];
    if(legacy?.session||legacy?.profile) messages.push('Your old account session and profile cannot be converted to the new game. They remain in the old game. Old sessions and profiles remain in the old game; they were not converted.');
    if(prior.modern) messages.push('An earlier new-game save is on this device. It may belong to anyone who used this browser. It is not imported into accounts.');
    if(messages.length){
      const proceed=()=>{if(my!==generation)return;launch(b,uid,my)};
      const actions=[['Continue with separate new save',proceed],['Open old ACES',()=>{location.href='/games/aces-legacy.html'}]];
      if(!uid&&prior.modern)actions.unshift(['Copy earlier new-game save into empty guest save',()=>{try{importOldGuest(localStorage);proceed()}catch(e){show('Import failed: '+e.message+'. Original data remains on this device.',[['Reload',()=>location.reload()],['Open old ACES',()=>location.href='/games/aces-legacy.html']])}}]);
      show(messages.join(' '),actions);return;
    }
""",
        """    oldAccountLink.style.display=uid&&legacy?.exists?'inline':'none';
    legacyLink.style.display=prior.legacy?'inline':'none';
    legacyLink.textContent=uid?'Old guest game (sign out first)':'Old guest game';
    earlierLink.style.display=prior.modern?'inline':'none';
    earlierLink.title='Download the earlier unscoped device save; it is not imported into your account';
    recoveryLinks.style.display=(prior.legacy||prior.modern||(uid&&legacy?.exists))?'block':'none';
""")
    text = replace_once(text,
        "  const my=++generation, uid=user?.uid||null;\n  if(started)",
        "  const my=++generation, uid=user?.uid||null;\n  recoveryLinks.style.display='none';\n  if(started)")
    TARGET.write_text(text, encoding='utf-8')
    print('Verified ACES silent-start patch applied')

if __name__ == '__main__':
    main()
