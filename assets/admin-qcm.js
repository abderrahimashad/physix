/* Private teacher chapter-QCM editor. The correct answer is only in owner RLS tables. */
(()=>{
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
window.physixQcmGenerateFromPdf=async({file,chapterId,classCode,session,onStatus})=>{
 if(!file||file.size>12*1024*1024)throw Error("QCM automatique : PDF de cours de 12 Mo maximum.");
 if(file.size<200)throw Error("Le PDF est trop petit pour générer un QCM.");
 onStatus?.("🤖 Gemini prépare 15 questions de cours et 4 exercices d’application à partir de votre PDF…");
 const form=new FormData();
 form.append("pdf",file,file.name);
 form.append("chapter_id",chapterId);
 form.append("class_code",classCode);
 const ctrl=new AbortController(),timeout=setTimeout(()=>ctrl.abort(),75000);
 try{
  const response=await fetch(BASE+"/functions/v1/physix-qcm-gemini",{
   method:"POST",headers:{apikey:KEY,Authorization:"Bearer "+session.token},
   body:form,signal:ctrl.signal,cache:"no-store",referrerPolicy:"no-referrer"});
  const result=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(result.message||"Gemini ne peut pas générer le QCM pour le moment.");
  return result;
 }finally{clearTimeout(timeout)}
};
window.physixTeacherQcm=(root,{rows,session,rest})=>{
 const classes=(rows.classes||[]).filter(c=>c.active),chapters=rows.chapters||[];
 const pane=document.createElement("section");pane.className="content-section px-qcm-admin";
 pane.innerHTML='<h3>✅ QCM — Questions de cours par chapitre</h3>'+
 '<p>Lors de l’ajout d’un PDF de cours, Gemini propose automatiquement 15 questions de cours et 4 exercices d’application. Relisez les 19 réponses avant publication. Les élèves voient tout le corrigé uniquement à la fin du QCM.</p>'+
 '<div class="px-qcm-controls"><label>Classe<select id="qcm-class">'+classes.map(c=>
 '<option value="'+esc(c.code)+'">'+esc(c.code)+'</option>').join("")+'</select></label>'+
 '<label>Semestre<select id="qcm-sem"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></label>'+
 '<label>Chapitre<select id="qcm-chapter"></select></label></div>'+
 '<div id="qcm-owner-notice" class="content-note" role="status"></div>'+
 '<details open class="px-qcm-form-wrap"><summary>➕ Ajouter une question de cours</summary>'+
 '<form id="qcm-owner-form"><label>Question<textarea name="question" required minlength="10" maxlength="1000" rows="3" placeholder="Quelle est l’unité SI de la capacité d’un condensateur ?"></textarea></label>'+
 ['A','B','C','D'].map(k=>'<label>Réponse '+k+'<input name="option_'+k.toLowerCase()+'" minlength="1" maxlength="400" required placeholder="Proposition '+k+'"></label>').join("")+
 '<label>Bonne réponse<select name="correct_option">'+['A','B','C','D'].map((k,i)=>'<option value="'+i+'">'+k+'</option>').join("")+'</select></label>'+
 '<label>Explication après réponse<textarea name="explanation" maxlength="1500" rows="3" placeholder="Expliquez pourquoi ce choix est correct."></textarea></label>'+
 '<button type="submit">Enregistrer comme brouillon</button></form></details>'+
 '<div class="px-qcm-bulk"><button type="button" id="qcm-owner-publish-all">✅ Publier les 19 questions validées</button><button type="button" id="qcm-owner-refresh">Actualiser les questions</button></div><h4>Questions de ce chapitre</h4><div id="qcm-owner-list"></div>'+
 '<h4>Participation aux QCM</h4><div id="qcm-owner-stats"></div>';
 root.append(pane);
 const q=s=>pane.querySelector(s);
 let classCode=classes[0]?.code||"",semester=1,chapterId="",questions=[],attempts=[],busy=false;
 const feedback=(message,bad=false)=>{q("#qcm-owner-notice").textContent=message;q("#qcm-owner-notice").classList.toggle("bad",bad)};
 function chaptersFor(){return chapters.filter(c=>c.semester===semester&&(c.state==="published"||c.state==="draft"))}
 function pickChapter(){
  const available=chaptersFor();
  q("#qcm-chapter").innerHTML=available.map(c=>'<option value="'+esc(c.id)+'">'+esc(c.subject+" · "+c.title)+
   (c.state==="published"?"":" (brouillon)")+'</option>').join("");
  if(!available.some(c=>c.id===chapterId))chapterId=available[0]?.id||"";
  q("#qcm-chapter").value=chapterId;
  q("#qcm-owner-form").querySelector('button[type="submit"]').disabled=!chapterId;
 }
 async function load(){
  pickChapter();
  if(!classCode||!chapterId){questions=[];attempts=[];draw();feedback("Créez une classe et un chapitre avant d’ajouter des questions.");return}
  try{
   [questions,attempts]=await Promise.all([
    rest("chapter_qcm","?select=*&class_code=eq."+encodeURIComponent(classCode)+
     "&chapter_id=eq."+encodeURIComponent(chapterId)+"&order=created_at.asc&limit=400"),
    rest("chapter_qcm_attempts","?select=question_id,is_correct&limit=3000")
   ]);
   draw();feedback(questions.length+" question(s) pour ce chapitre.");
  }catch(e){questions=[];attempts=[];draw();feedback(e.message,true)}
 }
 function draw(){
  q("#qcm-owner-list").innerHTML=questions.length?questions.map((x,i)=>
   '<article class="px-qcm-owner-item"><div><strong>'+(i+1)+'. '+esc(x.question)+'</strong>'+
   '<small>'+esc(x.published?"✅ Publiée":"🔒 Brouillon")+' · '+(x.question_type==="application"?"Exercice d’application":"Question de cours")+' · Bonne réponse : '+("ABCD"[x.correct_option])+'</small>'+
   '<ol type="A">'+[x.option_a,x.option_b,x.option_c,x.option_d].map(t=>'<li>'+esc(t)+'</li>').join("")+'</ol>'+
   (x.explanation?'<p>'+esc(x.explanation)+'</p>':"")+'</div><div class="px-qcm-actions">'+
   '<button type="button" data-publish="'+esc(x.id)+'">'+(x.published?"Masquer":"Publier")+'</button>'+
   '<button type="button" data-edit="'+esc(x.id)+'">Modifier</button>'+ '<button type="button" data-delete="'+esc(x.id)+'">Supprimer</button></div></article>').join(""):
   '<p>Aucune question pour ce chapitre.</p>';
  q("#qcm-owner-stats").innerHTML=questions.length?'<div class="px-qcm-stats">'+
   '<table><thead><tr><th>Question</th><th>Réponses</th><th>Correctes</th></tr></thead><tbody>'+
   questions.map(x=>{const a=attempts.filter(a=>a.question_id===x.id);
    return '<tr><td>'+esc(x.question)+'</td><td>'+a.length+'</td><td>'+a.filter(v=>v.is_correct).length+'</td></tr>';
   }).join("")+'</tbody></table></div>':
   '<p>Les réponses des élèves apparaîtront ici après publication.</p>';
  q("#qcm-owner-list").querySelectorAll("[data-publish]").forEach(b=>b.onclick=()=>toggle(b));
  q("#qcm-owner-list").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>remove(b));
  q("#qcm-owner-list").querySelectorAll("[data-edit]").forEach(b=>b.onclick=()=>edit(b));
 }
 async function operation(button,action){
  if(busy)return;busy=true;button.disabled=true;
  try{await action();await load()}catch(e){feedback(e.message,true)}
  finally{busy=false;button.disabled=false}
 }
 function toggle(b){
  const x=questions.find(x=>x.id===b.dataset.publish);if(!x)return;
  if(!confirm(x.published?"Masquer cette question ?":"Publier cette question pour cette classe ?"))return;
  operation(b,async()=>{
   const a=await rest("chapter_qcm","?id=eq."+encodeURIComponent(x.id),"PATCH",{published:!x.published});
   if(!Array.isArray(a)||a.length!==1)throw Error("Publication non confirmée.");
  });
 }
 async function publishAll(){
  const available=questions.filter(x=>!x.published);
  if(questions.length!==19)return feedback("Pour publier le QCM automatique, il faut exactement 19 questions : 15 cours et 4 applications.",true);
  if(questions.filter(x=>x.question_type==="cours").length!==15||
    questions.filter(x=>x.question_type==="application").length!==4)
   return feedback("Le QCM doit contenir 15 questions de cours et 4 applications.",true);
  if(!confirm("Confirmer que vous avez vérifié les 19 réponses ? Publier le QCM complet et son chapitre pour les élèves de "+classCode+" ?"))return;
  const b=q("#qcm-owner-publish-all");
  operation(b,async()=>{
   const chapter=chapters.find(c=>c.id===chapterId);
   if(chapter?.state!=="published"){
    await rest("chapters","?id=eq."+encodeURIComponent(chapterId),"PATCH",{state:"published"});
    chapter.state="published";
   }
   if(available.length){
    const published=await rest("chapter_qcm","?chapter_id=eq."+encodeURIComponent(chapterId)+
     "&class_code=eq."+encodeURIComponent(classCode),"PATCH",{published:true});
    if(!Array.isArray(published)||published.length!==19)throw Error("Publication des questions non confirmée.");
   }
  });
 }
 function edit(b){
  const x=questions.find(x=>x.id===b.dataset.edit);if(!x)return;
  if(!confirm("Modifier cette question ? Vérifiez les 4 propositions et le bon choix."))return;
  const text=prompt("Question :",x.question);if(text===null)return;
  const options=[];
  for(const [i,value] of [x.option_a,x.option_b,x.option_c,x.option_d].entries()){
   const next=prompt("Proposition "+("ABCD"[i])+" :",value);if(next===null)return;options.push(next.trim());
  }
  const correct=prompt("Bonne réponse (A, B, C ou D) :",("ABCD"[x.correct_option]));
  if(correct===null)return;
  const explanation=prompt("Explication du corrigé :",x.explanation);
  if(explanation===null)return;
  const idx="ABCD".indexOf(correct.trim().toUpperCase());
  if(text.trim().length<10||options.some(a=>!a||a.length>400)||
    new Set(options.map(a=>a.toLowerCase())).size!==4||idx<0||
    explanation.length>1500)return feedback("Question ou propositions invalides.",true);
  operation(b,async()=>{
   const result=await rest("chapter_qcm","?id=eq."+encodeURIComponent(x.id),"PATCH",{
    question:text.trim(),option_a:options[0],option_b:options[1],
    option_c:options[2],option_d:options[3],correct_option:idx,explanation:explanation.trim()
   });
   if(!Array.isArray(result)||result.length!==1)throw Error("Modification non confirmée.");
  });
 }
 function remove(b){
  if(!confirm("Supprimer la question et les réponses associées des élèves ?"))return;
  operation(b,async()=>{
   const a=await rest("chapter_qcm","?id=eq."+encodeURIComponent(b.dataset.delete),"DELETE");
   if(!Array.isArray(a)||a.length!==1)throw Error("Suppression non confirmée.");
  });
 }
 q("#qcm-owner-form").addEventListener("submit",e=>{
  e.preventDefault();const form=e.currentTarget,v=Object.fromEntries(new FormData(form).entries()),button=form.querySelector('button[type="submit"]');
  operation(button,async()=>{
   const payload={owner_id:session.ownerId,class_code:classCode,chapter_id:chapterId,semester,
    question:v.question.trim(),option_a:v.option_a.trim(),option_b:v.option_b.trim(),
    option_c:v.option_c.trim(),option_d:v.option_d.trim(),correct_option:Number(v.correct_option),
    explanation:v.explanation.trim(),published:false};
   const x=await rest("chapter_qcm","","POST",payload);
   if(!Array.isArray(x)||x.length!==1)throw Error("Enregistrement non confirmé.");
   form.reset();
  });
 });
 q("#qcm-owner-publish-all").onclick=publishAll;
 q("#qcm-owner-refresh").onclick=load;
 q("#qcm-class").onchange=e=>{classCode=e.target.value;load()};
 q("#qcm-sem").onchange=e=>{semester=Number(e.target.value);chapterId="";load()};
 q("#qcm-chapter").onchange=e=>{chapterId=e.target.value;load()};
 load();
};
})();