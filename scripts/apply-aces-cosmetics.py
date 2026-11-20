#!/usr/bin/env python3
"""Extend the verified production build without rewriting its release chunks."""
from pathlib import Path
import hashlib

ROOT=Path(__file__).resolve().parent.parent
ASSETS=ROOT/'soepgames/games/aces-assets/assets'
HTML=ROOT/'soepgames/games/aces.html'
EXPECTED={
    ASSETS/'game-bundle.mjs':'4cc93ba372e07a72a7df48d182d076e6eb320d439da238af73a35faaed7c9848',
    ASSETS/'core.mjs':'4f2a8a2e9712d5ef073a35626323ed02002c3ab6416a7b2ef00faeab4863282e',
    HTML:'c0a279877abe941d21935b339cad36e4c0451be59dcb9f63b910f573811d54f3',
}

def replace_once(s,old,new):
    if s.count(old)!=1: raise RuntimeError('Expected exactly one patch target: '+old[:120])
    return s.replace(old,new,1)

def main():
    originals={}
    for path,sha in EXPECTED.items():
        data=path.read_bytes()
        if hashlib.sha256(data).hexdigest()!=sha: raise RuntimeError('Unexpected release input: '+str(path))
        originals[path]=data.decode('utf-8')
    bundle=originals[ASSETS/'game-bundle.mjs']
    bundle='import {newSkins as acesNewSkins, change as acesChangeCosmetic, changeSkin as acesChangeSkin, makeCosmetics as acesMakeCosmetics} from "./cosmetics.mjs";\n'+bundle
    bundle=replace_once(bundle,'acesAdShop=acesMakeAdExperimentShop(j,s),Ec=[','acesAdShop=acesMakeAdExperimentShop(j,s),acesCosmetics=acesMakeCosmetics(j,s),Ec=[')
    bundle=replace_once(bundle,'costBits:500}],cx=(', 'costBits:500},...acesNewSkins],cx=(')
    bundle=replace_once(bundle,'onAdReward:adReward})=>e?', 'onAdReward:adReward,onChangeCosmetic:changeCosmetic})=>e?')
    bundle=replace_once(bundle,'s.jsx(acesAdShop,{lang:l,onReward:adReward}),...Ec.map', 's.jsx(acesAdShop,{lang:l,onReward:adReward}),s.jsx(acesCosmetics,{inventory:n,bits:a,lang:l,onChange:changeCosmetic}),...Ec.map')
    bundle=replace_once(bundle,'rh=R=>{be(R),localStorage.setItem("aces_active_skin",R),ee.playEffect("jump")},oh=(R,T)=>{if(S<T)return;const D=S-T;te(D),localStorage.setItem("aces_bits",D.toString());const se=[...Fe,R];qt(se),localStorage.setItem("aces_unlocked_skins",JSON.stringify(se)),be(R),localStorage.setItem("aces_active_skin",R),ee.playEffect("success")}', 'rh=R=>{try{const x=acesChangeSkin(localStorage,Ec.find(item=>item.id===R));qt(x.inventory);te(x.bits);be(x.activeSkin);ee.playEffect("jump")}catch(err){he(o==="nl"?"Skin niet opgeslagen.":"Skin was not saved.");setTimeout(()=>he(null),3500)}},oh=(R,T)=>{rh(R)}')
    bundle=replace_once(bundle,'const rh=R=>', 'const acesCosmeticChange=(type,id)=>{try{const result=acesChangeCosmetic(localStorage,type,id);qt(result.inventory);te(result.bits);ee.playEffect("success")}catch(err){he(o==="nl"?"Aanpassing niet opgeslagen. Controleer je Bits en opslag.":"Cosmetic not saved. Check your Bits and save status.");setTimeout(()=>he(null),3500)}},rh=R=>')
    bundle=replace_once(bundle,'children:[d&&s.jsx("div",{className:"scanline-effect"})', 'children:[s.jsx(acesCosmetics,{inventory:Fe,bits:S,lang:o,display:false}),d&&s.jsx("div",{className:"scanline-effect"})')
    bundle=replace_once(bundle,'onEquipSkin:rh,onUnlockSkinWithBits:oh,onAdReward:', 'onEquipSkin:rh,onUnlockSkinWithBits:oh,onChangeCosmetic:acesCosmeticChange,onAdReward:')
    core=originals[ASSETS/'core.mjs']
    core=replace_once(core, '    removeItem(k) { if (closed || problem)', '''    setItems(values) {
      if (closed || problem) throw Error('Account save is blocked');
      if (!validValues(values)) throw Error('Invalid ACES values');
      current(); const old=clone(state);
      Object.assign(state.values,values);
      try { markDirty(); } catch(e) {state=old; throw e;}
    },
    removeItem(k) { if (closed || problem)''')
    # Guest storage has no atomic multi-key primitive. Restore previous values if a
    # localStorage write fails; account saves use a single cached/cloud mutation.
    core=replace_once(core, "return {getItem(k){check(k);return storage.getItem(prefix+k);}, setItem(k,v){check(k);storage.setItem(prefix+k,String(v));}, removeItem(k)", """return {getItem(k){check(k);return storage.getItem(prefix+k);}, setItem(k,v){check(k);storage.setItem(prefix+k,String(v));}, setItems(values){
    if(!validValues(values))throw Error('Invalid ACES values');
    const entries=Object.entries(values); for(const [k] of entries)check(k);
    const old=entries.map(([k])=>[k,storage.getItem(prefix+k)]), done=[];
    try {for(const [k,v] of entries){check(k);storage.setItem(prefix+k,v);done.push(k);}}
    catch(e){for(const k of done.reverse()){const v=old.find(x=>x[0]===k)[1];if(v===null)storage.removeItem(prefix+k);else storage.setItem(prefix+k,v);}throw e;}
  }, removeItem(k)""")
    html=replace_once(originals[HTML], '</head>', '<link rel="stylesheet" href="/games/aces-assets/assets/cosmetics.css">\n  </head>')
    for path,text in [(ASSETS/'game-bundle.mjs',bundle),(ASSETS/'core.mjs',core),(HTML,html)]:path.write_text(text,encoding='utf-8')
    for name in ('cosmetics.mjs','cosmetics.css'):
        (ASSETS/name).write_bytes((ROOT/'scripts/aces-cosmetics'/name).read_bytes())
    print('Verified ACES cosmetics applied')

if __name__=='__main__':main()
