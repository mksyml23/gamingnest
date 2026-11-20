// Cosmetic IDs share the existing string-array inventory so older releases can
// still read cloud saves. Only the active markers for our own categories change.
export const newSkins = [
  {id:'prism_ice', name:'Prism Ice', nameNl:'Prisma IJs', color:'#b9f3ff', trailColor:'#5ccfff', costBits:800},
  {id:'lava_core', name:'Lava Core', nameNl:'Lavakern', color:'#ff6947', trailColor:'#ff3100', costBits:1200},
  {id:'toxic_lime', name:'Toxic Lime', nameNl:'Giftige Limoen', color:'#c8ff29', trailColor:'#76ff03', costBits:1800},
  {id:'royal_gold', name:'Royal Gold', nameNl:'Koninklijk Goud', color:'#ffe28a', trailColor:'#ffc128', costBits:2500},
  {id:'glitch_rose', name:'Glitch Rose', nameNl:'Glitch Roos', color:'#ffb1dc', trailColor:'#fc36ac', costBits:3500},
  {id:'arctic_ghost', name:'Arctic Ghost', nameNl:'Poolgeest', color:'#e0fffa', trailColor:'#52ffe3', costBits:5000},
  {id:'deep_space', name:'Deep Space', nameNl:'Diepe Ruimte', color:'#8c9cff', trailColor:'#653cff', costBits:7500},
  {id:'singularity', name:'Singularity', nameNl:'Singulariteit', color:'#f7edff', trailColor:'#c05fff', costBits:12000},
  {id:'supernova', name:'Supernova', nameNl:'Supernova', color:'#fff1b6', trailColor:'#ff652e', costBits:18000},
  {id:'aces_legend', name:'ACES Legend', nameNl:'ACES Legende', color:'#d3ffff', trailColor:'#00ffcc', costBits:30000}
];
export const catalog = {
  bg: [
    {id:'default', name:'Original', nl:'Origineel', price:0},
    {id:'grid', name:'Quantum Grid', nl:'Quantumraster', price:700},
    {id:'nebula', name:'Violet Nebula', nl:'Violette Nevel', price:1500},
    {id:'ember', name:'Ember Field', nl:'Gloedveld', price:2800},
    {id:'aurora', name:'Aurora Drift', nl:'Poollicht', price:4500},
    {id:'abyss', name:'Deep Abyss', nl:'Diepe Afgrond', price:8000},
    {id:'starlight', name:'Starlight', nl:'Sterrenlicht', price:14000}
  ],
  theme: [
    {id:'default', name:'Original', nl:'Origineel', price:0},
    {id:'terminal', name:'Terminal Green', nl:'Terminalgroen', price:1200},
    {id:'violet', name:'Violet Protocol', nl:'Violet Protocol', price:3000},
    {id:'amber', name:'Amber Archive', nl:'Amberarchief', price:6000},
    {id:'ice', name:'Glacial System', nl:'IJssysteem', price:10000},
    {id:'crimson', name:'Crimson Signal', nl:'Karmozijn Signaal', price:16000},
    {id:'gold', name:'Golden Core', nl:'Gouden Kern', price:25000}
  ]
};
const own = (type,id) => `cosmetic:${type}:${id}`;
const active = type => `cosmetic:active:${type}:`;
export function selected(inventory,type) {
  const marker = inventory.find(x=>typeof x==='string' && x.startsWith(active(type)));
  const id=marker?.slice(active(type).length);
  return catalog[type].some(x=>x.id===id) && (id==='default'||inventory.includes(own(type,id))) ? id : 'default';
}
function read(storage) {
  const raw=storage.getItem('aces_unlocked_skins');
  const inv=raw===null?['default']:JSON.parse(raw);
  if(!Array.isArray(inv)||!inv.every(x=>typeof x==='string')) throw Error('Invalid inventory; no changes made');
  const b=storage.getItem('aces_bits');
  if(b!==null && !/^(0|[1-9]\d*)$/.test(b)) throw Error('Invalid Bits balance; no changes made');
  const bits=b===null?0:Number(b);
  if(!Number.isSafeInteger(bits)) throw Error('Invalid Bits balance; no changes made');
  return {inv,bits};
}
// One bridge mutation ensures the cloud never sees a debit without the item.
export function change(storage,type,id) {
  const item=catalog[type]?.find(x=>x.id===id);
  if(!item) throw Error('Unknown cosmetic');
  const {inv,bits}=read(storage);
  const owned=id==='default'||inv.includes(own(type,id));
  if(!owned && bits<item.price) throw Error('Not enough Bits');
  const updated=inv.filter(x=>!x.startsWith(active(type)));
  if(!owned)updated.push(own(type,id));
  if(id!=='default')updated.push(active(type)+id);
  const balance=owned?bits:bits-item.price;
  const values={'aces_unlocked_skins':JSON.stringify(updated)};
  if(!owned)values.aces_bits=String(balance);
  storage.setItems(values);
  return {inventory:updated,bits:balance};
}
export function changeSkin(storage,item) {
  if(!item || typeof item.id!=='string' || !Number.isSafeInteger(item.costBits) || item.costBits<0) throw Error('Unknown skin');
  const {inv,bits}=read(storage);
  const owned=item.costBits===0 || inv.includes(item.id);
  if(!owned && bits<item.costBits) throw Error('Not enough Bits');
  const updated=owned?inv:[...inv,item.id], balance=owned?bits:bits-item.costBits;
  const values={'aces_active_skin':item.id};
  if(!owned){values.aces_unlocked_skins=JSON.stringify(updated);values.aces_bits=String(balance);}
  storage.setItems(values);
  return {inventory:updated,bits:balance,activeSkin:item.id};
}
export function makeCosmetics(React, jsx) {
  const h=jsx.jsx, hs=jsx.jsxs;
  return function Cosmetics({inventory,bits,lang,onChange,display=true}) {
    const bg=selected(inventory,'bg'), theme=selected(inventory,'theme');
    React.useEffect(()=>{
      if(display) return;
      const root=document.getElementById('root');
      root.dataset.acesBg=bg; root.dataset.acesTheme=theme;
      return ()=>{delete root.dataset.acesBg;delete root.dataset.acesTheme;};
    },[bg,theme,display]);
    if(!display)return null;
    return h('div',{className:'aces-cosmetics',children:['bg','theme'].map(type=>hs('section',{className:'aces-cosmetics-section',children:[
      h('h3',{children:type==='bg'?(lang==='nl'?'ACHTERGRONDEN':'BACKGROUNDS'):(lang==='nl'?'SYSTEEMSTIJLEN':'SYSTEM THEMES')}),
      h('p',{children:type==='bg'?(lang==='nl'?'Verandert de achtergrond van het speelveld.':'Changes the playfield backdrop.'):(lang==='nl'?'Verandert het uiterlijk van de interface.':'Changes the system interface look.')}),
      h('div',{className:'aces-cosmetic-grid',children:catalog[type].map(item=>{
        const isOwned=item.id==='default'||inventory.includes(own(type,item.id));
        const isActive=(type==='bg'?bg:theme)===item.id;
        return hs('button',{type:'button',className:`aces-cosmetic-card ${isActive?'is-active':''}`,disabled:isActive||(!isOwned&&bits<item.price),onClick:()=>onChange(type,item.id),children:[
          h('span',{className:`aces-cosmetic-swatch ${type}-${item.id}`,'aria-hidden':true}),
          h('strong',{children:lang==='nl'?item.nl:item.name}),
          h('small',{children:isActive?(lang==='nl'?'ACTIEF':'ACTIVE'):isOwned?(lang==='nl'?'KIES':'EQUIP'):`${item.price.toLocaleString()} BITS`})
        ]},item.id);
      })})
    ]},type))});
  };
}
