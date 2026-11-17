#!/usr/bin/env python3
"""Apply temporary try-on cosmetics to the verified isolated preview only."""
import hashlib, json, os
from pathlib import Path
root = Path(__file__).resolve().parent.parent
out = root / '.preview-publish'
target = out / 'games/aces-assets/assets/index-OkqegR5F.js'
if os.environ.get('CONTEXT') not in ('deploy-preview','branch-deploy'):
    raise RuntimeError('Preview context required')
if out.is_symlink() or not (out/'_headers').is_file() or target.is_symlink():
    raise RuntimeError('Isolated preview required')
raw = target.read_bytes()
if hashlib.sha256(raw).hexdigest() != '300edea3dcfd61a945c0d885488fd5b7df4d48ddc89bdadb51599e9981a43137':
    raise RuntimeError('Unexpected bundle; refusing patch')
s = raw.decode('utf-8')
def replace(a,b):
    global s
    if s.count(a) != 1: raise RuntimeError('Unexpected patch anchor: '+a[:100])
    s=s.replace(a,b,1)
skins = [
 ('sunburst','Sunburst','Zonnestraal','#ffcf4b','#ff8a24',1200),
 ('peach_comet','Peach Comet','Perzikkomeet','#f98b5d','#ff5030',1600),
 ('coral_pulse','Coral Pulse','Koraalpuls','#fe7394','#fa3159',1900),
 ('pink_nova','Pink Nova','Roze Nova','#ed55b5','#ff9be5',2400),
 ('amethyst','Amethyst','Amethist','#ba7cff','#6d35e5',2800),
 ('ultraviolet','Ultraviolet','Ultraviolet','#8d72ff','#e34aff',3200),
 ('cosmic_blue','Cosmic Blue','Kosmisch blauw','#71a4ff','#315eff',3600),
 ('arctic_wave','Arctic Wave','Poolgolf','#5bd5ff','#b7ffff',4000),
 ('mint_flux','Mint Flux','Muntflux','#75f5e7','#15b3a6',4400),
 ('toxic_spark','Toxic Spark','Giftige vonk','#4dff9e','#f2ff3a',4800),
 ('lime_dash','Lime Dash','Limoenflits','#b9ff66','#2cff9c',5200),
 ('lemon_glitch','Lemon Glitch','Citroenglitch','#f5f77a','#ffad26',5600),
 ('lavender_dream','Lavender Dream','Lavendeldroom','#f0bfff','#b55fff',6200),
 ('moonstone','Moonstone','Maansteen','#cad9ff','#78a4ff',6800),
 ('sandstorm','Sandstorm','Zandstorm','#ffd5a6','#e98455',7400),
 ('orchid_shift','Orchid Shift','Orchidee Shift','#f48fff','#ae55ff',8200),
 ('aqua_prism','Aqua Prism','Aquaprisma','#82fff8','#36c4ff',9000),
 ('redline','Redline','Rode lijn','#ff736c','#ffb300',10000),
]
encoded=','.join(json.dumps(dict(id=id,name=name,nameNl=nl,color=color,trailColor=trail,costBits=cost),separators=(',',':')) for id,name,nl,color,trail,cost in skins)
replace('"costBits":5000}],cx=(', '"costBits":5000},'+encoded+'],cx=(')
replace('[M,B]=j.useState(!1),[L,Z]', '[M,B]=j.useState(!1),[previewBg,setPreviewBg]=j.useState("classic"),[L,Z]')
replace('unlockedSkinIds:n,activeSkinId:i,onEquipSkin:u,onUnlockSkinWithBits:c})', 'unlockedSkinIds:n,activeSkinId:i,onEquipSkin:u,onUnlockSkinWithBits:c,previewBg:pb,onPreviewBg:setPb})')
replace('s.jsx(acesAdShop,{lang:l}),...Ec.map', 's.jsx(acesAdShop,{lang:l}),s.jsx(AcesPreviewBackgrounds,{lang:l,selected:pb,onSelect:setPb}),s.jsx("p",{style:{color:"#b9d7d4",fontSize:11},children:l==="nl"?"Preview: alle skins gratis tijdelijk uitproberen. Aankopen zijn uitgeschakeld.":"Preview: try all skins temporarily for free. Purchases are disabled."}),...Ec.map')
replace('disabled:!v,onClick:()=>c(r.id,r.costBits)', 'disabled:!1,onClick:()=>c(r.id,r.costBits)')
replace('${v?"bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] border border-[#00ff9d]/40":"bg-white/5 text-stone-500 border border-white/5 cursor-not-allowed"}', '${"bg-[#00ff9d]/20 hover:bg-[#00ff9d]/30 text-[#00ff9d] border border-[#00ff9d]/40 cursor-pointer"}')
replace('children:[r.costBits," ","BITS"]', 'children:[l==="nl"?"GRATIS PROBEREN":"TRY FREE"]')
replace('l==="nl"?`Kost ${r.costBits} Bits`:`Cost: ${r.costBits} Bits`', 'l==="nl"?"Tijdelijke gratis preview":"Free temporary preview"')
replace('title:v?l==="nl"?"Ontgrendel met Bits":"Unlock with Bits":l==="nl"?"Onvoldoende Bits":"Not enough Bits"', 'title:l==="nl"?"Tijdelijk uitproberen, geen Bits uitgegeven":"Temporary try-on; no Bits spent"')
replace('onEquipSkin:rh,onUnlockSkinWithBits:oh}', 'onEquipSkin:rh,onUnlockSkinWithBits:R=>be(R),previewBg:previewBg,onPreviewBg:setPreviewBg}')
replace(' ${e==="RECOVERY"?"recovery-mode":""}`,children:[d&&', ' ${e==="RECOVERY"?"recovery-mode":""}`,style:{"--aces-preview-bg":(ACES_PREVIEW_BACKGROUNDS.find(q=>q.id===previewBg)||ACES_PREVIEW_BACKGROUNDS[0]).css},children:[d&&')
replace('style:{aspectRatio:"840 / 480"}', 'style:{aspectRatio:"840 / 480",backgroundImage:"var(--aces-preview-bg, none)"}')
replace('N.fillRect(b.current.x,b.current.y,hl,hl);const oa=', 'N.fillRect(b.current.x,b.current.y,hl,hl);acesPreviewDrawSkin(N,b.current.x,b.current.y,hl,de);const oa=')
s=(root/'scripts/aces-preview-cosmetics.js').read_text(encoding='utf8')+'\n'+s
target.write_text(s,encoding='utf8')
print('Added 18 preview-only try-on skins and 8 temporary backgrounds; all purchases disabled.')
