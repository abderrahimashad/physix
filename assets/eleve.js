/* PhysiX — student access: teacher whitelist, short-lived in-memory session, owner-published PDFs only. */
(()=>{
"use strict";
const BASE="https://auqzfcucpglrnvwhjamo.supabase.co";
const KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const el=id=>document.getElementById(id);
const escape=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
let token=null,email="",items=[],activeClass="",tab="lesson",busy=false;
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
 const result=await request("/rest/v1/rpc/physix_my_student_library",{method:"POST",body:{},auth:true});
 items=Array.isArray(result)?result:[];
 const classes=[...new Set(items.map(x=>x.class_code))].sort();
 activeClass=classes.includes(activeClass)?activeClass:(classes[0]||"");
 el("class-filter").innerHTML=classes.map(c=>'<option value="'+escape(c)+'">'+escape(c)+'</option>').join("");
 el("class-filter").value=activeClass;el("class-filter").disabled=classes.length<2;
 setAuthenticated(true);
 notice(items.length?"Connexion vérifiée. Voici les documents publiés pour votre classe.":"Connexion réussie. Aucun document n'est encore publié pour votre adresse et votre classe.");
 draw();
}
function draw(){
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
async function authenticate(value){
 token=value;
 const user=await request("/auth/v1/user",{auth:true});
 if(!user?.id||!user.email_confirmed_at)throw Error("L'adresse e-mail doit être vérifiée.");
 email=user.email||"";
 await loadLibrary();
}
el("email-form").addEventListener("submit",async event=>{
 event.preventDefault();if(busy)return;
 const address=el("student-email").value.trim().toLowerCase();
 if(!address||address.length>254)return;
 busy=true;const button=el("email-form").querySelector("button");button.disabled=true;
 try{
  await request("/auth/v1/otp?redirect_to="+encodeURIComponent(location.origin+"/eleve.html"),{method:"POST",body:{email:address,create_user:true}});
  notice("Un e-mail a été envoyé si l'adresse est autorisée. Cliquez sur le lien reçu pour ouvrir votre espace.");
 }catch(error){notice("Impossible d'envoyer le lien : "+error.message,true)}
 finally{button.disabled=false;busy=false}
});
el("otp-form").addEventListener("submit",async event=>{
 event.preventDefault();if(busy)return;
 const address=el("student-email").value.trim().toLowerCase();
 if(!address)return notice("Saisissez d'abord votre adresse e-mail.",true);
 busy=true;
 try{
  const result=await request("/auth/v1/verify",{method:"POST",body:{email:address,token:el("otp-code").value.trim(),type:"email"}});
  if(!result?.access_token)throw Error("Code de connexion incorrect.");
  await authenticate(result.access_token);
 }catch(error){notice(error.message,true)}
 finally{busy=false}
});
el("logout").addEventListener("click",async()=>{
 const old=token;token=null;items=[];email="";
 setAuthenticated(false);notice("Déconnecté. Vous pouvez vous reconnecter.");
 if(old)fetch(BASE+"/auth/v1/logout",{method:"POST",headers:{"apikey":KEY,Authorization:"Bearer "+old}}).catch(()=>{});
});
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