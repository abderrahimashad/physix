/* PhysiX — métadonnées et fichiers PDF privés via Supabase RLS.
   Aucune donnée élève, aucun stockage local de JWT, aucun fichier invité accessible. */
(()=>{
"use strict";
const API="https://auqzfcucpglrnvwhjamo.supabase.co/rest/v1/";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const TYPES=["Cours","Résumé","Exercices","Série","Correction","QCM","Présentation","Vidéo","Autre"];
const STATES=[["draft","Brouillon"],["published","Publié"],["archived","Archivé"]];
const LEVELS=["1BAC","2BAC PC"],SUBJECTS=["Physique","Chimie"];
const MAP={chapters:"physix_chapters",resources:"physix_resources",devoirs:"physix_devoirs",files:"physix_resource_files",classes:"physix_classes",pupils:"physix_pupils",activity_events:"physix_activity_events",activity_grades:"physix_activity_grades",student_access:"physix_student_access",pupil_links:"physix_pupil_links",pupil_objectives:"physix_pupil_objectives",class_work:"physix_class_work",class_announcements:"physix_class_announcements",student_profiles:"physix_student_profiles",ai_exercises:"physix_ai_exercises"};
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const opt=(values,chosen)=>values.map(x=>{const [value,label]=Array.isArray(x)?x:[x,x];return '<option value="'+esc(value)+'"'+(String(value)===String(chosen)?" selected":"")+'>'+esc(label)+'</option>'}).join("");
const field=(title,name,value="",type="text")=>'<label>'+esc(title)+'<input name="'+esc(name)+'" type="'+type+'" value="'+esc(value)+'" required'+(type==="text"?' maxlength="160"':"")+'></label>';
const select=(title,name,values,chosen)=>'<label>'+esc(title)+'<select name="'+esc(name)+'" required>'+opt(values,chosen)+'</select></label>';
const alertText=(message,error=false)=>{const target=document.getElementById("content-message");if(!target)return;target.textContent=message;target.className="content-note"+(error?" bad":"");};
let session=null,rows={chapters:[],resources:[],devoirs:[],files:[],classes:[]},tab="documents",editing=null,busy=false;
async function rest(table,query="",method="GET",body){
 if(!session)throw Error("Session terminée. Reconnectez-vous.");
 const resp=await fetch(API+MAP[table]+query,{
   method,headers:{"apikey":KEY,"Authorization":"Bearer "+session.token,"Content-Type":"application/json","Prefer":"return=representation"},
   body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",referrerPolicy:"no-referrer"
 });
 const data=await resp.json().catch(()=>null);
 if(resp.status===401||resp.status===403)throw Error("Accès refusé ou session expirée. Reconnectez-vous.");
 if(!resp.ok)throw Error(data?.message||"Opération refusée par le serveur.");
 return data;
}
async function refresh(){
 const [chapters,resources,devoirs,files,classes]=await Promise.all([
 rest("chapters","?select=*&order=sort_order.asc,created_at.asc"),
 rest("resources","?select=*&order=sort_order.asc,created_at.asc"),
 rest("devoirs","?select=*&order=semester.asc,devoir_number.asc"),
 rest("files","?select=*&order=created_at.desc"),
 rest("classes","?select=*&order=level.asc,code.asc")
 ]);
 rows={chapters,resources,devoirs,files,classes};render();
}
function formMarkup(){
 const obj=rows[tab].find(x=>x.id===editing)||{};
 if(tab==="chapters")return select("Niveau","level",LEVELS,obj.level||LEVELS[0])+
 select("Matière","subject",SUBJECTS,obj.subject||SUBJECTS[0])+
 field("Titre du chapitre","title",obj.title)+select("Semestre","semester",["1","2"],obj.semester||1)+
 field("Ordre","sort_order",obj.sort_order||0,"number")+
 select("État","state",STATES,obj.state||"draft")+
 '<label class="full">Objectifs / description<textarea name="description" maxlength="1000">'+esc(obj.description||"")+'</textarea></label>';
 if(tab==="resources")return select("Chapitre","chapter_id",rows.chapters.map(x=>[x.id,x.level+" · "+x.subject+" — "+x.title]),obj.chapter_id||rows.chapters[0]?.id)+
 select("Type","kind",TYPES,obj.kind||"Cours")+
 field("Titre de la ressource","title",obj.title)+
 field("Ordre","sort_order",obj.sort_order||0,"number")+
 select("Visibilité","visibility",[["private","Privée"],["public","Publique (métadonnée uniquement)"]],obj.visibility||"private")+
 select("État","state",STATES,obj.state||"draft");
 return select("Niveau","level",LEVELS,obj.level||LEVELS[0])+
 select("Matière","subject",SUBJECTS,obj.subject||SUBJECTS[0])+
 select("Semestre","semester",["1","2"],obj.semester||1)+
 field("Numéro du devoir","devoir_number",obj.devoir_number||1,"number")+
 field("Titre du devoir","title",obj.title)+
 field("Durée (minutes)","duration_minutes",obj.duration_minutes||60,"number")+
 select("État","state",STATES,obj.state||"draft")+
 select("Corrigé","correction_state",[["hidden","Masqué"],["authorized","Autorisé (pas de fichier)"]],obj.correction_state||"hidden");
}
function rowMarkup(x){
 let subtitle=tab==="chapters"?x.level+" · "+x.subject+" · Semestre "+x.semester:
 tab==="resources"?(rows.chapters.find(c=>c.id===x.chapter_id)?.title||"Chapitre manquant")+" · "+x.kind+" · "+x.visibility:
 x.level+" · "+x.subject+" · S"+x.semester+" · N° "+x.devoir_number;
 return '<article class="content-item"><div class="content-item-line"><strong>'+esc(x.title)+'</strong><span class="content-tag">'+esc(STATES.find(p=>p[0]===x.state)?.[1]||x.state)+'</span></div><p>'+esc(subtitle)+'</p><div class="content-actions"><button type="button" data-edit="'+esc(x.id)+'">Modifier</button><button type="button" data-delete="'+esc(x.id)+'" class="danger">Supprimer</button></div></article>';
}
function render(){
 const root=document.getElementById("content-root");if(!root||!session)return;
 root.hidden=false;
 const labels={documents:"📄 Ajouter un PDF",classes:"Mes classes",chapters:"Chapitres",resources:"Ressources",devoirs:"Devoirs surveillés",tracking:"Suivi des élèves",pedagogy:"Travail et annonces",dashboard:"Tableau de bord",portraits:"Trombinoscope",ai:"Assistant IA"};
 const nav=Object.keys(labels).map(t=>'<button type="button" data-tab="'+t+'" class="'+(t===tab?"selected":"")+'">'+labels[t]+'</button>').join("");
 if(tab==="documents"){
  const advanced=Object.keys(labels).filter(t=>t!=="documents").map(t=>'<button type="button" data-tab="'+t+'">'+labels[t]+'</button>').join("");
  root.innerHTML='<div class="content-head"><div><h2>Mes documents de physique-chimie</h2><p>Gérez vos chapitres, vos devoirs et les documents accessibles aux élèves.</p></div><button type="button" id="owner-logout">Déconnexion</button></div>'+
  '<div id="content-message" class="content-note" role="status" aria-live="polite" hidden></div>'+
  '<button type="button" id="open-tracking" class="track-entry">📊 Suivi des élèves et note d’activité</button><button type="button" id="open-pedagogy" class="track-entry">📘 Travail, annonces et objectifs</button><div class="overview-home-shortcuts"><button type="button" id="open-dashboard">📊 Tableau de bord</button><button type="button" id="open-portraits">📸 Trombinoscope</button><button type="button" id="open-ai">🤖 Assistant IA</button></div>';
  if(typeof window.physixQuickPdfRender==="function"){
    window.physixQuickPdfRender(root,{rows,session,rest,refresh,esc,opt,alertText});
    window.physixStudentAdminRender?.(root,{rows,session,rest,refresh,esc,opt,alertText});
    root.querySelector("[data-class-manager]")?.addEventListener("click",()=>{tab="classes";render()});
    root.querySelector("#open-tracking")?.addEventListener("click",()=>{tab="tracking";render()});
    root.querySelector("#open-pedagogy")?.addEventListener("click",()=>{tab="pedagogy";render()});
    root.querySelector("#open-dashboard")?.addEventListener("click",()=>{tab="dashboard";render()});
    root.querySelector("#open-portraits")?.addEventListener("click",()=>{tab="portraits";render()});
    root.querySelector("#open-ai")?.addEventListener("click",()=>{tab="ai";render()});
  }else alertText("Le module PDF est indisponible. Rechargez la page.",true);
  const menu=document.createElement("details");
  menu.className="quick-advanced-menu";
  menu.innerHTML='<summary>⚙ Gestion avancée : classes, chapitres, ressources et devoirs</summary><nav class="content-tabs" aria-label="Gestion avancée">'+advanced+'</nav>';
  root.append(menu);
  menu.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;editing=null;render()}));
  root.querySelector("#owner-logout").addEventListener("click",()=>{window.physixDrive?.disconnect();location.reload()});
  return;
 }
 if(tab==="ai"){
  root.innerHTML='<div class="content-head"><div><h2>Assistant IA de physique-chimie</h2>'+
   '<p>Publier des exercices avec corrigés privés.</p></div>'+
   '<button type="button" data-back-documents>← Mes documents</button></div>';
  if(typeof window.physixAiTeacherRender==="function")window.physixAiTeacherRender(root,{rows,session,rest});
  else root.insertAdjacentHTML("beforeend",'<p>Module IA indisponible. Rechargez la page.</p>');
  root.querySelector("[data-back-documents]").addEventListener("click",()=>{tab="documents";render()});
  return;
 }
 if(tab==="dashboard"||tab==="portraits"){
  const overview=tab;
  root.innerHTML='<div class="content-head"><div><h2>'+
    (overview==="dashboard"?"Tableau de bord pédagogique":"Trombinoscope des élèves")+
    '</h2><p>Vue privée réservée au professeur PhysiX.</p></div>'+
    '<button type="button" data-back-documents>← Mes documents</button></div>';
  if(typeof window.physixOwnerOverview==="function")
   window.physixOwnerOverview(root,{rows,session,rest,view:overview});
  else root.insertAdjacentHTML("beforeend",'<p>Le module est indisponible. Actualisez la page.</p>');
  root.querySelector("[data-back-documents]").addEventListener("click",()=>{tab="documents";render()});
  return;
 }
 if(tab==="pedagogy"){
  root.innerHTML='<div class="content-head"><div><h2>Travail à faire, annonces et objectifs</h2><p>Publications par classe, liens sécurisés et objectifs individuels.</p></div>'+
   '<button type="button" data-back-documents>← Mes documents</button></div>';
  if(typeof window.physixPedagogyRender==="function")
   window.physixPedagogyRender(root,{rows,session,rest,refresh,esc,opt,alertText});
  else root.insertAdjacentHTML("beforeend",'<p>Module pédagogique indisponible. Rechargez la page.</p>');
  root.querySelector("[data-back-documents]").addEventListener("click",()=>{tab="documents";render()});
  return;
 }
 if(tab==="tracking"){
  root.innerHTML='<div class="content-head"><div><h2>Suivi pédagogique des élèves</h2><p>Classe, semestre, événements observés et note d’activité attribuée par le professeur.</p></div>'+
   '<button type="button" data-back-documents>← Mes documents</button></div>';
  if(typeof window.physixTrackingRender==="function")
   window.physixTrackingRender(root,{rows,session,rest,refresh,esc,opt,alertText});
  else root.insertAdjacentHTML("beforeend",'<p>Le module de suivi est indisponible. Actualisez la page.</p>');
  root.querySelector("[data-back-documents]").addEventListener("click",()=>{tab="documents";render()});
  return;
 }
 if(tab==="classes"){
  root.innerHTML='<div class="content-head"><div><h2>Mes classes</h2><p>Ajoutez des groupes ou retirez les classes qui ne sont plus utilisées.</p></div><button type="button" data-back-documents>← Mes documents</button></div><div id="content-message" class="content-note" role="status"></div>';
  if(typeof window.physixClassRender==="function")
    window.physixClassRender(root,{rows,session,rest,refresh,esc,opt,alertText});
  else alertText("Gestion des classes indisponible. Actualisez la page.",true);
  root.querySelector("[data-back-documents]").addEventListener("click",()=>{tab="documents";render()});
  return;
 }
 const disabled=tab==="resources"&&rows.chapters.length===0;
 root.innerHTML='<div class="content-head"><div><h2>Gestion pédagogique sécurisée</h2><p>Fiches enregistrées dans Supabase. PDF conservés dans un espace privé, accessibles seulement au propriétaire.</p></div><button type="button" id="owner-logout">Déconnexion</button></div>'+
 '<nav class="content-tabs" aria-label="Modules">'+nav+'</nav>'+
 '<div class="content-counts"><span>'+rows.chapters.length+' chapitre(s)</span><span>'+rows.resources.length+' ressource(s)</span><span>'+rows.devoirs.length+' devoir(s)</span></div>'+
 '<div id="content-message" class="content-note" role="status" aria-live="polite"></div>'+
 '<section class="content-section"><h3>'+(editing?"Modifier":"Ajouter")+" — "+labels[tab]+'</h3>'+
 (disabled?'<p>Créez d’abord un chapitre.</p>':'<form id="content-form" class="content-form">'+formMarkup()+'<div class="full"><button type="submit" '+(busy?"disabled":"")+'>'+(editing?"Enregistrer":"Ajouter")+'</button> '+(editing?'<button type="button" id="content-cancel">Annuler</button>':"")+'</div></form>')+'</section>'+
 '<section class="content-section"><h3>Éléments enregistrés</h3><div class="content-items">'+(rows[tab].map(rowMarkup).join("")||'<p>Aucun élément enregistré.</p>')+'</div></section>';
 root.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;editing=null;render()}));
 root.querySelectorAll("[data-edit]").forEach(b=>b.addEventListener("click",()=>{editing=b.dataset.edit;render();root.scrollIntoView({behavior:"smooth"})}));
 root.querySelectorAll("[data-delete]").forEach(b=>b.addEventListener("click",()=>remove(b.dataset.delete)));
 root.querySelector("#content-cancel")?.addEventListener("click",()=>{editing=null;render()});
 root.querySelector("#content-form")?.addEventListener("submit",save);
 if(tab==="resources"||tab==="devoirs"){
  if(typeof window.physixFilesRender==="function"){
   window.physixFilesRender(root,{tab,rows,session,rest,refresh,esc,opt,alertText});
  }
 }
 root.querySelector("#owner-logout").addEventListener("click",async()=>{const token=session?.token;session=null;window.physixDrive?.disconnect();root.hidden=true;root.innerHTML="";document.getElementById("owner-form").hidden=false;if(token){fetch("https://auqzfcucpglrnvwhjamo.supabase.co/auth/v1/logout",{method:"POST",headers:{"apikey":KEY,"Authorization":"Bearer "+token}}).catch(()=>{})}alert("Session terminée sur cette page. Connectez-vous pour revenir à la gestion.")});
}
function values(form){
 const raw=Object.fromEntries(new FormData(form).entries());
 for(const k of ["semester","sort_order","devoir_number","duration_minutes"]){if(k in raw)raw[k]=Number(raw[k])}
 if(raw.title)raw.title=raw.title.trim();
 if(!raw.title||raw.title.length>160)throw Error("Indiquez un titre de 1 à 160 caractères.");
 if("sort_order" in raw&&(raw.sort_order<0||!Number.isInteger(raw.sort_order)))throw Error("Ordre invalide.");
 if("duration_minutes" in raw&&(raw.duration_minutes<1||raw.duration_minutes>600))throw Error("Durée entre 1 et 600 minutes.");
 if("devoir_number" in raw&&(raw.devoir_number<1||raw.devoir_number>30))throw Error("Numéro de devoir entre 1 et 30.");
 if("description" in raw)raw.description=raw.description.trim();
 return raw;
}
async function save(event){
 event.preventDefault();if(busy)return;
 busy=true;
 const currentTab=tab,oldId=editing;
 try{
  const payload=values(event.currentTarget);
  if(currentTab==="resources"&&!rows.chapters.some(x=>x.id===payload.chapter_id))throw Error("Choisissez un chapitre existant.");
  if(oldId){
   const result=await rest(currentTab,"?id=eq."+encodeURIComponent(oldId),"PATCH",payload);
   if(!Array.isArray(result)||result.length!==1)throw Error("La modification n'a pas été confirmée.");
  }else{
   const result=await rest(currentTab,"","POST",{...payload,owner_id:session.ownerId});
   if(!Array.isArray(result)||result.length!==1)throw Error("La création n'a pas été confirmée.");
  }
  editing=null;await refresh();alertText("Enregistrement effectué dans la base sécurisée.");
 }catch(error){alertText(error.message,true)}
 finally{busy=false;const b=document.querySelector("#content-form button[type=submit]");if(b)b.disabled=false}
}
async function remove(id){
 if(busy)return;
 // Éviter les PDF orphelins : d'abord supprimer les pièces jointes depuis l'éditeur privé.
 if(tab==="resources"&&rows.files.some(f=>f.resource_id===id)){
  alertText("Cette ressource possède des PDF. Supprimez d'abord ses fichiers privés.",true);return;
 }
 if(tab==="devoirs"&&rows.files.some(f=>f.devoir_id===id)){
  alertText("Ce devoir possède des PDF. Supprimez d'abord ses fichiers privés.",true);return;
 }
 if(!window.confirm("Supprimer définitivement cette fiche ? Les chapitres contenant des ressources ne peuvent pas être supprimés."))return;
 busy=true;
 try{
  const result=await rest(tab,"?id=eq."+encodeURIComponent(id),"DELETE");
  if(!Array.isArray(result)||result.length!==1)throw Error("Suppression non confirmée.");
  editing=null;await refresh();alertText("Élément supprimé.");
 }catch(error){alertText(error.message,true)}
 finally{busy=false}
}
window.physixAdminStart=async function(token,ownerId){
 if(!token||!ownerId)throw Error("Identité du propriétaire manquante.");
 session={token,ownerId};editing=null;tab="documents";
 const login=document.getElementById("owner-form");
 const root=document.getElementById("content-root");
 const status=document.getElementById("auth-message");
 if(!root||!login)throw Error("Module d'administration introuvable.");
 // Donner un retour visible immédiatement, avant même les requêtes réseau.
 root.hidden=false;
 root.innerHTML='<div class="content-note" role="status">Connexion acceptée. Chargement de la gestion pédagogique…</div>';
 root.scrollIntoView({behavior:"smooth",block:"start"});
 try{
  await refresh();
  login.hidden=true;
  document.querySelector(".entry-wrap")?.classList.add("owner-authenticated");
  alertText("Connexion propriétaire confirmée. Vous pouvez gérer vos fiches.");
  root.scrollIntoView({behavior:"smooth",block:"start"});
 }catch(error){
  // Ne jamais transformer une erreur REST en message « mot de passe incorrect ».
  session=null;
  login.hidden=false;
  root.hidden=false;
  root.innerHTML='<div class="content-note bad" role="alert">Connexion reconnue, mais le chargement des données a échoué. '+esc(error.message||"Erreur serveur")+'</div><button id="return-to-login" type="button">Revenir à la connexion</button>';
  root.querySelector("#return-to-login").addEventListener("click",()=>{root.hidden=true;login.scrollIntoView({behavior:"smooth"})});
  if(status)status.textContent="Authentification réussie ; erreur lors du chargement de la gestion.";
  throw error;
 }
};
})();
