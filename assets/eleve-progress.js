/* Student-only presentation. All data comes from server-filtered, email-confirmed Supabase RPCs. */
(()=>{
"use strict";
let semester=1,activeTab="progress";
const tabs=[["progress","📊 Mon suivi"],["work","📘 Travail à faire"],["announcements","📢 Annonces"],["goals","🎯 Mes objectifs"]];
const count=n=>Number(n||0).toLocaleString("fr-FR");
window.physixStudentExtras={render({profiles,board,activeClass,escape:esc}){
 const root=document.getElementById("student-extras");if(!root)return;
 const profile=profiles.find(p=>p.class_code===activeClass);
 const classData=board.find(b=>b.class_code===activeClass)||{work:[],announcements:[]};
 const summary=profile?.semesters?.find(s=>s.semester===semester)||{};
 const work=(classData.work||[]).filter(w=>w.semester===semester);
 const announcements=classData.announcements||[];
 const objectives=(profile?.objectives||[]).filter(g=>g.semester===semester);
 const stat=(label,value,icon)=>'<article class="student-stat"><span>'+icon+'</span><strong>'+count(value)+'</strong><small>'+esc(label)+'</small></article>';
 const name=profile?.full_name||"Élève";
 const list=(items,markup,empty)=>items.length?items.map(markup).join(""):'<p class="student-empty">'+esc(empty)+'</p>';
 root.innerHTML='<section class="student-module"><div class="student-module-head"><div>'+
  '<h3>Mon espace pédagogique</h3><p>'+esc(name)+' · '+esc(activeClass||"Classe non attribuée")+
  '</p></div><label>Semestre<select id="student-sem"><option value="1"'+(semester===1?" selected":"")+
  '>Semestre 1</option><option value="2"'+(semester===2?" selected":"")+
  '>Semestre 2</option></select></label></div>'+
  '<div class="student-subtabs">'+tabs.map(([id,label])=>'<button type="button" class="'+(activeTab===id?"active":"")+
  '" data-student-tab="'+id+'" aria-pressed="'+(activeTab===id)+'">'+label+'</button>').join("")+'</div>'+
  '<div id="student-extra-body"></div></section>';
 const body=root.querySelector("#student-extra-body");
 if(activeTab==="progress"){
  body.innerHTML=profile?
   '<p class="student-help">Ces compteurs montrent les activités enregistrées par votre professeur. Ils ne constituent pas une note ou un pourcentage de réussite.</p>'+
   '<div class="student-stats">'+stat("Participations",summary.participation,"🙋")+stat("Exercices réalisés",summary.exercises,"✍️")+
   stat("Devoirs faits",summary.homework,"📘")+stat("Exposés",summary.exposes,"🎤")+
   stat("Effort / progrès",summary.efforts,"⭐")+'</div>'+
   '<p class="student-help"><strong>Mon bilan pédagogique :</strong> Continuez votre progression. Les observations personnelles et l’évaluation chiffrée restent réservées à votre professeur.</p>':
   '<div class="student-empty">Votre professeur doit encore associer ce compte à votre fiche de suivi. Les cours et annonces autorisés restent accessibles.</div>';
 }else if(activeTab==="work"){
  body.innerHTML=list(work,w=>'<article class="student-task"><div><strong>'+esc(w.title)+'</strong>'+
    (w.instructions?'<p>'+esc(w.instructions)+'</p>':"")+
    '<small>'+(w.due_on?"À rendre pour le "+new Date(w.due_on+"T12:00:00").toLocaleDateString("fr-FR"):"Date non précisée")+
    '</small></div></article>',"Aucun travail publié pour ce semestre.");
 }else if(activeTab==="announcements"){
  body.innerHTML=list(announcements,n=>'<article class="student-task"><strong>'+esc(n.title)+
    '</strong><p>'+esc(n.message)+'</p></article>',"Aucune annonce publiée pour votre classe.");
 }else{
  body.innerHTML=profile?list(objectives,g=>'<article class="student-task"><strong>'+
    esc(g.title)+'</strong><small>'+(g.status==="achieved"?"✅ Objectif atteint":"🎯 En cours")+
    '</small></article>',"Aucun objectif personnel n’a encore été partagé par votre professeur."):
    '<div class="student-empty">Vos objectifs apparaîtront lorsque le professeur associera ce compte à votre fiche de suivi.</div>';
 }
 root.querySelectorAll("[data-student-tab]").forEach(b=>b.addEventListener("click",()=>{
  activeTab=b.dataset.studentTab;window.physixStudentExtras.render({profiles,board,activeClass,escape:esc});
 }));
 root.querySelector("#student-sem").addEventListener("change",e=>{
  semester=Number(e.target.value);window.physixStudentExtras.render({profiles,board,activeClass,escape:esc});
 });
}};
})();