/* PhysiX: one chapter QCM (10 course questions + 5 applications); answers graded on server ONLY at final submission. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const slot=document.getElementById("student-qcm");
if(!slot)return;
let token="",classCode="",semester=1,chapter="",questions=[],busy=false;
const selected=new Map(),reviews=new Map(),loadingReviews=new Set();
const q=s=>slot.querySelector(s);
const message=(text,bad=false)=>{const area=q("#student-qcm-feedback");if(area){area.textContent=text;area.classList.toggle("error",bad)}};
function currentQuiz(){return questions.filter(x=>x.class_code===classCode&&x.semester===semester&&x.chapter_id===chapter)}
function currentKey(){return classCode+":"+chapter}
function progress(){
 const list=currentQuiz(),answers=selected.get(currentKey())||{};
 const finished=list.length>0&&list.every(x=>x.answered);
 const number=finished?list.length:list.filter(x=>Number.isInteger(answers[x.id])).length;
 const status=q("#student-qcm-summary");
 if(status){
  status.textContent=list.length?(finished?"QCM terminé. ":number+" / "+list.length+" réponse(s) sélectionnée(s). ")+
   (list.length===15?"10 questions de cours + 5 exercices d’application.":list.length===19?"15 questions de cours + 4 exercices d’application.":"Complétez toutes les questions."):
   "Aucun QCM publié pour ce chapitre et ce semestre.";
 }
 const button=q("#student-qcm-submit");
 if(button)button.disabled=busy||!list.length||number!==list.length||finished;
}
function draw(){
 if(!token||!q("#student-qcm-questions"))return;
 const chapters=[...new Map(questions.filter(x=>x.class_code===classCode&&x.semester===semester)
  .map(x=>[x.chapter_id,x.chapter_title])).entries()];
 if(!chapters.some(([id])=>id===chapter))chapter=chapters[0]?.[0]||"";
 q("#student-qcm-chapter").innerHTML=chapters.map(([id,name])=>
  '<option value="'+esc(id)+'"'+(id===chapter?" selected":"")+'>'+esc(name)+'</option>').join("");
 const list=currentQuiz(),key=currentKey(),answers=selected.get(key)||{},review=reviews.get(key);
 const finished=list.length>0&&list.every(x=>x.answered);
 q("#student-qcm-questions").innerHTML=list.map((item,i)=>{
  const options=Array.isArray(item.options)?item.options:[];
  const detail=review?.details?.find(r=>r.question_id===item.id);
  const prior=detail?.selected_option??item.selected_option;
  const answered=finished&&!!detail;
  const nCours=list.length===15?10:list.length===19?15:list.length;
  const heading=i<nCours?"Question de cours":"Exercice d’application";
  return '<article class="student-qcm-card"><div class="student-qcm-question"><small>'+heading+' '+(i+1)+'</small>'+
   '<strong>'+esc(item.question)+'</strong></div>'+
   (answered?'<div class="student-qcm-answered">'+(detail.is_correct?"✅ Bonne réponse":"❌ Réponse incorrecte")+
    '<p>Votre choix : '+esc("ABCD"[prior])+' — '+esc(options[prior]||"")+'</p>'+
    '<p>Bonne réponse : '+esc("ABCD"[detail.correct_option])+' — '+
    esc(options[detail.correct_option]||"")+'</p>'+
    (detail.explanation?'<p>Explication : '+esc(detail.explanation)+'</p>':"")+'</div>':
    '<fieldset '+(finished?"disabled":"")+'><legend>Sélectionnez une réponse :</legend>'+
    options.map((option,i)=>'<label class="student-qcm-choice"><input type="radio" name="answer-'+esc(item.id)+
     '" data-question="'+esc(item.id)+'" value="'+i+'"'+
     (answers[item.id]===i?' checked':'')+(finished?' disabled':'')+'>'+
     '<span>'+esc("ABCD"[i])+' — '+esc(option)+'</span></label>').join("")+'</fieldset>')+'</article>';
 }).join("")||'<p class="student-help">Votre professeur n’a pas encore publié de QCM pour ce chapitre.</p>';
 q("#student-qcm-questions").querySelectorAll("input[data-question]").forEach(input=>
  input.addEventListener("change",()=>{
   const current=selected.get(currentKey())||{};
   current[input.dataset.question]=Number(input.value);selected.set(currentKey(),current);
   progress();
  }));
 const finalArea=q("#student-qcm-final");
 if(finished){
  if(review){
   finalArea.innerHTML='<h4>📊 Bilan de votre QCM</h4><strong>'+review.correct+' / '+review.total+
    ' réponse(s) correcte(s)</strong><p>Relisez les corrections des questions ci-dessus pour comprendre vos erreurs.</p>';
  }else{
   finalArea.textContent="Récupération de votre bilan final…";
   fetchReview(key,chapter);
  }
 }else{
  finalArea.innerHTML='<button type="button" id="student-qcm-submit">Terminer le QCM et voir mon corrigé</button>'+
   '<p class="student-help">Le corrigé complet et les erreurs apparaîtront uniquement après avoir répondu à toutes les questions.</p>';
  q("#student-qcm-submit").addEventListener("click",sendFinal);
 }
 progress();
}
async function api(name,body){
 const resp=await fetch(BASE+"/rest/v1/rpc/"+name,{
  method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,"Content-Type":"application/json"},
  body:JSON.stringify(body),cache:"no-store",referrerPolicy:"no-referrer"});
 const data=await resp.json().catch(()=>({}));
 if(!resp.ok)throw Error(data.message||"Opération refusée.");
 return data;
}
async function fetchReview(key,chapterId){
 if(loadingReviews.has(key)||!token||!chapterId)return;
 loadingReviews.add(key);const thisToken=token;
 try{
  const data=await api("physix_student_review_chapter_qcm",{p_chapter:chapterId,p_class:classCode});
  if(token!==thisToken)return;
  reviews.set(key,data);
  if(key===currentKey())draw();
 }catch(error){if(token===thisToken)message(error.message,true)}
 finally{loadingReviews.delete(key)}
}
async function sendFinal(){
 if(busy||!token)return;
 const list=currentQuiz(),key=currentKey(),answers=selected.get(key)||{};
 if(!list.length||list.some(x=>!Number.isInteger(answers[x.id])))return message("Répondez à toutes les questions.",true);
 if(!confirm("Terminer ce QCM ? Les réponses seront définitives et le corrigé sera affiché."))return;
 busy=true;progress();message("Vérification de vos réponses…");
 try{
  const result=await api("physix_student_submit_chapter_qcm",{
   p_chapter:chapter,p_class:classCode,
   p_answers:list.map(x=>({question_id:x.id,selected_option:answers[x.id]}))
  });
  reviews.set(key,result);
  for(const x of list)x.answered=true;
  message("QCM terminé. Consultez vos erreurs et les bonnes réponses.");
  draw();
 }catch(error){message(error.message,true)}
 finally{busy=false;progress()}
}
async function load(){
 const thisToken=token;
 try{
  const list=await api("physix_student_chapter_qcm",{});
  if(token!==thisToken)return;
  questions=Array.isArray(list)?list:[];draw();
 }catch(error){if(token===thisToken)message(error.message,true)}
}
window.physixStudentQcm={
 render({token:newToken,activeClass}){
  if(!newToken){this.clear();return}
  slot.hidden=false;const changed=newToken!==token;
  token=newToken;classCode=activeClass;
  if(!q("#student-qcm-questions")){
   slot.innerHTML='<section class="student-module"><h3>✅ Questions de cours et exercices d’application</h3>'+
    '<p class="student-help">Pour chaque chapitre, répondez aux questions de cours puis aux exercices d’application. Vous verrez votre correction à la fin.</p>'+
    '<div class="student-ai-controls"><label>Semestre<select id="student-qcm-sem"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></label>'+
    '<label>Chapitre<select id="student-qcm-chapter"></select></label></div>'+
    '<p id="student-qcm-summary" class="student-help"></p>'+
    '<div id="student-qcm-feedback" class="status" role="status" aria-live="polite"></div>'+
    '<div id="student-qcm-questions"></div><div id="student-qcm-final"></div>'+
    '<p class="student-help">Cette évaluation est formative : elle ne modifie pas automatiquement la Note d’activité /20.</p></section>';
   q("#student-qcm-sem").onchange=e=>{semester=Number(e.target.value);chapter="";draw()};
   q("#student-qcm-chapter").onchange=e=>{chapter=e.target.value;draw()};
  }
  if(changed){questions=[];selected.clear();reviews.clear();load()}else draw();
 },
 clear(){token="";questions=[];selected.clear();reviews.clear();loadingReviews.clear();slot.hidden=true;slot.replaceChildren()}
};
})();