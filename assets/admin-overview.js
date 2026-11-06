/* PhysiX — tableau de bord et trombinoscope strictement réservés à l'enseignant.
   Utilise seulement les tables RLS du propriétaire et le stockage privé des portraits. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const makeCount=n=>Number(n||0).toLocaleString("fr-FR");
const CATEGORY=[
 ["participation","Participations","🙋"],
 ["exercise","Exercices réalisés","✍️"],
 ["homework","Devoirs faits","📘"],
 ["expose","Exposés","🎤"],
 ["positive","Effort / progrès","⭐"],
 ["absence","Absences","🚫"],
 ["late","Retards","🕒"]
];
window.physixOwnerOverview=(root,{rows,session,rest,view="dashboard"})=>{
 const section=document.createElement("section");
 section.className="content-section px-overview";
 const allClasses=(rows.classes||[]).filter(c=>c.active);
 section.innerHTML='<div class="px-overview-title"><div><h3>'+
  (view==="portraits"?"📸 Trombinoscope":"📊 Tableau de bord")+'</h3><p>'+
  (view==="portraits"?"Photos privées et noms des élèves, visibles uniquement par leur professeur.":
   "Bilan des activités enregistrées par classe et semestre. La note d’activité /20 reste privée et n’entre dans aucun calcul automatique.")+
  '</p></div><button type="button" id="overview-reload">Actualiser</button></div>'+
  '<div class="px-overview-toolbar"><label>Classe<select id="overview-class">'+
  '<option value="">Toutes les classes</option>'+
  allClasses.map(c=>'<option value="'+esc(c.code)+'">'+esc(c.code)+'</option>').join("")+
  '</select></label><label>Semestre<select id="overview-sem"><option value="1">Semestre 1</option>'+
  '<option value="2">Semestre 2</option></select></label>'+
  (view==="portraits"?'<label>Rechercher<input type="search" id="overview-search" placeholder="Nom de l’élève"></label>':
  '<label>Affichage<select id="overview-sort"><option value="class">Par classe</option>'+
  '<option value="name">Par élève</option></select></label>')+
  '</div><div id="overview-feedback" class="content-note" role="status" aria-live="polite"></div>'+
  '<div id="overview-body"></div>';
 root.append(section);
 const q=x=>section.querySelector(x);
 let pupils=[],events=[],profiles=[],work=[],currentClass="",semester=1,loaded=false,waiting=false,disposed=false;
 const photos=new Map(),revokePhotos=()=>{for(const objectUrl of photos.values())URL.revokeObjectURL(objectUrl);photos.clear()};
 const status=(m,bad=false)=>{const e=q("#overview-feedback");if(!e)return;e.textContent=m;e.classList.toggle("bad",bad)};
 const counts=(id,kind)=>events.filter(x=>x.pupil_id===id&&x.kind===kind).length;
 const sum=kind=>events.filter(x=>x.kind===kind).length;
 const relevant=()=>pupils.filter(p=>p.active&&(!currentClass||p.class_code===currentClass));
 function countCard(title,count,icon){return '<article class="px-overview-metric"><span>'+icon+'</span>'+
  '<strong>'+makeCount(count)+'</strong><small>'+esc(title)+'</small></article>'}
 function drawDashboard(){
  const selected=relevant(),ids=new Set(selected.map(p=>p.id));
  const filtered=events.filter(e=>ids.has(e.pupil_id));
  const selectedWork=work.filter(w=>w.semester===semester&&(!currentClass||w.class_code===currentClass));
  q("#overview-body").innerHTML='<div class="px-overview-stats">'+countCard("Élèves",selected.length,"👥")+
   countCard("Participations",filtered.filter(e=>e.kind==="participation").length,"🙋")+
   countCard("Exercices",filtered.filter(e=>e.kind==="exercise").length,"✍️")+
   countCard("Devoirs faits (observations)",filtered.filter(e=>e.kind==="homework").length,"📘")+
   countCard("Absences",filtered.filter(e=>e.kind==="absence").length,"🚫")+
   countCard("Travaux publiés",selectedWork.filter(w=>w.published).length,"📢")+'</div>'+
   '<h4>Bilan par classe</h4><div class="px-overview-table-wrap"><table><thead><tr>'+
   '<th>Classe</th><th>Élèves</th><th>Participation</th><th>Exercices</th><th>Devoirs faits</th><th>Absences</th><th>Retards</th></tr></thead><tbody>'+
   allClasses.filter(c=>!currentClass||c.code===currentClass).map(c=>{
    const local=selected.filter(p=>p.class_code===c.code),index=new Set(local.map(p=>p.id));
    const ev=filtered.filter(x=>index.has(x.pupil_id));
    const n=k=>ev.filter(x=>x.kind===k).length;
    return '<tr><th>'+esc(c.code)+'</th><td>'+local.length+'</td><td>'+n("participation")+
     '</td><td>'+n("exercise")+'</td><td>'+n("homework")+'</td><td>'+n("absence")+
     '</td><td>'+n("late")+'</td></tr>';
   }).join("")+'</tbody></table></div>'+
   '<h4>Activités individuelles</h4>'+
   '<div class="px-overview-table-wrap"><table><thead><tr>'+
   '<th>Élève</th><th>Classe</th><th>Participation</th><th>Exercices</th><th>Devoirs faits</th>'+
   '<th>Exposés</th><th>Efforts</th><th>Absences</th><th>Retards</th></tr></thead><tbody>'+
   selected.slice().sort((a,b)=>q("#overview-sort").value==="class"?
    a.class_code.localeCompare(b.class_code)||a.full_name.localeCompare(b.full_name):
    a.full_name.localeCompare(b.full_name)).map(p=>'<tr><td>'+esc(p.full_name)+'</td><td>'+esc(p.class_code)+
   '</td>'+CATEGORY.map(c=>'<td>'+counts(p.id,c[0])+'</td>').join("")+'</tr>').join("")+
   '</tbody></table></div>'+
   '<p class="px-overview-hint">Les chiffres correspondent aux observations enregistrées, pas à une notation ni au taux de réussite. Aucun résultat individuel n’est public.</p>';
 }
 function drawPortraits(){
  const search=(q("#overview-search")?.value||"").trim().toLocaleLowerCase("fr");
  const selected=relevant().filter(p=>p.full_name.toLocaleLowerCase("fr").includes(search));
  q("#overview-body").innerHTML='<div class="px-portrait-summary">'+
   '<strong>'+selected.length+' élève(s)</strong><span> · '+selected.filter(p=>photos.has(p.id)).length+
   ' photo(s) disponibles</span></div>'+
   '<div class="px-portrait-grid">'+(selected.map(p=>{
    const profile=profiles.find(x=>x.pupil_id===p.id);
    return '<article class="px-portrait-card"><div class="px-portrait-image">'+
     (photos.has(p.id)?'<img src="'+esc(photos.get(p.id))+'" alt="Photo de '+esc(p.full_name)+'">':
     '<span aria-hidden="true">👤</span>')+'</div>'+
     '<strong>'+esc(p.full_name)+'</strong><small>'+esc(p.class_code)+'</small>'+
     '<span class="px-portrait-label">'+(profile?.avatar_path?"Photo enregistrée":"En attente de photo")+
     '</span></article>';
   }).join("")||'<p class="px-overview-hint">Aucun élève ne correspond à cette recherche.</p>')+'</div>';
 }
 function draw(){if(!loaded||disposed)return;if(view==="portraits")drawPortraits();else drawDashboard()}
 async function loadPortrait(p){
  if(disposed||!p.avatar_path||photos.has(p.pupil_id))return;
  try{
   const name=p.avatar_path.split("/").map(encodeURIComponent).join("/");
   const response=await fetch(BASE+"/storage/v1/object/authenticated/physix-avatars/"+name,{
    headers:{apikey:KEY,Authorization:"Bearer "+session.token},cache:"no-store",referrerPolicy:"no-referrer"});
   if(!response.ok||disposed)return;
   const blob=await response.blob();
   if(disposed||blob.size>2097152||!["image/jpeg","image/png","image/webp"].includes(blob.type))return;
   photos.set(p.pupil_id,URL.createObjectURL(blob));
  }catch{/* Private portrait absent or inaccessible. */}
 }
 async function pages(table,query,max=10000){
  const pageSize=500,output=[];
  for(let offset=0;offset<max;offset+=pageSize){
   const separator=query.includes("?")?"&":"?";
   const page=await rest(table,query+separator+"limit="+pageSize+"&offset="+offset);
   if(!Array.isArray(page))throw Error("Réponse non conforme du serveur.");
   output.push(...page);
   if(page.length<pageSize)break;
  }
  return output;
 }
 async function load(){
  if(waiting||disposed)return;
  waiting=true;loaded=false;status("Chargement des données privées du professeur…");
  try{
   const [p,e,w,pr]=await Promise.all([
    pages("pupils","?select=id,owner_id,class_code,full_name,active&order=class_code.asc,full_name.asc",5000),
    pages("activity_events","?select=id,pupil_id,class_code,kind,semester&semester=eq."+semester+"&order=id.asc",10000),
    pages("class_work","?select=id,class_code,semester,published&order=id.asc",1000),
    view==="portraits"?pages("student_profiles","?select=pupil_id,avatar_path&order=pupil_id.asc",5000):Promise.resolve([])
   ]);
   if(disposed)return;
   pupils=p;events=e;work=w;profiles=pr;loaded=true;
   revokePhotos();
   if(view==="portraits"){
    // Bound concurrent private downloads to avoid flooding the storage API.
    const toFetch=profiles.filter(x=>x.avatar_path);
    for(let i=0;i<toFetch.length&&!disposed;i+=5){
     await Promise.all(toFetch.slice(i,i+5).map(loadPortrait));
    }
   }
   if(disposed)return;
   draw();
   status("Données privées chargées. "+pupils.length+" élève(s)."+
    (events.length===10000?" ⚠ Maximum 10 000 observations : bilan partiel.":"")+
    (pupils.length===5000?" ⚠ Liste limitée à 5 000 élèves.":""));
  }catch(error){status("Erreur : "+error.message,true)}
  finally{waiting=false}
 }
 q("#overview-class").addEventListener("change",e=>{currentClass=e.target.value;draw()});
 q("#overview-sem").addEventListener("change",e=>{semester=Number(e.target.value);if(view==="portraits")draw();else load()});
 q("#overview-reload").addEventListener("click",load);
 q("#overview-sort")?.addEventListener("change",draw);
 q("#overview-search")?.addEventListener("input",draw);
 // Clean up private photo object URLs when navigating away from the owner-only view.
 const observer=new MutationObserver(()=>{if(!root.contains(section)||!root.isConnected){
  disposed=true;revokePhotos();observer.disconnect();
 }});
 observer.observe(root,{childList:true});
 load();
};
})();
