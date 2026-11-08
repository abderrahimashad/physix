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
 const attached=rows.files.filter(x=>x.resource_id||x.devoir_id);
 const drive=window.physixDrive;
 const driveEnabled=drive?.configured()===true;
 if(driveEnabled)drive.prepare().catch(()=>{});
 const section=document.createElement("section");
 section.className="content-section quick-primary-pdf";
 section.id="quick-pdf-section";
 const groups=new Map();
 for(const file of attached){
  const item=rows.resources.find(r=>r.id===file.resource_id);
  const devoir=rows.devoirs.find(d=>d.id===file.devoir_id);
  const chapter=rows.chapters.find(c=>c.id===item?.chapter_id);
  const isDevoir=!!file.devoir_id;
  const className=isDevoir?(devoir?.target_class||"Classe historique non attribuée"):((item?.target_classes||[]).join(", ")||"Sans classe");
  const category=isDevoir?("Devoirs surveillés — Semestre "+(devoir?.semester||"?")):
    ((chapter?.subject||"Matière ?")+" — "+(chapter?.title||"Chapitre inconnu"));
  const groupKey=className+" / "+category;
  const card='<article class="content-item"><strong>'+esc(devoir?.title||item?.title||file.filename)+'</strong>'+
   '<p>'+esc(isDevoir?"Devoir N° "+(devoir?.devoir_number||"?"):(item?.kind||"PDF"))+' · '+esc(file.filename)+'</p>'+
   '<div class="content-actions"><button type="button" data-simple-open="'+esc(file.id)+'">Ouvrir</button>'+
   '<button type="button" class="danger" data-simple-delete="'+esc(file.id)+'">Supprimer</button></div></article>';
  if(!groups.has(groupKey))groups.set(groupKey,[]);
  groups.get(groupKey).push(card);
 }
 const list=[...groups.entries()].sort(([a],[b])=>a.localeCompare(b,"fr")).map(([heading,cards])=>
  '<div class="quick-chapter-group"><h4 class="quick-chapter-heading">'+esc(heading)+'</h4><div class="content-items">'+cards.join("")+'</div></div>'
 ).join("");
 section.innerHTML='<div class="quick-simple-header"><span class="quick-step-icon" aria-hidden="true">📄</span><div>'+
 '<h3>Ajouter un document</h3><p>Choisissez la classe, puis un chapitre pour les cours ou un semestre pour les devoirs.</p></div></div>'+
 (classes.length?
 '<form id="simple-upload" class="quick-simple-form">'+
 '<div class="quick-step"><label for="simple-class">1. Pour quelle classe ?</label>'+
 '<select id="simple-class" class="quick-class-selector" name="class" required>'+
 opt(classes.map(c=>[c.code,c.code]),classes[0].code)+'</select>'+
 '<fieldset class="quick-class-fieldset" id="simple-target-fieldset"><legend>Partager avec quelles classes ?</legend><div class="quick-class-options" id="simple-target-classes"></div><p class="quick-file-hint">Un seul PDF pour G1, G2 et G3. Les devoirs surveillés restent individuels par classe.</p></fieldset>'+
 '<button type="button" data-class-manager class="quick-manage-classes">+ Ajouter / retirer une classe</button></div>'+
 '<div id="simple-chapter-zone" class="quick-step"><label for="simple-chapter">2. Chapitre (pour cours, séries, exercices…)</label>'+
 '<select id="simple-chapter" name="chapter" required></select>'+
 '<button type="button" id="simple-new-chapter">+ Ajouter un chapitre</button>'+
 '<div id="simple-chapter-editor" class="quick-new-chapter" hidden>'+
 '<label for="simple-new-subject">Matière</label><select id="simple-new-subject" name="newSubject">'+opt(["Physique","Chimie"],"Physique")+'</select>'+
 '<label for="simple-new-title">Nom du nouveau chapitre</label>'+
 '<input id="simple-new-title" name="newTitle" maxlength="160" type="text" placeholder="Ex. Ondes mécaniques progressives">'+
 '<label for="simple-new-semester">Semestre</label><select id="simple-new-semester" name="newSemester">'+opt([["1","Semestre 1"],["2","Semestre 2"]],"1")+'</select>'+
 '<button type="button" id="simple-save-chapter">Enregistrer ce chapitre</button></div></div>'+
 '<div class="quick-step"><label for="simple-kind">3. Type de document</label>'+
 '<select id="simple-kind" name="kind" required>'+opt(kinds,"Cours")+'</select></div>'+
 '<div id="simple-devoir-zone" class="quick-step" hidden>'+
 '<label for="simple-devoir-semester">2. Semestre du devoir</label><select id="simple-devoir-semester" name="devoirSemester">'+
 opt([["1","Semestre 1"],["2","Semestre 2"]],"1")+'</select>'+
 '<label for="simple-devoir-subject">Matière du devoir</label><select id="simple-devoir-subject" name="devoirSubject">'+opt(["Physique","Chimie"],"Physique")+'</select>'+
 '<label for="simple-devoir-number">Numéro du devoir</label><input id="simple-devoir-number" type="number" name="devoirNumber" min="1" max="30" value="1" required>'+
 '<label for="simple-devoir-duration">Durée (en minutes)</label><input id="simple-devoir-duration" type="number" name="devoirDuration" min="1" max="600" value="60" required>'+
 '</div>'+
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
 '<details class="quick-documents"><summary>Mes PDF ('+attached.length+')</summary>'+
 (list||'<p>Aucun PDF pour le moment.</p>')+'</details>';
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
 const updateTargets=()=>{
  if(!form)return;
  const primary=classes.find(c=>c.code===form.elements["class"].value);
  const peers=classes.filter(c=>c.level===primary?.level);
  const host=section.querySelector("#simple-target-classes");
  const prior=[...host.querySelectorAll("input:checked")].map(input=>input.value);
  const targets=prior.length?prior.filter(code=>peers.some(c=>c.code===code)):peers.map(c=>c.code);
  if(primary&&!targets.includes(primary.code))targets.push(primary.code);
  host.innerHTML=peers.map(c=>'<label class="quick-class-chip"><input type="checkbox" name="target_class" value="'+
   esc(c.code)+'"'+(targets.includes(c.code)?' checked':'')+(c.code===primary?.code?' disabled':'')+
   '><span>'+esc(c.code)+'</span></label>').join("");
 };
 updateTargets();
 const drawChapter=(preferredId="")=>{
  if(!form)return;
  const chosen=classes.find(c=>c.code===form.elements["class"].value);
  const options=rows.chapters.filter(c=>c.level===chosen?.level&&c.target_class===chosen.code);
  const select=form.elements.chapter;
  const prior=preferredId||select.value;
  const validChoice=options.some(c=>c.id===prior)?prior:"";
  select.innerHTML='<option value="" disabled'+(!validChoice?' selected':'')+'>Choisissez le chapitre…</option>'+
   opt(options.map(c=>[c.id,c.subject+" — "+c.title]),validChoice);
  if(validChoice)select.value=validChoice;
  const editor=section.querySelector("#simple-chapter-editor");
  if(editor)editor.hidden=true;
 };
 form?.elements["class"].addEventListener("change",()=>{updateTargets();drawChapter("")});
 const toggleKind=()=>{
  if(!form)return;
  const isDevoir=form.elements.kind.value==="Devoir surveillé";
  section.querySelector("#simple-chapter-zone").hidden=isDevoir;
  section.querySelector("#simple-devoir-zone").hidden=!isDevoir;
  section.querySelector("#simple-target-fieldset").hidden=isDevoir;
  form.elements.chapter.required=!isDevoir;
  for(const name of ["devoirSemester","devoirSubject","devoirNumber","devoirDuration"])
   form.elements[name].disabled=!isDevoir;
 };
 form?.elements.kind.addEventListener("change",toggleKind);
 drawChapter();toggleKind();
 const editor=section.querySelector("#simple-chapter-editor");
 section.querySelector("#simple-new-chapter")?.addEventListener("click",()=>{
  editor.hidden=!editor.hidden;
  if(!editor.hidden)form.elements.newTitle.focus();
 });
 section.querySelector("#simple-save-chapter")?.addEventListener("click",async()=>{
  if(busy)return;
  const chosen=classes.find(c=>c.code===form.elements["class"].value);
  const title=form.elements.newTitle.value.trim().replace(/\s+/g," ");
  const subject=form.elements.newSubject.value;
  const semester=Number(form.elements.newSemester.value);
  if(!chosen||title.length<2||title.length>160||!["Physique","Chimie"].includes(subject)||![1,2].includes(semester)){
   note("Indiquez un nom de chapitre valide et sa matière.",true);return;
  }
  const existing=rows.chapters.find(c=>c.level===chosen.level&&c.target_class===chosen.code&&c.subject===subject&&c.title.toLowerCase()===title.toLowerCase());
  if(existing){drawChapter(existing.id);note("Ce chapitre existe déjà : il a été sélectionné.");return}
  busy=true;
  const button=section.querySelector("#simple-save-chapter");button.disabled=true;
  try{
   const created=await rest("chapters","","POST",{owner_id:session.ownerId,level:chosen.level,subject,title,
    semester,target_class:chosen.code,sort_order:rows.chapters.length+1,state:"draft",description:""});
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
  const target_classes=[...section.querySelectorAll('#simple-target-classes input:checked, #simple-target-classes input:disabled')].map(x=>x.value);
  if(!target_classes.length||target_classes.some(code=>!classes.some(c=>c.code===code&&c.level===classroom?.level)))
   return note("Choisissez au moins une classe du même niveau.",true);
  const isDevoir=kind==="Devoir surveillé";
  const chosenChapterId=form.elements.chapter.value;
  const chapter=rows.chapters.find(c=>c.id===chosenChapterId);
  if(!classroom||!kinds.includes(kind)||!file)
   return note("Choisissez la classe, le type et le PDF.",true);
  if(!isDevoir&&(!chapter||chapter.level!==classroom.level||chapter.target_class!==classroom.code))
   return note("Choisissez ou créez d'abord un chapitre pour cette classe.",true);
  const semestre=Number(form.elements.devoirSemester.value);
  const number=Number(form.elements.devoirNumber.value);
  const duration=Number(form.elements.devoirDuration.value);
  const devoirSubject=form.elements.devoirSubject.value;
  if(isDevoir&&(![1,2].includes(semestre)||!Number.isInteger(number)||number<1||number>30||
   !Number.isInteger(duration)||duration<1||duration>600||!["Physique","Chimie"].includes(devoirSubject)))
   return note("Vérifiez le semestre, la matière et le numéro du devoir.",true);
  if(!/\.pdf$/i.test(file.name)||file.size<=0||(!driveEnabled&&file.size>MAX_BYTES)||(file.type&&file.type!=="application/pdf")){
   return note(driveEnabled?"PDF invalide. Vérifiez l'extension, le contenu et la taille disponible dans Drive.":"PDF invalide ou trop grand pour Supabase (50 Mo maximum).",true);
  }
  if(await file.slice(0,5).text()!=="%PDF-")return note("Le fichier sélectionné n'est pas un PDF valide.",true);
  const title=(form.elements.title.value.trim()||file.name.replace(/\.pdf$/i,"")).slice(0,160);
  if(!title)return note("Le PDF doit avoir un titre.",true);
  // Classement explicite obligatoire : aucun chapitre générique automatique.
  busy=true;form.querySelector("button[type=submit]").disabled=true;
  let resource=null,devoir=null,uploadedPath=null,driveFileId=null,createdFile=false;
  note("Enregistrement du PDF privé en cours…");
  try{
   if(driveEnabled&&!drive.isConnected())throw Error("Cliquez sur « Autoriser mon Google Drive » avant d'enregistrer le PDF.");
   if(driveEnabled)await drive.selectRootFolder(classroom.code);
   if(isDevoir){
    const created=await rest("devoirs","","POST",{owner_id:session.ownerId,level:classroom.level,
     target_class:classroom.code,subject:devoirSubject,semester:semestre,
     devoir_number:number,title,duration_minutes:duration,state:"draft",correction_state:"hidden"});
    if(!Array.isArray(created)||created.length!==1)throw Error("Le devoir n'a pas pu être créé.");
    devoir=created[0];
   }else{
    const created=await rest("resources","","POST",{owner_id:session.ownerId,chapter_id:chapter.id,title,kind,
     target_classes,visibility:"private",state:"draft",sort_order:rows.resources.length});
    if(!Array.isArray(created)||created.length!==1)throw Error("La fiche du document n'a pas pu être créée.");
    resource=created[0];
   }
   if(driveEnabled){
    const uploaded=await drive.uploadPdf(file,{classCode:classroom.code,onProgress:pct=>note("Transfert privé Google Drive : "+pct+" %")});
    driveFileId=uploaded.id;uploadedPath="gdrive:"+driveFileId;
   }else{
    uploadedPath=session.ownerId+"/"+(isDevoir?"devoir/"+devoir.id:"resource/"+resource.id)+"/"+crypto.randomUUID()+".pdf";
    await objectRequest(session,uploadedPath,"POST",file);
   }
   const meta=await rest("files","","POST",{owner_id:session.ownerId,resource_id:resource?.id||null,
     devoir_id:devoir?.id||null,file_role:isDevoir?"subject":"content",storage_path:uploadedPath,
     storage_provider:driveEnabled?"google_drive":"supabase",drive_file_id:driveFileId,
     filename:file.name.slice(0,200),mime_type:"application/pdf",file_size:file.size});
   if(!Array.isArray(meta)||meta.length!==1)throw Error("Le stockage a réussi mais la fiche PDF n'est pas enregistrée.");
   createdFile=true;
   let qcmSummary="";
   if(!isDevoir&&["Cours","Résumé"].includes(kind)&&typeof window.physixQcmGenerateFromPdf==="function"){
    try{
     const generated=await window.physixQcmGenerateFromPdf({
      file,chapterId:chapter.id,classCode:classroom.code,session,onStatus:note
     });
     qcmSummary=generated.created===15?
      " ✅ Claude a préparé 10 questions de cours et 5 exercices d’application en brouillon. Vérifiez-les dans QCM par chapitre.":
      " ℹ️ "+(generated.message||"Un QCM existe déjà pour ce chapitre.");
    }catch(qcmError){
     qcmSummary=" ⚠️ QCM non généré : "+qcmError.message+
      " Le PDF est bien sauvegardé, vous pourrez réessayer après configuration de Claude.";
    }
   }
   await refresh();
   alertText("PDF enregistré : "+(isDevoir?classroom.code:target_classes.join(", "))+" · "+(isDevoir?"Devoir surveillé / Semestre "+semestre:chapter.title+" / "+kind)+"."+qcmSummary);
  }catch(error){
   if(createdFile)note("Le PDF est enregistré, mais la page n'a pas pu s'actualiser. Reconnectez-vous pour le retrouver.",true);
   else{
    let cleanupFailed=false;
    if(driveFileId){try{await drive.removePdf(driveFileId)}catch{cleanupFailed=true}}
    else if(uploadedPath&&!uploadedPath.startsWith("gdrive:")){
     try{await objectRequest(session,uploadedPath,"DELETE")}catch{cleanupFailed=true}
    }
    if(resource&&!cleanupFailed){try{await rest("resources","?id=eq."+encodeURIComponent(resource.id),"DELETE")}catch{cleanupFailed=true}}
    if(devoir&&!cleanupFailed){try{await rest("devoirs","?id=eq."+encodeURIComponent(devoir.id),"DELETE")}catch{cleanupFailed=true}}
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
