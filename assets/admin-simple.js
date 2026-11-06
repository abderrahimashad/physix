/* PhysiX — parcours professeur : classe, type, PDF; tout le reste automatique. */
(()=>{
"use strict";
const API="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const BUCKET="physix-private",MAX_BYTES=50*1024*1024;
const kinds=["Cours","Série","Exercices","Résumé","Devoir surveillé","Correction","QCM","Présentation","Vidéo","Autre"];
const encPath=p=>p.split("/").map(encodeURIComponent).join("/");
const headers=session=>({"apikey":KEY,"Authorization":"Bearer "+session.token});
async function objectRequest(session,path,method,file){
 const h=headers(session);
 if(method==="POST"){h["Content-Type"]="application/pdf";h["x-upsert"]="false"}
 const response=await fetch(API+"/storage/v1/object/"+(method==="GET"?"authenticated/":"")+BUCKET+"/"+encPath(path),{
  method,headers:h,body:file,cache:"no-store",referrerPolicy:"no-referrer"
 });
 if(!response.ok){
  const error=await response.json().catch(()=>({}));
  throw Error(error.message||error.error||"Supabase a refusé la demande sur le PDF.");
 }
 return method==="GET"?response.blob():response.json().catch(()=>({}));
}
window.physixQuickPdfRender=(root,{rows,session,rest,refresh,esc,opt,alertText})=>{
 const classes=(rows.classes||[]).filter(c=>c.active);
 const attached=rows.files.filter(x=>x.resource_id);
 const section=document.createElement("section");
 section.className="content-section quick-primary-pdf";
 section.id="quick-pdf-section";
 const list=attached.map(file=>{
  const item=rows.resources.find(r=>r.id===file.resource_id);
  const names=(item?.target_classes||[]).join(", ")||"Sans classe";
  return '<article class="content-item"><strong>'+esc(item?.title||file.filename)+'</strong>'+
    '<p>'+esc(names)+' · '+esc(item?.kind||"PDF")+' · '+esc(file.filename)+'</p>'+
    '<div class="content-actions"><button type="button" data-simple-open="'+esc(file.id)+'">Ouvrir</button>'+
    '<button type="button" class="danger" data-simple-delete="'+esc(file.id)+'">Supprimer</button></div></article>';
 }).join("");
 section.innerHTML='<div class="quick-simple-header"><span class="quick-step-icon" aria-hidden="true">📄</span><div>'+
 '<h3>Ajouter un document</h3><p>Choisissez la classe, le type de document et le PDF.</p></div></div>'+
 (classes.length?
 '<form id="simple-upload" class="quick-simple-form">'+
 '<div class="quick-step"><label for="simple-class">1. Pour quelle classe ?</label>'+
 '<select id="simple-class" class="quick-class-selector" name="class" required>'+
 opt(classes.map(c=>[c.code,c.code]),classes[0].code)+'</select></div>'+
 '<div class="quick-step"><label for="simple-kind">2. Quel type de document ?</label>'+
 '<select id="simple-kind" name="kind" required>'+opt(kinds,"Cours")+'</select></div>'+
 '<div class="quick-step"><label for="simple-file">3. Choisir votre PDF</label>'+
 '<input id="simple-file" type="file" name="pdf" accept=".pdf,application/pdf" required>'+
 '<span class="quick-file-hint">Maximum 50 Mo avec la configuration Supabase actuelle.</span></div>'+
 '<details class="quick-optional"><summary>Options facultatives : matière et chapitre</summary>'+
 '<label for="simple-subject">Matière</label><select id="simple-subject" name="subject">'+
 opt(["Physique","Chimie"],"Physique")+'</select>'+
 '<label for="simple-chapter">Chapitre</label><select id="simple-chapter" name="chapter"></select>'+
 '<label for="simple-title">Titre personnalisé</label>'+
 '<input id="simple-title" type="text" maxlength="160" name="title" placeholder="Par défaut : nom du PDF"></details>'+
 '<button id="quick-main-upload" type="submit">⬆ Enregistrer le PDF</button></form>':
 '<p>Aucune classe active. Ouvrez « Gestion avancée » → « Mes classes » pour en ajouter une.</p>')+
 '<div id="simple-feedback" class="content-note" role="status" aria-live="polite">🔒 Document privé : non accessible aux élèves actuellement.</div>'+
 '<details class="quick-documents"><summary>Mes PDF ('+attached.length+')</summary><div class="content-items">'+
 (list||'<p>Aucun PDF pour le moment.</p>')+'</div></details>';
 root.append(section);
 const form=section.querySelector("#simple-upload");
 const note=(text,bad=false)=>{const target=section.querySelector("#simple-feedback");if(target){target.textContent=text;target.className="content-note"+(bad?" bad":"")}};
 const drawChapter=()=>{
  if(!form)return;
  const chosen=classes.find(c=>c.code===form.elements["class"].value);
  const subject=form.elements.subject.value;
  const options=rows.chapters.filter(c=>c.level===chosen?.level&&c.subject===subject);
  const select=form.elements.chapter;
  select.innerHTML='<option value="auto">Sans chapitre précis (classement automatique)</option>'+
   opt(options.map(c=>[c.id,c.title]),"auto");
 };
 form?.elements["class"].addEventListener("change",drawChapter);
 form?.elements.subject.addEventListener("change",drawChapter);
 drawChapter();
 let busy=false;
 form?.addEventListener("submit",async event=>{
  event.preventDefault();if(busy)return;
  const classroom=classes.find(c=>c.code===form.elements["class"].value);
  const kind=form.elements.kind.value,file=form.elements.pdf.files?.[0];
  if(!classroom||!kinds.includes(kind)||!file)return note("Sélectionnez la classe, le type et le PDF.",true);
  if(!/\\.pdf$/i.test(file.name)||file.size<=0||file.size>MAX_BYTES||(file.type&&file.type!=="application/pdf")){
   return note("PDF invalide ou trop grand. Maximum 50 Mo sur l'offre actuelle.",true);
  }
  if(await file.slice(0,5).text()!=="%PDF-")return note("Le fichier sélectionné n'est pas un PDF valide.",true);
  const title=(form.elements.title.value.trim()||file.name.replace(/\\.pdf$/i,"")).slice(0,160);
  if(!title)return note("Le PDF doit avoir un titre.",true);
  const advanced=form.querySelector(".quick-optional").open;
  const subject=advanced?form.elements.subject.value:"Physique";
  const chosenChapter=advanced?form.elements.chapter.value:"auto";
  busy=true;form.querySelector("button[type=submit]").disabled=true;
  let resource=null,uploadedPath=null,createdFile=false;
  note("Enregistrement du PDF privé en cours…");
  try{
   let chapter=chosenChapter==="auto"?null:rows.chapters.find(c=>c.id===chosenChapter);
   if(chapter&&(chapter.level!==classroom.level||chapter.subject!==subject))throw Error("Chapitre incompatible avec la classe.");
   if(!chapter){
    const defaultTitle="Documents généraux";
    chapter=rows.chapters.find(c=>c.level===classroom.level&&c.subject===subject&&c.title===defaultTitle);
    if(!chapter){
     const result=await rest("chapters","","POST",{owner_id:session.ownerId,level:classroom.level,subject,title:defaultTitle,
       semester:1,sort_order:0,state:"draft",description:"Classement automatique des documents importés"});
     if(!Array.isArray(result)||result.length!==1)throw Error("Impossible de créer le rangement du document.");
     chapter=result[0];
    }
   }
   const result=await rest("resources","","POST",{owner_id:session.ownerId,chapter_id:chapter.id,title,kind,
    target_classes:[classroom.code],visibility:"private",state:"draft",sort_order:rows.resources.length});
   if(!Array.isArray(result)||result.length!==1)throw Error("Création de la fiche PDF refusée.");
   resource=result[0];
   uploadedPath=session.ownerId+"/resource/"+resource.id+"/"+crypto.randomUUID()+".pdf";
   await objectRequest(session,uploadedPath,"POST",file);
   const meta=await rest("files","","POST",{owner_id:session.ownerId,resource_id:resource.id,
     devoir_id:null,file_role:"content",storage_path:uploadedPath,filename:file.name.split(/[\\\\/]/).pop().slice(0,200),
     mime_type:"application/pdf",file_size:file.size});
   if(!Array.isArray(meta)||meta.length!==1)throw Error("Le stockage a réussi mais la fiche PDF n'est pas enregistrée.");
   createdFile=true;
   await refresh();
   alertText("PDF enregistré dans votre espace privé : "+classroom.code+" · "+kind+".");
  }catch(error){
   if(createdFile)note("Le PDF est enregistré, mais la page n'a pas pu s'actualiser. Reconnectez-vous pour le retrouver.",true);
   else{
    let cleanupFailed=false;
    if(uploadedPath){try{await objectRequest(session,uploadedPath,"DELETE")}catch{cleanupFailed=true}}
    if(resource&&!cleanupFailed){try{await rest("resources","?id=eq."+encodeURIComponent(resource.id),"DELETE")}catch{cleanupFailed=true}}
    note(error.message+(cleanupFailed?" Vérifiez le stockage privé avant de réessayer.":""),true);
   }
  }finally{busy=false;const btn=form.querySelector("button[type=submit]");if(btn)btn.disabled=false}
 });
 section.querySelectorAll("[data-simple-open]").forEach(button=>button.addEventListener("click",async()=>{
  const doc=attached.find(f=>f.id===button.dataset.simpleOpen);if(!doc)return;
  const windowRef=window.open("","_blank");
  if(!windowRef){note("Autorisez les nouveaux onglets pour ouvrir les PDF.",true);return}
  button.disabled=true;
  try{
   const pdf=await objectRequest(session,doc.storage_path,"GET");
   const localUrl=URL.createObjectURL(new Blob([pdf],{type:"application/pdf"}));
   windowRef.location.href=localUrl;
   setTimeout(()=>URL.revokeObjectURL(localUrl),120000);
  }catch(error){windowRef.close();note(error.message,true)}
  finally{button.disabled=false}
 }));
 section.querySelectorAll("[data-simple-delete]").forEach(button=>button.addEventListener("click",async()=>{
  const doc=attached.find(f=>f.id===button.dataset.simpleDelete);
  if(!doc||busy||!confirm("Supprimer définitivement ce document PDF ?"))return;
  busy=true;button.disabled=true;
  try{
   await objectRequest(session,doc.storage_path,"DELETE");
   const deleted=await rest("files","?id=eq."+encodeURIComponent(doc.id),"DELETE");
   if(!Array.isArray(deleted)||deleted.length!==1)throw Error("Le PDF est supprimé mais sa fiche reste. Actualisez la page.");
   await refresh();alertText("PDF supprimé.");
  }catch(error){note(error.message,true)}
  finally{busy=false;button.disabled=false}
 }));
};
})();