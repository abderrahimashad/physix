/* PhysiX classroom wheel: teacher-only roster, unbiased random pick, optional no-repeat cycle. */
(()=>{
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
function secureIndex(n){
 if(!Number.isSafeInteger(n)||n<=0)throw Error("Liste vide.");
 const max=0x100000000,lim=max-(max%n),buf=new Uint32Array(1);
 do{crypto.getRandomValues(buf)}while(buf[0]>=lim);
 return buf[0]%n;
}
window.physixClassWheel=(root,{rows,rest})=>{
 const pane=document.createElement("section");pane.className="content-section px-wheel";
 const classes=(rows.classes||[]).filter(x=>x.active);
 pane.innerHTML='<h3>🎡 Roue aléatoire — Qui va au tableau ?</h3>'+
 '<p>Choisissez une classe et lancez le tirage. Les noms de vos élèves restent privés et le tirage ne change aucune note.</p>'+
 '<div class="px-wheel-controls"><label>Classe<select id="wheel-class">'+classes.map(c=>
 '<option value="'+esc(c.code)+'">'+esc(c.code)+'</option>').join("")+'</select></label>'+
 '<label class="px-wheel-checkbox"><input type="checkbox" id="wheel-norepeat" checked> Ne pas reprendre un élève avant que tous soient passés</label></div>'+
 '<div id="wheel-message" role="status" aria-live="polite"></div>'+
 '<div class="px-wheel-stage"><div class="px-wheel-pointer" aria-hidden="true">▼</div>'+
 '<div id="wheel-disc" class="px-wheel-disc" aria-label="Roue de sélection aléatoire">'+
 '<div id="wheel-center" class="px-wheel-center">🎡</div></div></div>'+
 '<div id="wheel-winner" class="px-wheel-winner" aria-live="polite">Prêt pour le tirage !</div>'+
 '<div class="px-wheel-actions"><button id="wheel-spin" type="button">🎲 Tourner la roue</button>'+
 '<button id="wheel-reset" type="button">Réinitialiser le cycle</button></div>'+
 '<p id="wheel-left" class="px-wheel-left"></p>';
 root.append(pane);
 const q=s=>pane.querySelector(s);
 let classCode=classes[0]?.code||"",pupils=[],used=new Set(),spinning=false,rotation=0;
 const message=(t,bad=false)=>{q("#wheel-message").textContent=t;q("#wheel-message").classList.toggle("bad",bad)};
 function draw(){
  const pool=pupils.filter(p=>!q("#wheel-norepeat").checked||!used.has(p.id));
  q("#wheel-spin").disabled=spinning||!pool.length;
  q("#wheel-left").textContent=pupils.length?(pool.length+" élève(s) disponibles sur "+pupils.length):"Aucun élève actif pour cette classe.";
  const n=pupils.length;
  if(!n){q("#wheel-disc").style.background="#e8f0fe";q("#wheel-center").textContent="—";return}
  const sections=pupils.map((p,i)=>{const from=360*i/n,to=360*(i+1)/n;
   return 'hsl('+(i*137.5%360).toFixed(1)+' 69% 66%) '+from.toFixed(2)+'deg '+to.toFixed(2)+'deg';
  }).join(",");
  q("#wheel-disc").style.background="conic-gradient("+sections+")";
  q("#wheel-center").textContent=n+" élèves";
  q("#wheel-disc").title=pupils.map(p=>p.full_name).join(" · ");
 }
 async function load(){
  used.clear();q("#wheel-winner").textContent="Prêt pour le tirage !";
  if(!classCode){message("Ajoutez une classe puis les élèves dans Suivi.",true);pupils=[];draw();return}
  try{
   pupils=await rest("pupils","?select=id,full_name,active&class_code=eq."+encodeURIComponent(classCode)+
    "&active=eq.true&order=full_name.asc&limit=500");
   message(pupils.length+" élève(s) actifs dans "+classCode+".");draw();
  }catch(e){pupils=[];message(e.message,true);draw()}
 }
 function spin(){
  if(spinning)return;
  let pool=pupils.filter(p=>!q("#wheel-norepeat").checked||!used.has(p.id));
  if(!pool.length){message("Tous les élèves ont été tirés. Réinitialisez le cycle.");return}
  const target=pool[secureIndex(pool.length)];
  const position=pupils.findIndex(p=>p.id===target.id);
  const slice=360/pupils.length;
  // wheel starts at 12 o'clock, correct for CSS conic gradient and pointer at 12 o'clock.
  const desired=((360-(position+.5)*slice)%360+360)%360;
  const current=((rotation%360)+360)%360;
  const correction=(desired-current+360)%360;
  rotation+=1800+correction;
  spinning=true;q("#wheel-winner").textContent="🎡 La roue tourne…";
  q("#wheel-disc").style.transform="rotate("+rotation+"deg)";
  draw();
  // Timer controls animation only; chosen identity is computed before animation with crypto RNG.
  window.setTimeout(()=>{
   if(!pane.isConnected)return;
   spinning=false;if(q("#wheel-norepeat").checked)used.add(target.id);
   q("#wheel-winner").textContent="🎉 "+target.full_name+" — au tableau !";
   message("Élève sélectionné de façon aléatoire. Aucun point ajouté automatiquement.");
   draw();
  },4600);
 }
 q("#wheel-class").onchange=e=>{classCode=e.target.value;load()};
 q("#wheel-norepeat").onchange=()=>{used.clear();draw()};
 q("#wheel-reset").onclick=()=>{if(spinning)return;used.clear();q("#wheel-winner").textContent="Cycle réinitialisé.";draw()};
 q("#wheel-spin").onclick=spin;
 load();
};
})();