/* Teacher: compose physics and chemistry exercises. Full correction remains owner-only. */
(()=>{
"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
window.physixAiTeacherRender=(root,{rows,session,rest})=>{
 const el=document.createElement("section");el.className="content-section ai-teacher";
 const classes=(rows.classes||[]).filter(c=>c.active);
 el.innerHTML='<div class="ai-head"><h3>🤖 Assistant IA — Exercices corrigés</h3><p>'+
 'Saisissez l’énoncé et votre correction de référence. La correction intégrale est privée et n’est jamais téléchargée par l’élève. L’IA guide, explique, et compare une proposition de réponse avec votre corrigé sans attribuer une note officielle.</p></div>'+
 '<div class="ai-toolbar"><label>Classe<select id="ai-class">'+classes.map(c=>
 '<option value="'+esc(c.code)+'">'+esc(c.code)+'</option>').join("")+'</select></label>'+
 '<label>Semestre<select id="ai-sem"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></label></div>'+
 '<div class="content-note" id="ai-status" role="status" aria-live="polite"></div>'+
 '<details open class="ai-editor"><summary>➕ Nouvel exercice</summary>'+
 '<form id="ai-form"><label>Titre<input name="title" minlength="3" maxlength="160" required placeholder="Circuit RC — charge du condensateur"></label>'+
 '<label>Matière<select name="subject"><option>Physique</option><option>Chimie</option></select></label>'+
 '<label>Chapitre<input name="chapter" maxlength="160" placeholder="Ondes, électricité, chimie…"></label>'+
 '<label>Énoncé complet<textarea name="statement" minlength="20" maxlength="12000" rows="7" required placeholder="Écrivez ici le texte de l’énoncé et les données numériques, unités et questions."></textarea></label>'+
 '<label>Votre corrigé de référence — privé<textarea name="teacher_correction" minlength="10" maxlength="12000" rows="9" required placeholder="Décrivez le raisonnement, les équations, les valeurs numériques, les unités et les étapes attendues."></textarea></label>'+
 '<label>Indications pédagogiques facultatives<textarea name="teacher_guidance" maxlength="1200" rows="2" placeholder="Erreurs fréquentes, méthodes souhaitées…"></textarea></label>'+
 '<button type="submit">Enregistrer comme brouillon privé</button></form>'+
 '<p class="ai-help">Les PDF ne sont pas extraits automatiquement dans cette première version : copiez l’énoncé et le corrigé en texte pour une comparaison fiable.</p></details>'+
 '<h4>Exercices de la classe</h4><div id="ai-list"></div>';
 root.append(el);
 const q=s=>el.querySelector(s),notice=(text,bad=false)=>{q("#ai-status").textContent=text;q("#ai-status").classList.toggle("bad",bad)};
 let classCode=classes[0]?.code||"",semester=1,list=[],busy=false;
 async function load(){
  if(!classCode){notice("Ajoutez une classe pour commencer.");return}
  try{
   list=await rest("ai_exercises","?select=*&class_code=eq."+encodeURIComponent(classCode)+"&semester=eq."+semester+"&order=created_at.desc&limit=200");
   draw();notice(list.length+" exercice(s) dans cette classe et ce semestre.");
  }catch(e){notice(e.message,true)}
 }
 function draw(){
  q("#ai-list").innerHTML=list.length?list.map(x=>'<article class="ai-exercise">'+
  '<div><strong>'+esc(x.title)+'</strong><small>'+esc(x.subject)+' · '+esc(x.chapter||"Sans chapitre")+
  ' · '+(x.published?"✅ Accessible aux élèves":"🔒 Brouillon")+'</small>'+
  '<details><summary>Voir l’énoncé et le corrigé privé</summary><p>'+esc(x.statement)+'</p>'+
  '<h5>Corrigé professeur</h5><p>'+esc(x.teacher_correction)+'</p></details></div>'+
  '<div class="ai-actions"><button type="button" data-publish="'+esc(x.id)+'">'+(x.published?"Masquer":"Publier")+'</button>'+
  '<button type="button" data-delete="'+esc(x.id)+'" class="danger">Supprimer</button></div></article>').join(""):
  '<p class="ai-help">Aucun exercice. Ajoutez le premier énoncé et son corrigé.</p>';
  q("#ai-list").querySelectorAll("[data-publish]").forEach(b=>b.onclick=()=>toggle(b));
  q("#ai-list").querySelectorAll("[data-delete]").forEach(b=>b.onclick=()=>remove(b));
 }
 async function run(button,fn){
  if(busy)return;busy=true;button.disabled=true;
  try{await fn();await load()}catch(e){notice(e.message,true)}
  finally{busy=false;button.disabled=false}
 }
 function toggle(b){
  const x=list.find(x=>x.id===b.dataset.publish);if(!x)return;
  const next=!x.published;
  if(!confirm(next?"Publier cet exercice aux élèves de "+classCode+" ? Le corrigé restera privé.":"Masquer cet exercice ?"))return;
  run(b,async()=>{
   const answer=await rest("ai_exercises","?id=eq."+encodeURIComponent(x.id),"PATCH",{published:next});
   if(!Array.isArray(answer)||answer.length!==1)throw Error("Publication non confirmée.");
  });
 }
 function remove(b){
  if(!confirm("Supprimer cet exercice et les tentatives associées ?"))return;
  run(b,async()=>{
   const answer=await rest("ai_exercises","?id=eq."+encodeURIComponent(b.dataset.delete),"DELETE");
   if(!Array.isArray(answer)||answer.length!==1)throw Error("Suppression non confirmée.");
  });
 }
 q("#ai-form").addEventListener("submit",e=>{
  e.preventDefault();
  const f=e.currentTarget,v=Object.fromEntries(new FormData(f).entries()),button=f.querySelector("button[type=submit]");
  run(button,async()=>{
   const result=await rest("ai_exercises","","POST",{owner_id:session.ownerId,
     class_code:classCode,semester,subject:v.subject,title:v.title.trim(),chapter:v.chapter.trim(),
     statement:v.statement.trim(),teacher_correction:v.teacher_correction.trim(),
     teacher_guidance:v.teacher_guidance.trim(),published:false});
   if(!Array.isArray(result)||result.length!==1)throw Error("Enregistrement non confirmé.");
   f.reset();notice("Exercice enregistré en brouillon privé.");
  });
 });
 q("#ai-class").addEventListener("change",e=>{classCode=e.target.value;load()});
 q("#ai-sem").addEventListener("change",e=>{semester=Number(e.target.value);load()});
 load();
};
})();