/* PhysiX — pièces jointes PDF strictement privées, accès JWT + RLS Storage. */
(()=>{
"use strict";
const ORIGIN="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const BUCKET="physix-private";
const MAX_BYTES=20*1024*1024;
const pathUrl=path=>path.split("/").map(encodeURIComponent).join("/");
function authHeaders(session){return {"apikey":KEY,"Authorization":"Bearer "+session.token};}
async function storage(session,path,method,body){
 const headers={...authHeaders(session)};
 if(method==="POST"){headers["Content-Type"]="application/pdf";headers["x-upsert"]="false";}
 const response=await fetch(ORIGIN+"/storage/v1/object/"+(method==="GET"?"authenticated/":"")+BUCKET+"/"+pathUrl(path),{
   method,headers,body,cache:"no-store",referrerPolicy:"no-referrer"
 });
 if(!response.ok){
  const error=await response.json().catch(()=>null);
  throw Error(error?.message||error?.error||"Accès au fichier refusé par Supabase.");
 }
 return method==="GET"?response.blob():response.json().catch(()=>({}));
}
function safeName(name){return name.split(/[\\/]/).pop().slice(0,200)||"document.pdf";}
window.physixFilesRender=(root,{tab,rows,session,rest,refresh,esc,opt,alertText})=>{
 const type=tab==="resources"?"resource":"devoir";
 const targets=tab==="resources"?rows.resources:rows.devoirs;
 const relevant=rows.files.filter(f=>type==="resource"?!!f.resource_id:!!f.devoir_id);
 const section=document.createElement("section");
 section.className="content-section";
 section.id="physix-pdf-section";
 section.innerHTML='<h3>📄 Fichiers PDF privés</h3>'+
 '<p>PDF (20 Mo maximum). Fichiers visibles uniquement dans votre espace propriétaire. Même une ressource publiée ne rend pas son PDF accessible aux élèves.</p>'+
 (!targets.length?'<p>Ajoutez d’abord '+(type==="resource"?"une ressource":"un devoir")+' avant de joindre un PDF.</p>':
 '<form id="private-pdf-form" class="content-form">'+
 '<label>'+ (type==="resource"?"Ressource":"Devoir")+
 '<select name="target" required>'+opt(targets.map(x=>[x.id,x.title]),targets[0].id)+'</select></label>'+
 '<label>Nature du fichier<select name="role" required>'+
 opt(type==="resource"?[["content","Document pédagogique"]]:[["subject","Sujet du devoir"],["correction","Correction confidentielle"]],type==="resource"?"content":"subject")+
 '</select></label>'+
 '<label class="full">Choisir un PDF<input type="file" name="pdf" accept=".pdf,application/pdf" required></label>'+
 '<div class="full"><button type="submit">Importer le PDF privé</button></div></form>')+
 '<div class="content-note" id="pdf-message" role="status" aria-live="polite">Les liens directs publics sont désactivés.</div>'+
 '<div class="content-items">'+(relevant.map(f=>{
 const title=targets.find(x=>x.id===(type==="resource"?f.resource_id:f.devoir_id))?.title||"Élément supprimé";
 return '<article class="content-item"><strong>'+esc(f.filename)+'</strong><p>'+esc(title)+' · '+esc(f.file_role)+' · '+Math.ceil(f.file_size/1024)+' Ko</p>'+
 '<div class="content-actions"><button type="button" data-file-open="'+esc(f.id)+'">Ouvrir PDF</button>'+
 '<button type="button" class="danger" data-file-remove="'+esc(f.id)+'">Supprimer</button></div></article>'
 }).join("")||'<p>Aucun PDF enregistré.</p>')+'</div>';
 root.append(section);
 const form=section.querySelector("#private-pdf-form");
 const note=(message,bad=false)=>{
  const el=section.querySelector("#pdf-message");if(!el)return;
  el.textContent=message;el.className="content-note"+(bad?" bad":"");
 };
 let pending=false;
 if(form)form.addEventListener("submit",async event=>{
  event.preventDefault();if(pending)return;
  const file=form.elements.pdf.files?.[0],targetId=form.elements.target.value,role=form.elements.role.value;
  if(!file)return;
  if(!/\.pdf$/i.test(file.name)||file.size<1||file.size>MAX_BYTES||(file.type&&file.type!=="application/pdf")){
   note("Choisissez un fichier PDF valide, de taille inférieure ou égale à 20 Mo.",true);return;
  }
  const signature=await file.slice(0,5).text();
  if(signature!=="%PDF-"){note("Ce fichier ne semble pas être un véritable PDF.",true);return;}
  if(!targets.some(x=>x.id===targetId)){note("Ressource ou devoir introuvable.",true);return;}
  pending=true;form.querySelector("button[type=submit]").disabled=true;
  let uploaded=false;
  const path=session.ownerId+"/"+type+"/"+targetId+"/"+crypto.randomUUID()+".pdf";
  note("Transfert vers l'espace privé sécurisé en cours…");
  try{
   await storage(session,path,"POST",file);
   uploaded=true;
   const meta={owner_id:session.ownerId,
     resource_id:type==="resource"?targetId:null,
     devoir_id:type==="devoir"?targetId:null,
     file_role:role,
     storage_path:path,filename:safeName(file.name),
     mime_type:"application/pdf",file_size:file.size};
   const inserted=await rest("files","","POST",meta);
   if(!Array.isArray(inserted)||inserted.length!==1)throw Error("Le fichier a été transféré, mais son enregistrement n'a pas été confirmé.");
   uploaded=false;
   await refresh();
   alertText("PDF importé et enregistré dans le stockage privé.");
  }catch(error){
   if(uploaded){
    try{await storage(session,path,"DELETE");}
    catch{note("Erreur d'enregistrement : un fichier privé peut être orphelin, contactez l'administrateur.",true);pending=false;return;}
   }
   note(error.message,true);
  }finally{pending=false;const btn=form.querySelector("button[type=submit]");if(btn)btn.disabled=false;}
 });
 section.querySelectorAll("[data-file-open]").forEach(button=>button.addEventListener("click",async()=>{
  const record=relevant.find(x=>x.id===button.dataset.fileOpen);
  if(!record)return;
  const tabWindow=window.open("","_blank");
  if(!tabWindow){note("Autorisez l'ouverture d'un nouvel onglet pour consulter le PDF.",true);return}
  button.disabled=true;note("Ouverture sécurisée du PDF…");
  try{
   const blob=await storage(session,record.storage_path,"GET");
   const url=URL.createObjectURL(new Blob([blob],{type:"application/pdf"}));
   tabWindow.location.href=url;
   setTimeout(()=>URL.revokeObjectURL(url),120000);
   note("PDF ouvert dans un nouvel onglet.");
  }catch(error){tabWindow.close();note(error.message,true)}
  finally{button.disabled=false}
 }));
 section.querySelectorAll("[data-file-remove]").forEach(button=>button.addEventListener("click",async()=>{
  const record=relevant.find(x=>x.id===button.dataset.fileRemove);
  if(!record||pending||!window.confirm("Supprimer définitivement le PDF « "+record.filename+" » ?"))return;
  pending=true;button.disabled=true;
  try{
   await storage(session,record.storage_path,"DELETE");
   const deleted=await rest("files","?id=eq."+encodeURIComponent(record.id),"DELETE");
   if(!Array.isArray(deleted)||deleted.length!==1)throw Error("PDF supprimé du stockage, mais sa fiche n'a pas été supprimée. Rafraîchissez la page.");
   await refresh();alertText("PDF privé supprimé.");
  }catch(error){note(error.message,true)}
  finally{pending=false;button.disabled=false}
 }));
};

/* Parcours simplifié : une ressource privée est créée automatiquement avec le PDF. */
window.physixQuickPdfRender=(root,{rows,session,rest,refresh,esc,opt,alertText})=>{
 const section=document.createElement("section");
 section.className="content-section";
 section.id="quick-pdf-section";
 const chapters=rows.chapters;
 const attached=rows.files.filter(x=>x.resource_id);
 section.innerHTML='<h3>Importer un PDF en une seule étape</h3>'+
 (chapters.length?'<p>1. Choisir le chapitre &nbsp; 2. Choisir le type &nbsp; 3. Choisir le PDF &nbsp; 4. Ajouter</p>'+
 '<form id="quick-pdf-form" class="content-form">'+
 '<label>Chapitre<select name="chapter" required>'+opt(chapters.map(x=>[x.id,x.level+" · "+x.subject+" — "+x.title]),chapters[0].id)+'</select></label>'+
 '<label>Type de document<select name="kind" required>'+opt(["Cours","Résumé","Exercices","Série","Correction","QCM","Présentation","Vidéo","Autre"],"Cours")+'</select></label>'+
 '<label class="full">Titre (facultatif, sinon nom du PDF)<input type="text" name="title" maxlength="160" placeholder="Ex. Série 1 — Ondes mécaniques"></label>'+
 '<label class="full">Choisir le fichier PDF (20 Mo maximum)<input type="file" name="pdf" accept=".pdf,application/pdf" required></label>'+
 '<div class="full"><button type="submit" class="quick-upload-btn">Ajouter le document PDF</button></div></form>':
 '<p>Ajoutez d’abord un chapitre dans l’onglet « Chapitres », puis revenez ici.</p>')+
 '<div id="quick-pdf-message" class="content-note" role="status" aria-live="polite">Les documents sont enregistrés en mode privé. Aucun élève ne peut encore les consulter.</div>'+
 '<h3>Mes documents PDF ('+attached.length+')</h3><div class="content-items">'+
 (attached.map(x=>{
 const res=rows.resources.find(r=>r.id===x.resource_id);
 const chap=rows.chapters.find(c=>c.id===res?.chapter_id);
 return '<article class="content-item"><strong>'+esc(res?.title||x.filename)+'</strong>'+
 '<p>'+esc(chap?.title||"Chapitre non trouvé")+' · '+esc(res?.kind||"Document")+' · '+esc(x.filename)+'</p>'+
 '<div class="content-actions"><button type="button" data-quick-open="'+esc(x.id)+'">Ouvrir</button>'+
 '<button type="button" class="danger" data-quick-remove="'+esc(x.id)+'">Supprimer le PDF</button></div></article>';
 }).join("")||'<p>Vous n’avez pas encore importé de PDF.</p>')+'</div>';
 root.append(section);
 const form=section.querySelector("#quick-pdf-form");
 const note=(text,error=false)=>{const el=section.querySelector("#quick-pdf-message");if(el){el.textContent=text;el.className="content-note"+(error?" bad":"")}};
 let busy=false;
 form?.addEventListener("submit",async event=>{
  event.preventDefault();if(busy)return;
  const file=form.elements.pdf.files?.[0],chapter_id=form.elements.chapter.value,kind=form.elements.kind.value;
  if(!file||!chapters.some(c=>c.id===chapter_id))return note("Choisissez un chapitre et un PDF.",true);
  if(!/\\.pdf$/i.test(file.name)||file.size<1||file.size>MAX_BYTES||(file.type&&file.type!=="application/pdf")){
   note("PDF invalide : extension .pdf et taille maximale 20 Mo.",true);return;
  }
  if(await file.slice(0,5).text()!=="%PDF-"){note("Ce document ne semble pas être un vrai PDF.",true);return}
  const title=(form.elements.title.value.trim()||file.name.replace(/\\.pdf$/i,"")).slice(0,160);
  if(!title)return note("Le document doit avoir un titre.",true);
  busy=true;form.querySelector("button[type=submit]").disabled=true;
  let newResource=null,uploadedPath=null,committed=false;
  note("Enregistrement du document dans votre espace privé…");
  try{
   const result=await rest("resources","","POST",{owner_id:session.ownerId,chapter_id,title,kind,visibility:"private",state:"draft",sort_order:rows.resources.length});
   if(!Array.isArray(result)||result.length!==1)throw Error("Création de la ressource impossible.");
   newResource=result[0];
   const path=session.ownerId+"/resource/"+newResource.id+"/"+crypto.randomUUID()+".pdf";
   await storage(session,path,"POST",file);
   uploadedPath=path;
   const created=await rest("files","","POST",{owner_id:session.ownerId,resource_id:newResource.id,
     devoir_id:null,file_role:"content",storage_path:path,filename:safeName(file.name),
     mime_type:"application/pdf",file_size:file.size});
   if(!Array.isArray(created)||created.length!==1)throw Error("Le fichier a été reçu, mais sa fiche n’a pas été confirmée.");
   committed=true;
   await refresh();
   alertText("PDF enregistré avec succès ! Retrouvez-le dans « Mes documents PDF ».");
  }catch(error){
   if(!committed){
    let cleanupFailed=false;
    if(uploadedPath){try{await storage(session,uploadedPath,"DELETE")}catch{cleanupFailed=true}}
    if(newResource&&!cleanupFailed){try{await rest("resources","?id=eq."+encodeURIComponent(newResource.id),"DELETE")}catch{cleanupFailed=true}}
    note(error.message+(cleanupFailed?" Une vérification des fichiers privés peut être nécessaire.":""),true);
   }else note("Le PDF est enregistré, mais le rafraîchissement a échoué. Reconnectez-vous pour le voir.",true);
  }finally{busy=false;const button=form.querySelector("button[type=submit]");if(button)button.disabled=false}
 });
 section.querySelectorAll("[data-quick-open]").forEach(b=>b.addEventListener("click",async()=>{
  const record=attached.find(x=>x.id===b.dataset.quickOpen);if(!record)return;
  const win=window.open("","_blank");
  if(!win)return note("Autorisez un nouvel onglet pour lire le PDF.",true);
  b.disabled=true;
  try{
   const blob=await storage(session,record.storage_path,"GET");
   const url=URL.createObjectURL(new Blob([blob],{type:"application/pdf"}));
   win.location.href=url;
   setTimeout(()=>URL.revokeObjectURL(url),120000);
  }catch(error){win.close();note(error.message,true)}
  finally{b.disabled=false}
 }));
 section.querySelectorAll("[data-quick-remove]").forEach(b=>b.addEventListener("click",async()=>{
  const record=attached.find(x=>x.id===b.dataset.quickRemove);
  if(!record||busy||!confirm("Supprimer définitivement ce PDF privé ?"))return;
  busy=true;b.disabled=true;
  try{
   await storage(session,record.storage_path,"DELETE");
   const deleted=await rest("files","?id=eq."+encodeURIComponent(record.id),"DELETE");
   if(!Array.isArray(deleted)||deleted.length!==1)throw Error("Fichier supprimé, mais fiche toujours présente.");
   await refresh();alertText("PDF supprimé. Vous pouvez supprimer la ressource vide depuis Ressources si souhaité.");
  }catch(error){note(error.message,true)}finally{busy=false;b.disabled=false}
 }));
};
})();