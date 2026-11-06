export * from "https://cdn.jsdelivr.net/gh/mksyml23/gamingnest@2fcac71/soepgames/firebase-app.js";
import "https://cdn.jsdelivr.net/gh/mksyml23/gamingnest@2fcac71/soepgames/firebase-app.js";

const repair=()=>{
  if(!document.getElementById("gn-preview-polish")){
    const style=document.createElement("style");
    style.id="gn-preview-polish";
    style.textContent=`#language-select{display:none!important}.gn-language{position:absolute;left:4%;top:20px;z-index:101;font-family:Poppins,sans-serif}.gn-language__button{display:flex;align-items:center;gap:7px;min-height:38px;padding:8px 12px;border:1px solid rgba(0,191,255,.52);border-radius:999px;background:rgba(6,8,13,.9);color:#d9f7ff;font:700 .8rem/1 Poppins,sans-serif;cursor:pointer;box-shadow:0 5px 16px rgba(0,0,0,.3)}.gn-language__button:hover,.gn-language__button:focus-visible{background:#0d1e2c;border-color:#75ddff}.gn-language__menu{display:none;position:absolute;top:calc(100% + 7px);left:0;min-width:142px;padding:5px;background:#0f121a;border:1px solid rgba(0,191,255,.35);border-radius:12px;box-shadow:0 14px 30px rgba(0,0,0,.45)}.gn-language.open .gn-language__menu{display:grid;gap:2px}.gn-language__menu button{padding:9px 10px;border:0;border-radius:8px;background:transparent;color:#d7dfec;text-align:left;font:700 .78rem/1.2 Poppins,sans-serif;cursor:pointer}.gn-language__menu button:hover,.gn-language__menu button.active{background:rgba(0,191,255,.16);color:#fff}#funny-subtitle,.results-summary,.hero-desc,.featured-desc,.hover-stats,.account-switch{color:#b9c5d5!important}.empty-results{color:#e0e9f4!important;border-color:rgba(0,191,255,.58)!important}.gn-hof-empty{width:min(100%,420px);margin:0 auto;padding:22px 24px;border:1px dashed rgba(255,215,0,.5);border-radius:14px;background:rgba(15,18,26,.78);color:#e6edf7;line-height:1.55}@media(max-width:650px){.gn-language{top:15px;left:4%}.gn-language__button{min-height:36px}}`;
    document.head.appendChild(style);
  }
  const native=document.getElementById("language-select");if(native){native.hidden=true;native.style.display="none";}
  const hall=document.querySelector(".hof-grid");if(hall&&!hall.querySelector(".hof-card")&&!hall.querySelector("#gn-hof-empty")){const empty=document.createElement("p");empty.id="gn-hof-empty";empty.className="gn-hof-empty";empty.textContent=document.documentElement.lang==="nl"?"De eerste legendarische run verdient hier een plek.":"The first legendary run earns its spot here.";hall.appendChild(empty);}
};
repair();window.addEventListener("load",repair);