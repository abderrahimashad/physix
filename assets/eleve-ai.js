/* PhysiX student AI tutor: fetch published statements only; reference answers stay on server. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let exercises=[],cachedToken="",classCode="",semester=1,selected="",busy=false,mode="hint";
const mount=document.getElementById("student-ai");
if(!mount)return;
const q=s=>mount.querySelector(s);
const message=(text,error=false)=>{const e=q("#student-ai-message");if(e){e.textContent=text;e.classList.toggle("error",error)}};
async function load(){
 if(!cachedToken)return;
 try{
  const resp=await fetch(BASE+"/rest/v1/rpc/physix_ai_my_exercises",{method:"POST",
   headers:{apikey:KEY,Authorization:"Bearer "+cachedToken,"Content-Type":"application/json"},
   body:"{}",cache:"no-store",referrerPolicy:"no-referrer"});
  if(!resp.ok)throw Error("Les exercices sont indisponibles ("+resp.status+").");
  const data=await resp.json();
  exercises=Array.isArray(data)?data:[];redraw();
 }catch(e){message(e.message,true)}
}
function redraw(){
 if(!mount||!cachedToken)return;
 if(!q("#student-ai-exercise"))return;
 const visible=exercises.filter(e=>e.class_code===classCode&&e.semester===semester);
 if(!visible.some(e=>e.id===selected))selected=visible[0]?.id||"";
 q("#student-ai-exercise").innerHTML=visible.map(e=>'<option value="'+esc(e.id)+'"'+(e.id===selected?" selected":"")+'>'+esc(e.title)+' · '+esc(e.subject)+'</option>').join("");
 q("#student-ai-exercise").disabled=!visible.length;
 const exercise=visible.find(e=>e.id===selected);
 q("#student-ai-statement").textContent=exercise?.statement||"Aucun exercice publié par votre professeur pour ce semestre.";
 q("#student-ai-run").disabled=!exercise||busy;
 q("#student-ai-content").placeholder=mode==="hint"?
  "Quelle relation dois-je utiliser ? Je ne comprends pas la question 2…":
  "Ma méthode : j'ai isolé la tension U… Puis j'obtiens… avec les unités…";
 q("#student-ai-content").maxLength=mode==="hint"?1500:6000;
 q("#student-ai-field").textContent=mode==="hint"?"Ma question sur cet exercice":"Ma solution à comparer au corrigé du professeur";
 q("#student-ai-run").textContent=mode==="hint"?"Demander un indice":"Comparer ma solution";
 q("#student-ai-hint").classList.toggle("active",mode==="hint");
 q("#student-ai-compare").classList.toggle("active",mode==="compare");
}
function render({token,activeClass}){
 if(!token){mount.hidden=true;cachedToken="";exercises=[];return}
 mount.hidden=false;
 if(!q("#student-ai-exercise")){
  mount.innerHTML='<section class="student-module"><div class="student-module-head"><div>'+
   '<h3>🤖 Mon tuteur IA de physique-chimie</h3><p>Demandez un indice ou faites comparer votre démarche au corrigé du professeur.</p></div></div>'+
   '<p class="student-help">L’IA peut se tromper. Elle ne remplace pas le professeur et ne donne aucune note officielle. Les réponses modèles restent privées.</p>'+
   '<div class="student-ai-controls"><label>Semestre<select id="student-ai-sem"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></label>'+
   '<label>Exercice<select id="student-ai-exercise"></select></label></div>'+
   '<div class="student-ai-statement"><strong>Énoncé</strong><p id="student-ai-statement"></p></div>'+
   '<div class="student-subtabs"><button type="button" id="student-ai-hint">💡 Demander un indice</button>'+
   '<button type="button" id="student-ai-compare">✅ Vérifier ma solution</button></div>'+
   '<form id="student-ai-form"><label id="student-ai-field" for="student-ai-content">Ma question</label>'+
   '<textarea id="student-ai-content" rows="6" required maxlength="1500"></textarea>'+
   '<button type="submit" id="student-ai-run">Demander un indice</button></form>'+
   '<div id="student-ai-message" class="status" role="status" aria-live="polite"></div>'+
   '<div class="student-ai-response" id="student-ai-response" aria-live="polite"></div></section>';
  q("#student-ai-sem").onchange=e=>{semester=Number(e.target.value);redraw()};
  q("#student-ai-exercise").onchange=e=>{selected=e.target.value;q("#student-ai-response").textContent="";redraw()};
  q("#student-ai-hint").onclick=()=>{mode="hint";redraw()};
  q("#student-ai-compare").onclick=()=>{mode="compare";redraw()};
  q("#student-ai-form").onsubmit=async e=>{
   e.preventDefault();if(busy||!selected)return;
   const content=q("#student-ai-content").value.trim();
   if((mode==="hint"&&content.length<5)||(mode==="compare"&&content.length<25))
    return message(mode==="hint"?"Posez une question précise.":"Décrivez votre démarche en au moins 25 caractères.",true);
   busy=true;q("#student-ai-run").disabled=true;message("Analyse en cours…");
   try{
    const response=await fetch(BASE+"/functions/v1/physix-ai-tutor",{
     method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+cachedToken,"Content-Type":"application/json"},
     body:JSON.stringify({exercise_id:selected,mode,...(mode==="hint"?{question:content}:{answer:content})}),
     cache:"no-store",referrerPolicy:"no-referrer"});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(data.message||"L’assistant n’est pas encore configuré.");
    q("#student-ai-response").textContent=data.reply||"Aucune réponse reçue.";
    message("Explication indicative. Vérifiez les calculs avec votre professeur.");
   }catch(error){message(error.message,true)}
   finally{busy=false;redraw()}
  };
 }
 const changed=token!==cachedToken,previousClass=classCode;
 cachedToken=token;classCode=activeClass;
 if(changed){exercises=[];selected="";load()}
 else if(previousClass!==activeClass)redraw();
 else redraw();
}
window.physixStudentAi={render,clear:()=>{cachedToken="";exercises=[];selected="";mount.hidden=true;mount.replaceChildren()}};
})();