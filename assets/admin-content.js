/* PhysiX — métadonnées et fichiers PDF privés via Supabase RLS.
   Aucune donnée élève, aucun stockage local de JWT, aucun fichier invité accessible. */
(()=>{
"use strict";
const API="https://auqzfcucpglrnvwhjamo.supabase.co/rest/v1/";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const TYPES=["Cours","Résumé","Exercices","Série","Correction","QCM","Présentation","Vidéo","Autre"];
const STATES=[["draft","Brouillon"],["published","Publié"],["archived","Archivé"]];
const LEVELS=["1BAC","2BAC PC"],SUBJECTS=["Physique","Chimie"];
const MAP={chapters:"physix_chapters",resources:"physix_resources",devoirs:"physix_devoirs",files:"physix_resource_files",classes:"physix_classes",pupils:"physix_pupils",activity_events:"physix_activity_events",activity_grades:"physix_activity_grades",student_access:"physix_student_access",pupil_links:"physix_pupil_links",pupil_objectives:"physix_pupil_objectives",class_work:"physix_class_work",class_announcements:"physix_class_announcements",student_profiles:"physix_student_profiles",ai_exercises:"physix_ai_exercises",ai_submissions:"physix_ai_submissions",submission_pages:"physix_submission_pages",chapter_qcm:"physix_chapter_qcm",chapter_qcm_attempts:"physix_chapter_qcm_attempts"};
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
const ICONS={users:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',inbox:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/></svg>',check:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/></svg>',target:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>',chart:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',calendar:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>'};
function render(){
 const root=document.getElementById("content-root");if(!root||!session)return;
 root.hidden=false;
 root.classList.toggle("px-home",tab==="documents");
 const labels={documents:"📄 Ajouter un PDF",classes:"Mes classes",chapters:"Chapitres",resources:"Ressources",devoirs:"Devoirs surveillés",tracking:"Suivi des élèves",pedagogy:"Travail et annonces",dashboard:"Tableau de bord",portraits:"Trombinoscope",ai:"Exercices à remettre",remises:"Copies reçues",wheel:"Roue aléatoire",qcm:"QCM par chapitre"};
 const nav=Object.keys(labels).map(t=>'<button type="button" data-tab="'+t+'" class="'+(t===tab?"selected":"")+'">'+labels[t]+'</button>').join("");
 if(tab==="documents"){
  const advanced=Object.keys(labels).filter(t=>t!=="documents").map(t=>'<button type="button" data-tab="'+t+'">'+labels[t]+'</button>').join("");
  const activeClasses=(rows.classes||[]).filter(c=>c.active);
  const publishedResources=rows.resources.filter(r=>r.state==="published").length;
  const privateFiles=rows.files.length;
  const chapterCount=rows.chapters.length;
  const docGroups=activeClasses.filter(c=>c.level==="1BAC");
  const tile=(label,value,note)=>'<div class="px-pro-kpi"><span>'+esc(label)+'</span><strong>'+value+'</strong><small>'+esc(note)+'</small></div>';
  root.innerHTML='<div class="px-pro-shell">'+
   '<header class="px-pro-hero"><div><div class="px-pro-eyebrow">PHYSIX <span aria-hidden="true">/</span> ESPACE ENSEIGNANT</div>'+
   '<h2>Bonjour, professeur</h2>'+
   '<p>Vos classes, vos cours et vos évaluations, au même endroit.</p></div>'+
   '<button type="button" id="owner-logout" class="px-pro-logout">Déconnexion</button></header>'+
   '<div id="content-message" class="content-note" role="status" aria-live="polite" hidden></div>'+
   '<section class="px-pro-summary" aria-label="Vue d’ensemble">'+
   tile("Classes actives",activeClasses.length,"Groupes d’enseignement")+
   tile("Chapitres",chapterCount,"Physique et chimie")+
   tile("Documents PDF",privateFiles,"Conservés dans votre espace privé")+
   tile("Ressources publiées",publishedResources,"Fiches pédagogiques")+'</section>'+
   '<div class="px-pro-section-heading"><div><h3>Actions rapides</h3><p>Les outils les plus utiles pendant le cours</p></div></div>'+
   '<div class="px-pro-actions">'+
   '<button type="button" id="open-tracking"><span class="px-pro-action-icon">'+ICONS.users+'</span><strong>Suivi & activités</strong><small>Participation, exercices, notes</small></button>'+
   '<button type="button" id="open-remises"><span class="px-pro-action-icon">'+ICONS.inbox+'</span><strong>Copies à corriger</strong><small>Valider les devoirs reçus</small></button>'+
   '<button type="button" id="open-qcm"><span class="px-pro-action-icon">'+ICONS.check+'</span><strong>QCM & Claude</strong><small>15 questions par chapitre</small></button>'+
   '<button type="button" id="open-wheel"><span class="px-pro-action-icon">'+ICONS.target+'</span><strong>Élève au hasard</strong><small>Interroger en classe</small></button>'+
   '<button type="button" id="open-dashboard"><span class="px-pro-action-icon">'+ICONS.chart+'</span><strong>Statistiques</strong><small>Résultats et progression</small></button>'+
   '<button type="button" id="open-pedagogy"><span class="px-pro-action-icon">'+ICONS.calendar+'</span><strong>Travail & annonces</strong><small>Consignes pour les groupes</small></button></div>'+
   '<details class="px-simple-secondary"><summary>Autres outils pédagogiques</summary><div class="overview-home-shortcuts"><button type="button" id="open-portraits">Trombinoscope</button><button type="button" id="open-ai">Exercices à remettre</button></div></details>'+ 
   '<section class="px-pro-groups"><div><h3>Mes groupes</h3><p>Choisissez rapidement la classe pour votre prochain document.</p></div>'+
   '<div class="px-pro-group-chips">'+
   activeClasses.map(c=>'<button type="button" data-class-focus="'+esc(c.code)+'">'+esc(c.code)+'</button>').join("")+
   '</div>'+(docGroups.length>1?'<p class="px-pro-tip">Un même PDF peut être attribué à G1, G2 et G3 en une seule fois.</p>':"")+'</section>'+
   '<div class="px-pro-section-heading" id="px-pro-doc-heading"><div><h3>Documents et accès élèves</h3><p>Importer un cours, une série ou un devoir, et inviter vos élèves</p></div></div>'+
   '</div>';
  if(typeof window.physixQuickPdfRender==="function"){
    window.physixQuickPdfRender(root,{rows,session,rest,refresh,esc,opt,alertText});
    window.physixStudentAdminRender?.(root,{rows,session,rest,refresh,esc,opt,alertText});
    root.querySelector("[data-class-manager]")?.addEventListener("click",()=>{tab="classes";render()});
    root.querySelectorAll("[data-class-focus]").forEach(button=>button.addEventListener("click",()=>{
      const select=root.querySelector("#simple-class");
      if(!select)return;
      select.value=button.dataset.classFocus;
      select.dispatchEvent(new Event("change",{bubbles:true}));
      root.querySelector("#quick-pdf-section")?.scrollIntoView({behavior:"smooth",block:"start"});
    }));
    root.querySelector("#open-tracking")?.addEventListener("click",()=>{tab="tracking";render()});
    root.querySelector("#open-pedagogy")?.addEventListener("click",()=>{tab="pedagogy";render()});
    root.querySelector("#open-dashboard")?.addEventListener("click",()=>{tab="dashboard";render()});
    root.querySelector("#open-portraits")?.addEventListener("click",()=>{tab="portraits";render()});
    root.querySelector("#open-ai")?.addEventListener("click",()=>{tab="ai";render()});
    root.querySelector("#open-remises")?.addEventListener("click",()=>{tab="remises";render()});
    root.querySelector("#open-wheel")?.addEventListener("click",()=>{tab="wheel";render()});
    root.querySelector("#open-qcm")?.addEventListener("click",()=>{tab="qcm";render()});
  }else alertText("Le module PDF est indisponible. Rechargez la page.",true);
  const menu=document.createElement("details");
  menu.className="quick-advanced-menu";
  menu.innerHTML='<summary>Gestion avancée : classes, chapitres, ressources et devoirs</summary><nav class="content-tabs" aria-label="Gestion avancée">'+advanced+'</nav>';
  root.append(menu);
  menu.querySelectorAll("[data-tab]").forEach(b=>b.addEventListener("click",()=>{tab=b.dataset.tab;editing=null;render()}));
  root.querySelector("#owner-logout").addEventListener("click",()=>{window.physixDrive?.disconnect();location.reload()});
  return;
 }
 if(tab==="wheel"||tab==="qcm"){
  const chosen=tab;
  root.innerHTML='<div class="content-head"><div><h2>'+
   (chosen==="wheel"?"🎡 Roue aléatoire des élèves":"✅ QCM par chapitre")+
   '</h2><p>Outil pédagogique réservé à l’enseignant.</p></div>'+
   '<button type="button" data-back-documents>← Mes documents</button></div>';
  if(chosen==="wheel")window.physixClassWheel?.(root,{rows,session,rest});
  else window.physixTeacherQcm?.(root,{rows,session,rest});
  root.querySelector("[data-back-documents]").addEventListener("click",()=>{tab="documents";render()});
  return;
 }
 if(tab==="remises"){
  root.innerHTML='<div class="content-head"><div><h2>📷 Copies reçues</h2>'+
    '<p>Validez ou refusez les photos envoyées. Le Suivi n’est crédité qu’après validation.</p></div>'+
    '<button type="button" data-back-documents>← Mes documents</button></div>';
  if(typeof window.physixAiRemisesTeacher==="function")window.physixAiRemisesTeacher(root,{rows,session,rest});
  else root.insertAdjacentHTML("beforeend",'<p>Module des copies indisponible.</p>');
  root.querySelector("[data-back-documents]").addEventListener("click",()=>{tab="documents";render()});
  return;
 }
 if(tab==="ai"){
  root.innerHTML='<div class="content-head"><div><h2>Gestion des exercices à remettre</h2>'+
   '<p>Publier les exercices à remettre aux élèves.</p></div>'+
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
window.physixAdminOpenTab=function(target){if(!session)return;if(["remises","ai","tracking"].includes(target)){tab=target;render();document.getElementById("content-root")?.scrollIntoView({behavior:"smooth",block:"start"})}};
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
  window.physixAdminNotificationsInit?.({session,rest,openTab:window.physixAdminOpenTab});
  login.hidden=true;
  document.querySelector(".entry-wrap")?.classList.add("owner-authenticated");
  document.body.classList.add("owner-authenticated");
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
