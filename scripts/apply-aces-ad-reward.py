#!/usr/bin/env python3
"""Connect the ad simulation to the verified preview's real Bits state and local save."""
import hashlib, os
from pathlib import Path
root = Path(__file__).resolve().parent.parent
out = root / '.preview-publish'
target = out / 'games/aces-assets/assets/index-OkqegR5F.js'
if os.environ.get('CONTEXT') not in ('deploy-preview', 'branch-deploy'):
    raise RuntimeError('Preview context required')
if out.is_symlink() or target.is_symlink() or not (out / '_headers').is_file():
    raise RuntimeError('Isolated preview required')
raw = target.read_bytes()
if hashlib.sha256(raw).hexdigest() != 'd82f264cfc23bc06f82aa6c0c6bbcdfcfd3fda053144f93df02a232fa7cc2db7':
    raise RuntimeError('Unexpected cosmetics bundle; refusing reward patch')
s = raw.decode('utf-8')
def replace(old, new):
    global s
    if s.count(old) != 1:
        raise RuntimeError('Reward anchor mismatch: ' + old[:100])
    s = s.replace(old, new, 1)
replace('onUnlockSkinWithBits:c,previewBg:pb,onPreviewBg:setPb})', 'onUnlockSkinWithBits:c,previewBg:pb,onPreviewBg:setPb,onAdReward:adReward})')
replace('s.jsx(acesAdShop,{lang:l})', 's.jsx(acesAdShop,{lang:l,onReward:adReward})')
replace('onEquipSkin:rh,onUnlockSkinWithBits:R=>be(R),previewBg:previewBg,onPreviewBg:setPreviewBg}', 'onEquipSkin:rh,onUnlockSkinWithBits:R=>be(R),previewBg:previewBg,onPreviewBg:setPreviewBg,onAdReward:()=>{const R=S+25;try{localStorage.setItem("aces_bits",R.toString());te(R);return !0}catch{return !1}}}')
target.write_text(s, encoding='utf-8')
print('Connected simulated-ad reward to ACES Bits state and local save.')
