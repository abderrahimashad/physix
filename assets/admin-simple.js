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
 const drive=window.physixDrive;
 const driveEnabled=drive?.configured()===true;
 if(driveEnabled)drive.prepare().catch(()=>{});
 const section=document.createElement("section");
 section.className="content-section quick-primary-pdf";
 section.id="quick-pdf-section";
 const list=attached.map(file=>{
  const item=rows.resources.find(r=>r.id===file.resource_id);
  const names=(item?.target_classes||[]).join(", ")||"Sans classe";
  const chapter=rows.chapters.find(c=>c.id===item?.chapter_id);
  const chapterLabel=chapter?chapter.subject+" — "+chapter.title:"Chapitre non retrouvé";
  return '<article class="content-item"><strong>'+esc(item?.title||file.filename)+'</strong>'+
    '<p><b>Classe :</b> '+esc(names)+' · <b>Chapitre :</b> '+esc(chapterLabel)+' · <b>Type :</b> '+esc(item?.kind||"PDF")+'</p>'+
    '<div class="content-actions"><button type="button" data-simple-open="'+esc(file.id)+'">Ouvrir</button>'+
    '<button type="button" class="danger" data-simple-delete="'+esc(file.id)+'">Supprimer</button></div></article>';
 }).join("");
 section.innerHTML='<div class="quick-simple-header"><span class="quick-step-icon" aria-hidden="true">📄</span><div>'+
 '<h3>Ajouter un document</h3><p>Classe → type → chapitre → PDF : chaque document reste bien rangé.</p></div></div>'+
 (classes.length?
 '<form id="simple-upload" class="quick-simple-form">'+
 '<div class="quick-step"><label for="simple-class">1. Pour quelle classe ?</label>'+
 '<select id="simple-class" class="quick-class-selector" name="class" required>'+
 opt(classes.map(c=>[c.code,c.code]),classes[0].code)+'</select>'+
 '<button type="button" data-class-manager class="quick-manage-classes">+ Ajouter / retirer une classe</button></div>'+
 '<div class="quick-step"><label for="simple-kind">2. Quel type de document ?</label>'+
 '<select id="simple-kind" name="kind" required>'+opt(kinds,"Cours")+'</select></div>'+
 '<div class="quick-step"><label for="simple-chapter">3. Dans quel chapitre ?</label>'+
 '<select id="simple-chapter" name="chapter" required></select>'+
 '<button type="button" id="simple-new-chapter">+ Ajouter un chapitre</button>'+
 '<div id="simple-chapter-editor" class="quick-new-chapter" hidden>'+
 '<label for="simple-new-subject">Matière</label><select id="simple-new-subject" name="newSubject">'+opt(["Physique","Chimie"],"Physique")+'</select>'+
 '<label for="simple-new-title">Nom du nouveau chapitre</label>'+
 '<input id="simple-new-title" name="newTitle" maxlength="160" type="text" placeholder="Ex. Ondes mécaniques progressives">'+
 '<label for="simple-new-semester">Semestre</label><select id="simple-new-semester" name="newSemester">'+opt([["1","Semestre 1"],["2","Semestre 2"]],"1")+'</select>'+
 '<button type="button" id="simple-save-chapter">Enregistrer ce chapitre</button></div></div>'+
 '<div class="quick-step"><label for="simple-file">4. Choisir votre PDF</label>'+
 '<input id="simple-file" type="file" name="pdf" accept=".pdf,application/pdf" required>'+
 '<span class="quick-file-hint">'+(driveEnabled?"Google Drive connecté par votre accord : fichiers volumineux acceptés selon votre quota Drive.":"Stockage actuel Supabase : maximum 50 Mo.")+'</span></div>'+
 '<details class="quick-optional"><summary>Option facultative : titre</summary>'+
 '<label for="simple-title">Titre personnalisé</label>'+
 '<input id="simple-title" type="text" maxlength="160" name="title" placeholder="Par défaut : nom du PDF"></details>'+
 (driveEnabled?'<button id="connect-google-drive" type="button">'+(drive.isConnected()?'✅ Google Drive connecté':'🔒 Autoriser mon Google Drive (compte '+esc(window.PHYSIX_DRIVE_CONFIG.expectedEmail)+')')+'</button>':'')+
 '<button id="quick-main-upload" type="submit">⬆ Enregistrer le PDF</button></form>':
 '<p>Aucune classe active. Ouvrez « Gestion avancée » → « Mes classes » pour en ajouter une.</p>')+
 '<div id="simple-feedback" class="content-note" role="status" aria-live="polite">🔒 Document privé : non accessible aux élèves actuellement.</div>'+
 '<details class="quick-documents"><summary>Mes PDF ('+attached.length+')</summary><div class="content-items">'+
 (list||'<p>Aucun PDF pour le moment.</p>')+'</div></details>';
 root.append(section);
 const form=section.querySelector("#simple-upload");
 const note=(text,bad=false)=>{const target=section.querySelector("#simple-feedback");if(target){target.textContent=text;target.className="content-note"+(bad?" bad":"")}};
 const connectButton=section.querySelector("#connect-google-drive");
 connectButton?.addEventListener("click",async()=>{
  connectButton.disabled=true;
  try{
   note("Ouverture sécurisée de Google. Choisissez votre compte Drive et le dossier PhysiX.");
   await drive.connect();
   note("Google Drive connecté. Au premier import, choisissez le dossier privé de votre classe.");
   connectButton.textContent="✅ Google Drive connecté";
  }catch(error){note(error.message,true)}
  finally{connectButton.disabled=false}
 });
 const drawChapter=(preferredId="")=>{
  if(!form)return;
  const chosen=classes.find(c=>c.code===form.elements["class"].value);
  const options=rows.chapters.filter(c=>c.level===chosen?.level);
  const select=form.elements.chapter;
  const prior=preferredId||select.value;
  const validChoice=options.some(c=>c.id===prior)?prior:"";
  select.innerHTML='<option value="" disabled'+(!validChoice?' selected':'')+'>Choisissez le chapitre…</option>'+
   opt(options.map(c=>[c.id,c.subject+" — "+c.title]),validChoice);
  if(validChoice)select.value=validChoice;
  const editor=section.querySelector("#simple-chapter-editor");
  if(editor)editor.hidden=true;
 };
 form?.elements["class"].addEventListener("change",()=>drawChapter(""));
 drawChapter();
 const editor=section.querySelector("#simple-chapter-editor");
 section.querySelector("#simple-new-chapter")?.addEventListener("click",()=>{
  editor.hidden=!editor.hidden;
  if(!editor.hidden)form.elements.newTitle.focus();
 });
 section.querySelector("#simple-save-chapter")?.addEventListener("click",async()=>{
  if(busy)return;
  const chosen=classes.find(c=>c.code===form.elements["class"].value);
  const title=form.elements.newTitle.value.trim().replace(/\\s+/g," ");
  const subject=form.elements.newSubject.value;
  const semester=Number(form.elements.newSemester.value);
  if(!chosen||title.length<2||title.length>160||!["Physique","Chimie"].includes(subject)||![1,2].includes(semester)){
   note("Indiquez un nom de chapitre valide et sa matière.",true);return;
  }
  const existing=rows.chapters.find(c=>c.level===chosen.level&&c.subject===subject&&c.title.toLowerCase()===title.toLowerCase());
  if(existing){drawChapter(existing.id);note("Ce chapitre existe déjà : il a été sélectionné.");return}
  busy=true;
  const button=section.querySelector("#simple-save-chapter");button.disabled=true;
  try{
   const created=await rest("chapters","","POST",{owner_id:session.ownerId,level:chosen.level,subject,title,
    semester,sort_order:rows.chapters.length+1,state:"draft",description:""});
   if(!Array.isArray(created)||created.length!==1)throw Error("Création du chapitre non confirmée.");
   rows.chapters.push(created[0]);
   drawChapter(created[0].id);
   form.elements.newTitle.value="";
   note("Chapitre « "+title+" » ajouté et sélectionné. Vous pouvez maintenant choisir votre PDF.");
  }catch(error){note(error.message,true)}
  finally{busy=false;button.disabled=false}
 });
 let busy=false;
 form?.addEventListener("submit",async event=>{
  event.preventDefault();if(busy)return;
  const classroom=classes.find(c=>c.code===form.elements["class"].value);
  const kind=form.elements.kind.value,file=form.elements.pdf.files?.[0];
  const chosenChapterId=form.elements.chapter.value;
  const chapter=rows.chapters.find(c=>c.id===chosenChapterId);
  if(!classroom||!kinds.includes(kind)||!file||!chapter||chapter.level!==classroom.level)
   return note("Sélectionnez la classe, le type, le chapitre et le PDF.",true);
  if(!/\.pdf$/i.test(file.name)||file.size<=0||(!driveEnabled&&file.size>MAX_BYTES)||(file.type&&file.type!=="application/pdf")){
   return note(driveEnabled?"PDF invalide. Vérifiez l'extension, le contenu et la taille disponible dans Drive.":"PDF invalide ou trop grand pour Supabase (50 Mo maximum).",true);
  }
  if(await file.slice(0,5).text()!=="%PDF-")return note("Le fichier sélectionné n'est pas un PDF valide.",true);
  const title=(form.elements.title.value.trim()||file.name.replace(/\.pdf$/i,"")).slice(0,160);
  if(!title)return note("Le PDF doit avoir un titre.",true);
  // Classement explicite obligatoire : aucun chapitre générique automatique.
  busy=true;form.querySelector("button[type=submit]").disabled=true;
  let resource=null,uploadedPath=null,driveFileId=null,createdFile=false;
  note("Enregistrement du PDF privé en cours…");
  try{
   if(driveEnabled&&!drive.isConnected())throw Error("Cliquez sur « Autoriser mon Google Drive » avant d'enregistrer le PDF.");
   if(driveEnabled)await drive.selectRootFolder(classroom.code);
   const result=await rest("resources","","POST",{owner_id:session.ownerId,chapter_id:chapter.id,title,kind,
    target_classes:[classroom.code],visibility:"private",state:"draft",sort_order:rows.resources.length});
   if(!Array.isArray(result)||result.length!==1)throw Error("Création de la fiche PDF refusée.");
   resource=result[0];
   if(driveEnabled){
    const uploaded=await drive.uploadPdf(file,{classCode:classroom.code,onProgress:pct=>note("Transfert privé Google Drive : "+pct+" %")});
    driveFileId=uploaded.id;uploadedPath="gdrive:"+driveFileId;
   }else{
    uploadedPath=session.ownerId+"/resource/"+resource.id+"/"+crypto.randomUUID()+".pdf";
    await objectRequest(session,uploadedPath,"POST",file);
   }
   const meta=await rest("files","","POST",{owner_id:session.ownerId,resource_id:resource.id,
     devoir_id:null,file_role:"content",storage_path:uploadedPath,
     storage_provider:driveEnabled?"google_drive":"supabase",drive_file_id:driveFileId,
     filename:file.name.slice(0,200),mime_type:"application/pdf",file_size:file.size});
   if(!Array.isArray(meta)||meta.length!==1)throw Error("Le stockage a réussi mais la fiche PDF n'est pas enregistrée.");
   createdFile=true;
   await refresh();
   alertText("PDF enregistré dans votre espace privé : "+classroom.code+" · "+kind+".");
  }catch(error){
   if(createdFile)note("Le PDF est enregistré, mais la page n'a pas pu s'actualiser. Reconnectez-vous pour le retrouver.",true);
   else{
    let cleanupFailed=false;
    if(driveFileId){try{await drive.removePdf(driveFileId)}catch{cleanupFailed=true}}
    else if(uploadedPath&&!uploadedPath.startsWith("gdrive:")){
     try{await objectRequest(session,uploadedPath,"DELETE")}catch{cleanupFailed=true}
    }
    if(resource&&!cleanupFailed){try{await rest("resources","?id=eq."+encodeURIComponent(resource.id),"DELETE")}catch{cleanupFailed=true}}
    note(error.message+(cleanupFailed?" Vérifiez le stockage privé avant de réessayer.":""),true);
   }
  }finally{busy=false;const btn=form.querySelector("button[type=submit]");if(btn)btn.disabled=false}
 });
 section.querySelectorAll("[data-simple-open]").forEach(button=>button.addEventListener("click",async()=>{
  const doc=attached.find(f=>f.id===button.dataset.simpleOpen);if(!doc)return;
  if(doc.storage_provider==="google_drive"){
   try{drive.openPdf(doc.drive_file_id)}catch(error){note(error.message,true)}
   return;
  }
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
  if(!doc||busy||!confirm(doc.storage_provider==="google_drive"?"Mettre ce PDF dans la corbeille Google Drive ?":"Supprimer définitivement ce document PDF ?"))return;
  busy=true;button.disabled=true;
  try{
   if(doc.storage_provider==="google_drive"){
    if(!drive?.isConnected())throw Error("Reconnectez Google Drive pour supprimer ce fichier.");
    await drive.removePdf(doc.drive_file_id);
   }else await objectRequest(session,doc.storage_path,"DELETE");
   const deleted=await rest("files","?id=eq."+encodeURIComponent(doc.id),"DELETE");
   if(!Array.isArray(deleted)||deleted.length!==1)throw Error("Le PDF est supprimé mais sa fiche reste. Actualisez la page.");
   await refresh();alertText("PDF supprimé.");
  }catch(error){note(error.message,true)}
  finally{busy=false;button.disabled=false}
 }));
};
})();
