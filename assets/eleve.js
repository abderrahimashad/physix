/* PhysiX — student access: teacher whitelist, short-lived in-memory session, owner-published PDFs only. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const el=id=>document.getElementById(id);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let token=null,email="",userId="",items=[],myProgress=[],classBoard=[],activeClass="",tab="lesson",busy=false;
const notice=(message,error=false)=>{el("status").textContent=message;el("status").classList.toggle("error",error)};
async function request(path,{method="GET",body,auth=false,blob=false}={}){
 const headers={"apikey":KEY};
 if(auth){if(!token)throw Error("Session terminée, reconnectez-vous.");headers.Authorization="Bearer "+token}
 if(body!==undefined)headers["Content-Type"]="application/json";
 const response=await fetch(BASE+path,{method,headers,body:body===undefined?undefined:JSON.stringify(body),cache:"no-store",referrerPolicy:"no-referrer"});
 if(!response.ok){
  const detail=await response.json().catch(()=>({}));
  throw Error(detail.msg||detail.message||detail.error_description||"Erreur de connexion ("+response.status+").");
 }
 return blob?response.blob():response.json().catch(()=>({}));
}
function setAuthenticated(value){el("login-panel").hidden=value;el("library-panel").hidden=!value;el("logout").hidden=!value}
async function loadLibrary(){
 const [result,progress,board]=await Promise.all([
  request("/rest/v1/rpc/physix_my_student_library",{method:"POST",body:{},auth:true}),
  request("/rest/v1/rpc/physix_student_my_progress",{method:"POST",body:{},auth:true}),
  request("/rest/v1/rpc/physix_student_my_class_board",{method:"POST",body:{},auth:true})
 ]);
 items=Array.isArray(result)?result:[];
 myProgress=Array.isArray(progress)?progress:[];
 classBoard=Array.isArray(board)?board:[];
 const classes=[...new Set([...items.map(x=>x.class_code),...myProgress.map(p=>p.class_code),...classBoard.map(b=>b.class_code)])].sort();
 activeClass=classes.includes(activeClass)?activeClass:(classes[0]||"");
 el("class-filter").innerHTML=classes.map(c=>'<option value="'+escape(c)+'">'+escape(c)+'</option>').join("");
 el("class-filter").value=activeClass;el("class-filter").disabled=classes.length<2;
 setAuthenticated(true);
 notice(classes.length?"Connexion vérifiée. Votre espace de classe est disponible.":"Connexion réussie. Aucun accès de classe n’est encore autorisé.");
 draw();
}
function draw(){
 window.physixStudentExtras?.render({profiles:myProgress,board:classBoard,activeClass,escape});
 window.physixStudentRemises?.render({token,activeClass});
 window.physixStudentQcm?.render({token,activeClass});
 const collection=items.filter(x=>x.class_code===activeClass&&(tab==="devoir" ? x.category==="Devoir surveillé" : x.category!=="Devoir surveillé"));
 const groups=new Map();
 for(const x of collection){
  const title=tab==="devoir"?"Semestre "+(x.semester||"?"):(x.chapter_title||"Chapitre non renseigné");
  if(!groups.has(title))groups.set(title,[]);
  groups.get(title).push(x);
 }
 el("lessons-tab").classList.toggle("active",tab==="lesson");el("devoirs-tab").classList.toggle("active",tab==="devoir");
 el("lessons-tab").setAttribute("aria-pressed",String(tab==="lesson"));el("devoirs-tab").setAttribute("aria-pressed",String(tab==="devoir"));
 el("library").innerHTML=groups.size?[...groups.entries()].map(([title,documents])=>
  '<section class="group"><h3>'+escape(title)+'</h3>'+documents.map(x=>
   '<article class="doc"><div><strong>'+escape(x.title||x.filename)+'</strong><small>'+escape(x.category)+
   (x.devoir_number?' · Devoir N°'+escape(x.devoir_number):'')+
   (x.file_role==="correction"?' · Corrigé':'')+' · '+escape(x.filename)+'</small></div>'+
   '<button type="button" data-open="'+escape(x.publication_id)+'">Ouvrir PDF</button></article>').join("")+'</section>').join(""):
   '<div class="empty">Aucun document publié dans cette rubrique pour le moment.</div>';
 el("library").querySelectorAll("[data-open]").forEach(button=>button.addEventListener("click",()=>openPdf(button)));
}
async function openPdf(button){
 const doc=items.find(x=>x.publication_id===button.dataset.open);
 if(!doc||busy)return;
 const win=window.open("","_blank");
 if(!win){notice("Autorisez les nouveaux onglets pour lire le PDF.",true);return}
 busy=true;button.disabled=true;
 try{
  const path=doc.storage_path.split("/").map(encodeURIComponent).join("/");
  const pdf=await request("/storage/v1/object/authenticated/physix-private/"+path,{auth:true,blob:true});
  if(await pdf.slice(0,5).text()!=="%PDF-")throw Error("Le fichier reçu n'est pas un PDF.");
  const url=URL.createObjectURL(new Blob([pdf],{type:"application/pdf"}));
  win.location.href=url;setTimeout(()=>URL.revokeObjectURL(url),120000);
 }catch(error){win.close();notice("Lecture refusée : "+error.message,true)}
 finally{busy=false;button.disabled=false}
}
function screen(step){
 el("login-panel").hidden=step!=="login";
 el("activation-panel").hidden=step!=="activate";
 el("photo-panel").hidden=step!=="photo";
 el("library-panel").hidden=step!=="library";
 el("logout").hidden=step==="login";
}
async function authenticate(value){
 token=value;
 const u=await request("/auth/v1/user",{auth:true});
 if(!u?.id||(!u.email_confirmed_at&&!u.phone_confirmed_at))
  throw Error("Veuillez confirmer votre e-mail ou téléphone.");
 userId=u.id;
 const profile=await request("/rest/v1/physix_student_profiles?select=*&auth_user_id=eq."+encodeURIComponent(userId),{auth:true});
 if(!Array.isArray(profile)||!profile.length){screen("activate");notice("Code d’activation et mot de passe requis.");return}
 if(profile[0].enabled===false)throw Error("Votre compte a été suspendu par le professeur.");
 if(!profile[0].avatar_path){screen("photo");notice("La photo de profil est obligatoire.");return}
 await loadLibrary();screen("library");
}
async function submit(event,fn){
 event.preventDefault();if(busy)return;busy=true;
 const b=event.currentTarget.querySelector('button[type="submit"]');if(b)b.disabled=true;
 try{await fn(event.currentTarget)}catch(e){notice(e.message,true)}
 finally{busy=false;if(b)b.disabled=false}
}
el("auth-existing").onclick=()=>{el("login-existing").hidden=false;el("login-new").hidden=true;};
el("auth-new").onclick=()=>{el("login-existing").hidden=true;el("login-new").hidden=false;};
el("signup-channel").onchange=()=>{el("signup-contact").type=el("signup-channel").value==="email"?"email":"tel";};
el("password-form").onsubmit=e=>submit(e,async()=>{
 const id=el("login-identifier").value.trim(),password=el("login-password").value;
 const body=id.includes("@")?{email:id.toLowerCase(),password}:{phone:id,password};
 const result=await request("/auth/v1/token?grant_type=password",{method:"POST",body});
 if(!result.access_token)throw Error("Identifiant ou mot de passe incorrect.");
 await authenticate(result.access_token);
});
el("verify-request").onsubmit=e=>submit(e,async()=>{
 const kind=el("signup-channel").value,contact=el("signup-contact").value.trim();
 if(kind==="phone"&&!/^\+[1-9]\d{7,14}$/.test(contact))throw Error("Format téléphone requis : +2126XXXXXXXX.");
 await request("/auth/v1/otp",{method:"POST",body:kind==="email"?
  {email:contact.toLowerCase(),create_user:true}:{phone:contact,create_user:true}});
 el("verify-confirm").hidden=false;
 notice("Entrez le code de vérification reçu."+(kind==="phone"?" Le fournisseur SMS doit être actif dans Supabase.":""));
});
el("verify-confirm").onsubmit=e=>submit(e,async()=>{
 const kind=el("signup-channel").value,contact=el("signup-contact").value.trim();
 const result=await request("/auth/v1/verify",{method:"POST",body:kind==="email"?
  {email:contact.toLowerCase(),token:el("verify-otp").value.trim(),type:"email"}:
  {phone:contact,token:el("verify-otp").value.trim(),type:"sms"}});
 if(!result.access_token)throw Error("Code de vérification invalide.");
 el("activation-form").elements.code.value=el("signup-activation-code").value.trim().toUpperCase();
 await authenticate(result.access_token);
});
el("activation-form").onsubmit=e=>submit(e,async form=>{
 const v=Object.fromEntries(new FormData(form).entries());
 if(v.password!==v.confirmation)throw Error("Les mots de passe sont différents.");
 if(v.password.length<10)throw Error("Choisissez un mot de passe de 10 caractères minimum.");
 await request("/rest/v1/rpc/physix_activate_pupil",{method:"POST",auth:true,body:{
  p_code:v.code.trim().toUpperCase(),p_class:v.class_code,p_name:v.full_name.trim()}});
 await request("/auth/v1/user",{method:"PUT",auth:true,body:{password:v.password}});
 form.reset();screen("photo");notice("Compte activé. Ajoutez votre photo obligatoire.");
});
el("photo-form").onsubmit=e=>submit(e,async form=>{
 const file=form.elements.photo.files?.[0],extensions={"image/jpeg":"jpg","image/png":"png","image/webp":"webp"};
 if(!file||!(file.type in extensions)||file.size<1||file.size>2097152)
  throw Error("Photo JPG/PNG/WebP obligatoire (maximum 2 Mo).");
 const phone=form.elements.phone.value.trim();
 if(phone&&!/^\+[1-9]\d{7,14}$/.test(phone))throw Error("Téléphone : +2126XXXXXXXX.");
 const path=userId+"/"+crypto.randomUUID().replaceAll("-","").slice(0,24)+"."+extensions[file.type];
 const response=await fetch("https://auqzfcucpglrnvwhjamo.supabase.co/storage/v1/object/physix-avatars/"+path,{
  method:"POST",headers:{"apikey":KEY,"Authorization":"Bearer "+token,"Content-Type":file.type},
  body:file,cache:"no-store",referrerPolicy:"no-referrer"});
 if(!response.ok)throw Error("Photo refusée par le stockage privé ("+response.status+").");
 await request("/rest/v1/physix_student_profiles?auth_user_id=eq."+encodeURIComponent(userId),{
  method:"PATCH",auth:true,body:{avatar_path:path,...(phone?{phone}:{})}});
 await loadLibrary();screen("library");
});
el("logout").addEventListener("click",async()=>{
 const old=token;token=null;userId="";items=[];myProgress=[];classBoard=[];email="";
 window.physixStudentRemises?.clear();
 window.physixStudentQcm?.clear();
 screen("login");notice("Déconnecté. Vous pouvez vous reconnecter.");
 if(old)fetch(BASE+"/auth/v1/logout",{method:"POST",headers:{"apikey":KEY,Authorization:"Bearer "+old}}).catch(()=>{});
});
el("change-photo").addEventListener("click",()=>{screen("photo");notice("Choisissez votre nouvelle photo de profil.");});
el("class-filter").addEventListener("change",event=>{activeClass=event.target.value;draw()});
el("lessons-tab").addEventListener("click",()=>{tab="lesson";draw()});
el("devoirs-tab").addEventListener("click",()=>{tab="devoir";draw()});
(async()=>{
 const hash=new URLSearchParams(location.hash.slice(1));
 const access=hash.get("access_token");
 const error=hash.get("error_description")||hash.get("error");
 if(location.hash)history.replaceState(null,"",location.pathname);
 if(error)return notice("Le lien de connexion n'est plus valide : "+error,true);
 if(!access)return;
 try{await authenticate(access)}catch(e){token=null;setAuthenticated(false);notice("Connexion impossible : "+e.message,true)}
})();
})();