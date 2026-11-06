/* PhysiX — upload one private handwritten-solution image for each published exercise. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const el=document.getElementById("student-remises");
if(!el)return;
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let token="",classCode="",exercises=[],submissions=[],busy=false;
const notice=(message,error=false)=>{const target=el.querySelector("#remise-status");if(target){target.textContent=message;target.classList.toggle("error",error)}};
async function fetchStatus(){
 if(!token)return;
 const t=token;
 try{
  const headers={apikey:KEY,Authorization:"Bearer "+t,"Content-Type":"application/json"};
  const [a,b]=await Promise.all([
   fetch(BASE+"/rest/v1/rpc/physix_ai_my_exercises",{method:"POST",headers,body:"{}",cache:"no-store",referrerPolicy:"no-referrer"}),
   fetch(BASE+"/rest/v1/rpc/physix_ai_my_submission_status",{method:"POST",headers,body:"{}",cache:"no-store",referrerPolicy:"no-referrer"})
  ]);
  if(!a.ok||!b.ok)throw Error("Suivi des remises indisponible.");
  if(token!==t)return;
  exercises=await a.json();submissions=await b.json();draw();
 }catch(e){if(token===t)notice(e.message,true)}
}
function draw(){
 const slot=el.querySelector("#remise-list");if(!slot)return;
 const visible=exercises.filter(e=>e.class_code===classCode);
 slot.innerHTML=visible.length?visible.map(x=>{
  const submission=submissions.find(s=>s.exercise_id===x.id);
  const status=submission?.status==="accepted"?"✅ Exercice validé dans mon suivi":
   submission?.status==="rejected"?"⚠️ À revoir avec le professeur":
   submission?"⏳ En attente de validation":"📷 Solution à remettre";
  return '<article class="remise-card"><div><strong>'+esc(x.title)+'</strong><small>'+esc(x.subject)+
   ' · Semestre '+x.semester+' · '+status+'</small>'+
   (submission?.status==="rejected"&&submission.teacher_feedback?'<p>'+esc(submission.teacher_feedback)+'</p>':"")+
   '</div>'+(submission?"":'<form data-exercise="'+esc(x.id)+'"><label>Photo de ma solution'+
   '<input type="file" name="photo" accept="image/jpeg,image/png,image/webp" required></label>'+
   '<button type="submit">Remettre ma solution</button></form>')+'</article>';
 }).join(""):'<p>Aucun exercice publié pour cette classe.</p>';
 slot.querySelectorAll("form[data-exercise]").forEach(form=>form.onsubmit=e=>upload(e,form));
}
async function upload(e,form){
 e.preventDefault();if(busy||!token)return;
 const file=form.elements.photo.files?.[0],valid=["image/jpeg","image/png","image/webp"];
 if(!file||!valid.includes(file.type)||file.size<1024||file.size>5242880)
  return notice("Choisissez une photo JPG, PNG ou WebP de 1 Ko à 5 Mo.",true);
 if(!confirm("Confirmer l’envoi de cette solution ? Une seule remise par exercice est acceptée."))return;
 busy=true;const b=form.querySelector("button");b.disabled=true;
 try{
  const response=await fetch(BASE+"/functions/v1/physix-ai-submission",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+token,
    "Content-Type":file.type,"x-physix-exercise-id":form.dataset.exercise},
   body:file,cache:"no-store",referrerPolicy:"no-referrer"});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.message||"La copie n’a pas été envoyée.");
  notice("Photo reçue. L’exercice sera compté après validation par le professeur.");
  await fetchStatus();
 }catch(error){notice(error.message,true)}
 finally{busy=false;b.disabled=false}
}
window.physixStudentRemises={
 render({token:nextToken,activeClass}){
  if(!nextToken){this.clear();return}
  el.hidden=false;const changed=token!==nextToken;
  token=nextToken;classCode=activeClass;
  if(!el.querySelector("#remise-list")){
   el.innerHTML='<section class="student-module"><h3>📷 Remettre mes exercices</h3>'+
    '<p class="student-help">Prenez une photo nette et lisible de votre propre solution. Une seule copie par exercice. Une photo exactement identique déjà envoyée pour le même exercice sera refusée. La validation du professeur ajoutera un exercice à votre Suivi, sans modifier votre note d’activité /20.</p>'+
    '<div id="remise-status" class="status" role="status"></div>'+
    '<div id="remise-list"></div></section>';
  }
  if(changed){exercises=[];submissions=[];fetchStatus()}else draw();
 },
 clear(){token="";exercises=[];submissions=[];el.hidden=true;el.replaceChildren()}
};
})();