/* PhysiX student chapter QCM; exactly one answer stored and graded on the server. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slot=document.getElementById("student-qcm");
if(!slot)return;
let token="",classCode="",semester=1,chapter="",questions=[],sending=false;
const q=s=>slot.querySelector(s);
const inform=(txt,bad=false)=>{const e=q("#student-qcm-feedback");if(e){e.textContent=txt;e.classList.toggle("error",bad)}};
function available(){return questions.filter(x=>x.class_code===classCode&&x.semester===semester)}
function draw(){
 if(!token||!q("#student-qcm-questions"))return;
 const current=available();
 const chapters=[...new Map(current.map(x=>[x.chapter_id,x.chapter_title])).entries()];
 if(!chapters.some(([id])=>id===chapter))chapter=chapters[0]?.[0]||"";
 q("#student-qcm-chapter").innerHTML=chapters.map(([id,title])=>
  '<option value="'+esc(id)+'"'+(id===chapter?" selected":"")+'>'+esc(title)+'</option>').join("");
 const selected=current.filter(x=>x.chapter_id===chapter),answered=selected.filter(x=>x.answered),correct=answered.filter(x=>x.is_correct);
 q("#student-qcm-summary").textContent=selected.length?
  "Progression : "+answered.length+"/"+selected.length+" question(s) · "+correct.length+" bonne(s) réponse(s).":
  "Aucun QCM publié pour ce semestre et cette classe.";
 q("#student-qcm-questions").innerHTML=selected.map((item,i)=>{
  const choices=Array.isArray(item.options)?item.options:[];
  return '<article class="student-qcm-card"><div class="student-qcm-question"><strong>'+
   (i+1)+'. '+esc(item.question)+'</strong></div>'+
   (item.answered?'<div class="student-qcm-answered">'+(item.is_correct?"✅ Bonne réponse !":"❌ Réponse incorrecte")+
    '<p>Votre choix : '+esc(choices[item.selected_option]||"Non disponible")+'</p>'+
    (item.explanation?'<p>'+esc(item.explanation)+'</p>':"")+'</div>':
    '<form data-id="'+esc(item.id)+'"><fieldset><legend>Choisissez une seule réponse :</legend>'+
    choices.map((option,index)=>'<label class="student-qcm-choice"><input type="radio" name="answer" value="'+index+'" required>'+
     '<span>'+esc("ABCD"[index])+' — '+esc(option)+'</span></label>').join("")+
    '</fieldset><button type="submit">Valider ma réponse</button></form>')+'</article>';
 }).join("");
 q("#student-qcm-questions").querySelectorAll("form[data-id]").forEach(form=>form.addEventListener("submit",e=>submit(e,form)));
}
async function load(){
 if(!token)return;
 const expected=token;
 try{
  const result=await fetch(BASE+"/rest/v1/rpc/physix_student_chapter_qcm",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:"{}",cache:"no-store",referrerPolicy:"no-referrer"});
  if(!result.ok)throw Error("Impossible de charger le QCM.");
  const data=await result.json();
  if(token!==expected)return;
  questions=Array.isArray(data)?data:[];draw();
 }catch(e){if(token===expected)inform(e.message,true)}
}
async function submit(e,form){
 e.preventDefault();if(sending||!token)return;
 const id=form.dataset.id,item=questions.find(x=>x.id===id);
 if(!item||item.answered)return;
 const choice=Number(new FormData(form).get("answer"));
 if(!Number.isInteger(choice)||choice<0||choice>3)return;
 const button=form.querySelector("button[type=submit]");
 sending=true;button.disabled=true;inform("Vérification de votre réponse…");
 try{
  const response=await fetch(BASE+"/rest/v1/rpc/physix_student_answer_qcm",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},
   body:JSON.stringify({p_question:id,p_selected:choice}),cache:"no-store",referrerPolicy:"no-referrer"});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.message||"Réponse non enregistrée.");
  item.answered=true;item.selected_option=choice;item.is_correct=Boolean(data.is_correct);
  item.explanation=String(data.explanation||"");
  inform(item.is_correct?"Bonne réponse !":"Continuez à réviser ce point du cours.");
  draw();
 }catch(error){inform(error.message,true)}
 finally{sending=false;button.disabled=false}
}
window.physixStudentQcm={
 render({token:newToken,activeClass}){
  if(!newToken){this.clear();return}
  slot.hidden=false;
  const changed=newToken!==token;
  token=newToken;classCode=activeClass;
  if(!q("#student-qcm-questions")){
   slot.innerHTML='<section class="student-module"><div class="student-module-head"><div>'+
    '<h3>✅ Questions de cours — QCM</h3>'+
    '<p>Révisez chaque chapitre de physique-chimie et choisissez la bonne réponse.</p></div></div>'+
    '<div class="student-ai-controls"><label>Semestre<select id="student-qcm-sem"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></label>'+
    '<label>Chapitre<select id="student-qcm-chapter"></select></label></div>'+
    '<p id="student-qcm-summary" class="student-help"></p>'+
    '<div id="student-qcm-feedback" class="status" role="status" aria-live="polite"></div>'+
    '<div id="student-qcm-questions"></div>'+
    '<p class="student-help">Une seule réponse par question. Le résultat est pédagogique et n’ajoute aucune note d’activité /20.</p></section>';
   q("#student-qcm-sem").onchange=e=>{semester=Number(e.target.value);chapter="";draw()};
   q("#student-qcm-chapter").onchange=e=>{chapter=e.target.value;draw()};
  }
  if(changed){questions=[];load()}else draw();
 },
 clear(){token="";questions=[];slot.hidden=true;slot.replaceChildren()}
};
})();