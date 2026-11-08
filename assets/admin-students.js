/* PhysiX: teacher-invited student access and explicitly published private PDFs. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const FILE_BUCKET="physix-private",MAX=50*1024*1024;
const safe=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const enc=p=>p.split("/").map(encodeURIComponent).join("/");
function request(session,path,{method="GET",body,file}={}){
 const headers={"apikey":KEY,"Authorization":"Bearer "+session.token};
 if(body!==undefined)headers["Content-Type"]="application/json";
 if(file)headers["Content-Type"]="application/pdf";
 return fetch(BASE+path,{method,headers,body:file||(body===undefined?undefined:JSON.stringify(body)),
  cache:"no-store",referrerPolicy:"no-referrer"}).then(async response=>{
  if(!response.ok){const e=await response.json().catch(()=>({}));throw Error(e.message||e.error||"Opération refusée ("+response.status+").")}
  return response.status===204?[]:response.json().catch(()=>[]);
 });
}
window.physixStudentAdminRender=async(root,{rows,session,rest,refresh})=>{
 const section=document.createElement("section");section.className="content-section student-admin-section";
 section.innerHTML='<h3>Accès élèves et publication des documents</h3>'+
 '<p>Par défaut, aucun fichier n’est visible aux élèves. L’inscription se fait avec un code d’activation individuel généré dans « Suivi des élèves », puis vérification e-mail/SMS, mot de passe et photo obligatoire. Publiez explicitement chaque PDF.</p>'+
 '<div class="student-admin-grid"><form id="student-allow-form"><h4>Invitations e-mail (anciens comptes)</h4>'+
 '<label>Adresse e-mail de l’élève<input name="email" type="email" maxlength="254" required placeholder="eleve@exemple.com" autocomplete="off"></label>'+
 '<label>Classe<select name="class" required></select></label>'+
 '<button type="submit">Autoriser cette adresse</button></form>'+
 '<div><h4>Invitations e-mail enregistrées</h4><div id="students-list">Chargement…</div></div></div>'+
 '<h4>Publier un PDF pour mes élèves</h4><p class="student-admin-help">Choisissez le fichier et sa classe. Pour les PDF Google Drive, une copie de lecture privée (50 Mo max.) est créée sur Supabase; le fichier Google original reste privé.</p>'+
 '<div id="student-docs-list">Chargement…</div>'+
 '<div id="student-admin-status" class="content-note" role="status" aria-live="polite"></div>';
 root.append(section);
 const $=selector=>section.querySelector(selector);
 const status=(message,bad=false)=>{const e=$("#student-admin-status");e.textContent=message;e.classList.toggle("bad",bad)};
 const classes=(rows.classes||[]).filter(x=>x.active);
 $("#student-allow-form").elements["class"].innerHTML=classes.map(c=>
  '<option value="'+safe(c.code)+'">'+safe(c.code)+'</option>').join("");
 const api=(table,query="",opts={})=>request(session,"/rest/v1/physix_student_"+table+query,opts);
 let access=[],publications=[],pending=false;
 async function reload(){
  [access,publications]=await Promise.all([api("access","?select=*&order=created_at.desc"),
   api("publications","?select=*&order=created_at.desc")]);
  draw();
 }
 function label(f){
  const resource=rows.resources.find(x=>x.id===f.resource_id);
  const chapter=rows.chapters.find(x=>x.id===resource?.chapter_id);
  const devoir=rows.devoirs.find(x=>x.id===f.devoir_id);
  const classCodes=devoir?[devoir.target_class].filter(Boolean):(resource?.target_classes||[]);
  return {resource,chapter,devoir,classCodes,title:resource?.title||devoir?.title||f.filename,
   kind:resource?.kind||"Devoir surveillé"};
 }
 function draw(){
  $("#students-list").innerHTML=access.length?access.map(x=>
   '<div class="student-admin-entry"><span>'+safe(x.email)+'<small>'+safe(x.class_code)+'</small></span>'+
   '<button type="button" data-access="'+safe(x.id)+'">'+(x.enabled?"Révoquer":"Réactiver")+'</button></div>').join(""):
   '<p>Aucune adresse autorisée.</p>';
  $("#student-docs-list").innerHTML=rows.files.length?rows.files.map(f=>{
   const d=label(f);if(!d.classCodes.length)return "";
   const allPublished=d.classCodes.every(code=>publications.some(p=>p.file_id===f.id&&p.class_code===code&&p.enabled));
   const batchButton=d.classCodes.length>1&&!allPublished?
    '<div class="student-admin-entry"><span><b>'+safe(d.title)+'</b><small>'+safe(d.classCodes.join(" · "))+'</small></span>'+
    '<button type="button" class="student-publish-all" data-publish-all="'+safe(f.id)+'">Publier aux '+d.classCodes.length+' classes</button></div>':"";
   return batchButton+d.classCodes.map(code=>{
    const pub=publications.find(x=>x.file_id===f.id&&x.class_code===code);
    return '<div class="student-admin-entry"><span><b>'+safe(d.title)+'</b><small>'+
      safe(code)+' · '+safe(d.kind)+' · '+safe(f.filename)+(d.devoir?" · Semestre "+d.devoir.semester:"")+
      '</small><small>'+safe(pub?.enabled?"✅ Publié pour les élèves":"🔒 Non publié")+'</small></span>'+
      '<button type="button" data-publish="'+safe(f.id)+'" data-code="'+safe(code)+'">'+
      (pub?.enabled?"Masquer":"Publier")+'</button></div>';
   }).join("");
  }).join(""):'<p>Aucun PDF à publier.</p>';
  section.querySelectorAll("[data-access]").forEach(b=>b.addEventListener("click",async()=>{
   if(pending)return;
   const entry=access.find(x=>x.id===b.dataset.access);if(!entry)return;
   const next=!entry.enabled;
   if(!confirm(next?"Réactiver cet accès ?":"Révoquer l'accès de cet élève ?"))return;
   pending=true;b.disabled=true;
   try{await api("access","?id=eq."+encodeURIComponent(entry.id),{method:"PATCH",body:{enabled:next}});
    status(next?"Adresse réactivée.":"Accès révoqué.");await reload()}
   catch(e){status(e.message,true)}finally{pending=false;b.disabled=false}
  }));
  async function publishForClass(f,code){
   const info=label(f);
   if(!info.classCodes.includes(code))throw Error("Classe du document invalide.");
   const existing=publications.find(x=>x.file_id===f.id&&x.class_code===code);
   if(existing?.enabled)return false;
   if(info.devoir){
    if(f.file_role==="correction"&&info.devoir.correction_state!=="authorized")
     throw Error("Autorisez d'abord la correction du devoir.");
    if(info.devoir.state!=="published")
     await rest("devoirs","?id=eq."+encodeURIComponent(info.devoir.id),"PATCH",{state:"published"});
   }else{
    if(info.chapter?.state!=="published")
     await rest("chapters","?id=eq."+encodeURIComponent(info.chapter.id),"PATCH",{state:"published"});
    if(info.resource?.state!=="published")
     await rest("resources","?id=eq."+encodeURIComponent(info.resource.id),"PATCH",{state:"published"});
   }
   let path=f.storage_path;
   if(f.storage_provider==="google_drive"&&!existing){
    if(f.file_size>MAX)throw Error("Ce PDF dépasse la limite privée de publication de 50 Mo.");
    const drive=window.physixDrive;
    if(!drive?.isConnected())throw Error("Connectez Google Drive pour publier ce PDF.");
    status("Copie privée Google Drive en cours pour "+code+"…");
    const blob=await drive.downloadPdf(f.drive_file_id,code);
    path=session.ownerId+"/"+(f.resource_id?"resource/"+f.resource_id:"devoir/"+f.devoir_id)+
     "/"+crypto.randomUUID()+".pdf";
    await request(session,"/storage/v1/object/"+FILE_BUCKET+"/"+enc(path),{method:"POST",file:blob});
    try{await api("publications","?select=*",{method:"POST",body:{
     owner_id:session.ownerId,file_id:f.id,class_code:code,storage_path:path,enabled:true
    }})}catch(err){
     await request(session,"/storage/v1/object/"+FILE_BUCKET+"/"+enc(path),{method:"DELETE"}).catch(()=>{});
     throw err;
    }
   }else if(existing){
    await api("publications","?id=eq."+encodeURIComponent(existing.id),{method:"PATCH",body:{enabled:true}});
   }else{
    await api("publications","?select=*",{method:"POST",body:{
     owner_id:session.ownerId,file_id:f.id,class_code:code,storage_path:path,enabled:true
    }});
   }
   return true;
  }
  section.querySelectorAll("[data-publish]").forEach(b=>b.addEventListener("click",async()=>{
   if(pending)return;
   const f=rows.files.find(x=>x.id===b.dataset.publish),code=b.dataset.code;
   if(!f)return;
   const existing=publications.find(x=>x.file_id===f.id&&x.class_code===code);
   const show=!existing?.enabled;
   if(!confirm(show?"Publier ce PDF pour "+code+" ?":"Masquer ce PDF aux élèves de "+code+" ?"))return;
   pending=true;b.disabled=true;
   try{
    if(show)await publishForClass(f,code);
    else await api("publications","?id=eq."+encodeURIComponent(existing.id),{
     method:"PATCH",body:{enabled:false}});
    status(show?"PDF publié pour "+code+".":"PDF masqué pour "+code+".");
    await refresh();
   }catch(e){status(e.message,true);await reload().catch(()=>{})}
   finally{pending=false;b.disabled=false}
  }));
  section.querySelectorAll("[data-publish-all]").forEach(b=>b.addEventListener("click",async()=>{
   if(pending)return;
   const f=rows.files.find(x=>x.id===b.dataset.publishAll);
   if(!f)return;
   const classes=label(f).classCodes;
   if(!confirm("Publier ce même PDF pour "+classes.join(", ")+" ?"))return;
   pending=true;b.disabled=true;let count=0,failed="";
   try{
    for(const code of classes){
     try{if(await publishForClass(f,code))count++}
     catch(error){failed=code+" : "+error.message;break}
    }
    status(failed?"Publication partielle ("+count+" classe(s)). "+failed:
     "PDF publié pour "+classes.join(", ")+".",!!failed);
    await refresh();
   }catch(error){status(error.message,true);await reload().catch(()=>{})}
   finally{pending=false;b.disabled=false}
  }));
 }
 $("#student-allow-form").addEventListener("submit",async event=>{
  event.preventDefault();if(pending)return;
  const form=event.currentTarget;
  const email=form.elements.email.value.trim().toLowerCase(),classCode=form.elements["class"].value;
  if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254||!classes.some(x=>x.code===classCode))
   return status("Adresse ou classe invalide.",true);
  pending=true;form.querySelector("button").disabled=true;
  try{
   const old=access.find(x=>x.email===email&&x.class_code===classCode);
   if(old)await api("access","?id=eq."+encodeURIComponent(old.id),{method:"PATCH",body:{enabled:true}});
   else await api("access","?select=*",{method:"POST",body:{owner_id:session.ownerId,email,class_code:classCode,enabled:true}});
   form.elements.email.value="";status("Adresse autorisée. Donnez-lui un code d’activation depuis « Suivi des élèves ». L’e-mail invité seul ne donne pas accès.");
   await reload();
  }catch(e){status(e.message,true)}finally{pending=false;form.querySelector("button").disabled=false}
 });
 try{await reload()}catch(e){status("Module élèves indisponible : "+e.message,true)}
};
})();