/* PhysiX — teacher-only review of privately stored handwritten work. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.physixAiRemisesTeacher=(root,{rows,session,rest})=>{
 const section=document.createElement("section");section.className="content-section ai-remises";
 const classes=(rows.classes||[]).filter(c=>c.active);
 section.innerHTML='<h3>📷 Copies des élèves — validation</h3>'+
 '<p>Vérifiez les photos avant de compter l’exercice dans le Suivi. Une copie rejetée ne donne aucun crédit. La note d’activité /20 reste saisie manuellement.</p>'+
 '<div class="ai-toolbar"><label>Classe<select id="copies-class">'+
 classes.map(c=>'<option value="'+esc(c.code)+'">'+esc(c.code)+'</option>').join("")+'</select></label>'+
 '<label>État<select id="copies-filter"><option value="pending">À valider</option>'+
 '<option value="accepted">Validées</option><option value="rejected">Refusées</option>'+
 '<option value="all">Toutes</option></select></label></div>'+
 '<div id="copies-status" class="content-note" role="status"></div><div id="copies-list"></div>';
 root.append(section);
 const q=s=>section.querySelector(s);
 const message=(text,error=false)=>{q("#copies-status").textContent=text;q("#copies-status").classList.toggle("bad",error)};
 let classCode=classes[0]?.code||"",state="pending",copies=[],pupils=[],exercises=[],busy=false;
 const pictures=new Map();
 const clear=()=>{for(const url of pictures.values())URL.revokeObjectURL(url);pictures.clear()};
 async function load(){
  clear();message("Chargement des copies privées…");
  try{
   const [e,p,s]=await Promise.all([
    rest("ai_exercises","?select=id,title,class_code,semester&class_code=eq."+encodeURIComponent(classCode)+"&limit=300"),
    rest("pupils","?select=id,full_name&class_code=eq."+encodeURIComponent(classCode)+"&limit=500"),
    rest("ai_submissions","?select=id,owner_id,exercise_id,pupil_id,mime_type,review_status,teacher_feedback,created_at&order=created_at.desc&limit=1000")
   ]);
   exercises=e;pupils=p;const ids=new Set(exercises.map(x=>x.id));
   copies=s.filter(x=>ids.has(x.exercise_id));draw();
   message(copies.length+" copie(s) trouvée(s).");
  }catch(err){message(err.message,true)}
 }
 function draw(){
  const available=copies.filter(x=>state==="all"||x.review_status===state);
  q("#copies-list").innerHTML=available.length?available.map(x=>{
   const pupil=pupils.find(p=>p.id===x.pupil_id),exercise=exercises.find(e=>e.id===x.exercise_id);
   return '<article class="ai-exercise"><div><strong>'+esc(pupil?.full_name||"Élève")+'</strong>'+
    '<small>'+esc(exercise?.title||"Exercice")+' · '+new Date(x.created_at).toLocaleDateString("fr-FR")+
    ' · '+esc(x.review_status)+'</small>'+
    '<div class="copy-preview" data-preview="'+esc(x.id)+'">Photo non ouverte</div>'+
    '<button type="button" data-open-copy="'+esc(x.id)+'">Voir la photo privée</button>'+
    (x.teacher_feedback?'<p>'+esc(x.teacher_feedback)+'</p>':"")+'</div>'+
    (x.review_status==="pending"?'<div class="ai-actions">'+
     '<button data-review="'+esc(x.id)+'" data-accept="true">✅ Valider (+1 exercice)</button>'+
     '<button data-review="'+esc(x.id)+'" data-accept="false" class="danger">Refuser</button></div>':"")+'</article>';
  }).join(""):'<p>Aucune copie pour ce filtre.</p>';
  q("#copies-list").querySelectorAll("[data-open-copy]").forEach(b=>b.onclick=()=>openPhoto(b));
  q("#copies-list").querySelectorAll("[data-review]").forEach(b=>b.onclick=()=>review(b));
 }
 async function openPhoto(b){
  const id=b.dataset.openCopy;if(!copies.some(c=>c.id===id))return;
  const box=q('[data-preview="'+id+'"]');if(!box)return;
  if(pictures.has(id)){box.innerHTML='<img alt="Copie privée de l’élève" src="'+esc(pictures.get(id))+'">';return}
  b.disabled=true;
  try{
   const response=await fetch(BASE+"/functions/v1/physix-ai-submission?id="+encodeURIComponent(id),{
    headers:{apikey:KEY,Authorization:"Bearer "+session.token},cache:"no-store",referrerPolicy:"no-referrer"});
   if(!response.ok)throw Error("Photo inaccessible ("+response.status+").");
   const blob=await response.blob();
   if(blob.size>5242880||!["image/jpeg","image/png","image/webp"].includes(blob.type))
    throw Error("Format de photo non reconnu.");
   const url=URL.createObjectURL(blob);pictures.set(id,url);
   box.innerHTML='<img alt="Copie privée de l’élève" src="'+esc(url)+'">';
  }catch(e){message(e.message,true)}
  finally{b.disabled=false}
 }
 async function review(b){
  if(busy)return;
  const id=b.dataset.review,accepted=b.dataset.accept==="true";
  if(!copies.some(x=>x.id===id))return;
  const feedback=accepted?"":prompt("Motif du refus, visible seulement par cet élève (400 caractères max.) :","");
  if(feedback===null||(!accepted&&!feedback.trim()))return;
  if(!confirm(accepted?"Valider cette copie et compter +1 exercice dans Suivi ?":"Refuser cette copie sans crédit ?"))return;
  busy=true;b.disabled=true;
  try{
   const response=await fetch(BASE+"/rest/v1/rpc/physix_ai_review_submission",{
    method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.token,"Content-Type":"application/json"},
    body:JSON.stringify({p_submission:id,p_accepted:accepted,p_feedback:feedback.trim().slice(0,400)}),
    cache:"no-store",referrerPolicy:"no-referrer"});
   if(!response.ok){const error=await response.json().catch(()=>({}));
    throw Error(error.message||"La validation a échoué.")}
   message(accepted?"Copie validée : un exercice compté dans Suivi.":"Copie refusée : aucun exercice compté.");
   await load();
  }catch(e){message(e.message,true)}
  finally{busy=false;b.disabled=false}
 }
 q("#copies-class").onchange=e=>{classCode=e.target.value;load()};
 q("#copies-filter").onchange=e=>{state=e.target.value;draw()};
 const observer=new MutationObserver(()=>{if(!root.contains(section)||!root.isConnected){clear();observer.disconnect()}});
 observer.observe(root,{childList:true});
 load();
};
})();