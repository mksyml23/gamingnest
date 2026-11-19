/* Preview-only cosmetics. Try-on is temporary and never spends Bits. */
const ACES_PREVIEW_BACKGROUNDS = [
  {id:'classic',name:'Classic Grid',nameNl:'Klassiek raster',css:'none'},
  {id:'aurora',name:'Aurora Circuit',nameNl:'Aurora Circuit',css:'radial-gradient(ellipse at 20% 30%,#116d58 0%,#071b2a 45%,#030308 85%)'},
  {id:'nebula',name:'Violet Nebula',nameNl:'Violette nevel',css:'radial-gradient(ellipse at 75% 35%,#622583 0%,#1d123f 40%,#030308 85%)'},
  {id:'sunset',name:'Solar Flare',nameNl:'Zonnevlam',css:'radial-gradient(ellipse at 50% 90%,#a43d1e 0%,#3c1833 42%,#030308 90%)'},
  {id:'ocean',name:'Deep Ocean',nameNl:'Diepe oceaan',css:'radial-gradient(ellipse at 50% 20%,#135c86 0%,#08293e 45%,#020912 88%)'},
  {id:'matrix',name:'Matrix Rain',nameNl:'Matrixregen',css:'repeating-linear-gradient(90deg,transparent 0 28px,#42ff7414 29px 30px),linear-gradient(160deg,#123a28,#020b08)'},
  {id:'ember',name:'Ember Core',nameNl:'Sintelkern',css:'radial-gradient(circle at 70% 70%,#893016,#290c14 45%,#080306 88%)'},
  {id:'ice',name:'Glacier',nameNl:'Gletsjer',css:'linear-gradient(140deg,#1b5065,#0e203a 50%,#030811)'},
  {id:'royal',name:'Royal Night',nameNl:'Koninklijke nacht',css:'radial-gradient(ellipse at 25% 10%,#413b91,#161230 55%,#06040f)'}
];
function AcesPreviewBackgrounds({lang,selected,onSelect}) {
 const nl=lang==='nl';
 return s.jsxs('section',{id:'aces-preview-backgrounds',style:{padding:'12px',border:'1px solid #32565c',borderRadius:8,background:'#071318'},children:[
  s.jsx('h3',{style:{fontSize:12,color:'#b7fff4',fontWeight:800},children:nl?'ACHTERGRONDEN · TIJDELIJK UITPROBEREN':'BACKGROUNDS · TEMPORARY TRY-ON'}),
  s.jsx('p',{style:{fontSize:10,color:'#a3b6b6',margin:'5px 0 10px'},children:nl?'Gratis preview; wordt niet opgeslagen.':'Free preview; resets on reload.'}),
  s.jsx('div',{style:{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))',gap:7},children:ACES_PREVIEW_BACKGROUNDS.map(b=>s.jsxs('button',{id:'aces-bg-'+b.id,type:'button',onClick:()=>onSelect(b.id),style:{textAlign:'left',border:selected===b.id?'2px solid #5bffdc':'1px solid #42606a',borderRadius:6,padding:'7px',color:'white',background:'#101820',cursor:'pointer'},children:[s.jsx('span',{style:{display:'block',height:34,borderRadius:3,background:b.css==='none'?'#10151b':b.css,marginBottom:5}}),s.jsx('span',{style:{fontSize:10},children:(nl?b.nameNl:b.name)+(selected===b.id?' ✓':'')})]},b.id))})
 ]});
}
/* Add a subtle visual mark only for the new skins; collision and physics stay unchanged. */
function acesPreviewDrawSkin(ctx,x,y,size,color){
 const codes=['#ffcf4b','#f98b5d','#fe7394','#ed55b5','#ba7cff','#8d72ff','#71a4ff','#5bd5ff','#75f5e7','#4dff9e','#b9ff66','#f5f77a','#f0bfff','#cad9ff','#ffd5a6','#f48fff','#82fff8','#ff736c'];
 const n=codes.indexOf(String(color).toLowerCase());if(n<0)return;
 ctx.save();ctx.globalAlpha=.8;ctx.strokeStyle=n%2?'#101026':'#ffffff';ctx.lineWidth=2;
 if(n%3===0){ctx.strokeRect(x+size*.22,y+size*.22,size*.56,size*.56)}
 else if(n%3===1){ctx.beginPath();ctx.moveTo(x+size*.22,y+size*.25);ctx.lineTo(x+size*.78,y+size*.75);ctx.moveTo(x+size*.78,y+size*.25);ctx.lineTo(x+size*.22,y+size*.75);ctx.stroke()}
 else{ctx.beginPath();ctx.moveTo(x+size*.2,y+size*.35);ctx.lineTo(x+size*.8,y+size*.35);ctx.moveTo(x+size*.2,y+size*.65);ctx.lineTo(x+size*.8,y+size*.65);ctx.stroke()}
 ctx.restore();
}
