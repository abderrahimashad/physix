/* Google Drive d'enseignant : jeton en mémoire, portée drive.file, aucun lien public.
   Nécessite une configuration OAuth Google Cloud et une validation par le propriétaire. */
(()=>{
"use strict";
const cfg=window.PHYSIX_DRIVE_CONFIG||{};
const SCOPE="https://www.googleapis.com/auth/drive.file";
const DRIVE="https://www.googleapis.com/drive/v3";
const UPLOAD="https://www.googleapis.com/upload/drive/v3/files?uploadType=resumable&fields=id,name,mimeType,size";
const CHUNK=8*1024*1024;
let accessToken=null;
const authorizedFolders=new Set();
const configured=()=>!!(cfg.clientId&&cfg.pickerApiKey&&cfg.appId&&cfg.rootFolderId&&cfg.expectedEmail);
const loadScript=src=>new Promise((resolve,reject)=>{
 const existing=document.querySelector('script[data-drive-source="'+src+'"]');
 if(existing){if(existing.dataset.ready==="yes")return resolve();existing.addEventListener("load",resolve,{once:true});existing.addEventListener("error",reject,{once:true});return}
 const script=document.createElement("script");script.src=src;script.async=true;script.dataset.driveSource=src;
 script.addEventListener("load",()=>{script.dataset.ready="yes";resolve()},{once:true});
 script.addEventListener("error",()=>reject(Error("Bibliothèque Google inaccessible. Vérifiez votre navigateur.")),{once:true});
 document.head.append(script);
});
async function scriptReady(){await Promise.all([
 loadScript("https://accounts.google.com/gsi/client"),
 loadScript("https://apis.google.com/js/api.js")
]);await new Promise((resolve,reject)=>{
 const timeout=setTimeout(()=>reject(Error("Google Picker n'a pas répondu.")),12000);
 window.gapi.load("picker",()=>{clearTimeout(timeout);resolve()});
});}
async function api(url,options={}){
 if(!accessToken)throw Error("Connectez d'abord votre Google Drive.");
 const res=await fetch(url,{...options,headers:{"Authorization":"Bearer "+accessToken,...options.headers},cache:"no-store",referrerPolicy:"no-referrer"});
 if(!res.ok&&res.status!==308){
  if(res.status===401)accessToken=null;
  const body=await res.json().catch(()=>null);
  throw Error(body?.error?.message||"Google Drive a refusé la requête ("+res.status+").");
 }
 return res;
}
async function account(){
 const result=await (await api(DRIVE+"/about?fields=user(emailAddress)")).json();
 const email=result.user?.emailAddress?.toLowerCase()||"";
 if(email!==cfg.expectedEmail.toLowerCase()){
  accessToken=null;authorizedFolders.clear();
  throw Error("Le compte connecté n'est pas "+cfg.expectedEmail+". Reconnectez-vous avec le bon Gmail.");
 }
 return email;
}
async function connect(){
 if(!configured())throw Error("Google Drive pas encore configuré : identifiant OAuth, clé Picker et numéro du projet Google Cloud manquants.");
 await scriptReady();
 await new Promise((resolve,reject)=>{
  const client=window.google.accounts.oauth2.initTokenClient({
   client_id:cfg.clientId,scope:SCOPE,
   callback:response=>{
    if(response.error||!response.access_token)return reject(Error(response.error_description||response.error||"Autorisation Google annulée."));
    accessToken=response.access_token;authorizedFolders.clear();resolve();
   },
   error_callback:()=>reject(Error("Connexion Google annulée ou bloquée par le navigateur."))
  });
  client.requestAccessToken({prompt:"select_account"});
 });
 return account();
}
async function checkFolder(folderId){
 if(authorizedFolders.has(folderId))return folderId;
 try{
  const res=await api(DRIVE+"/files/"+encodeURIComponent(folderId)+"?fields=id,name,mimeType,capabilities(canAddChildren)");
  const data=await res.json();
  if(data.mimeType!=="application/vnd.google-apps.folder"||data.capabilities?.canAddChildren===false)throw Error("Dossier sans permission d'ajout.");
  authorizedFolders.add(folderId);return folderId;
 }catch{return null;}
}
async function selectRootFolder(classCode=""){
 if(!accessToken)throw Error("Connectez d'abord Google Drive.");
 const folderId=cfg.classFolders?.[classCode]||cfg.rootFolderId;
 if(await checkFolder(folderId))return folderId;
 await scriptReady();
 return new Promise((resolve,reject)=>{
  const view=new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
   .setSelectFolderEnabled(true).setIncludeFolders(true);
  const picker=new window.google.picker.PickerBuilder()
   .addView(view).setOAuthToken(accessToken)
   .setDeveloperKey(cfg.pickerApiKey).setAppId(cfg.appId)
   .setTitle("Sélectionnez le dossier Drive « "+(classCode&&cfg.classFolders?.[classCode]?classCode:"PhysiX")+" »")
   .setCallback(async data=>{
     if(data.action===window.google.picker.Action.CANCEL)return reject(Error("Sélection du dossier annulée."));
     if(data.action!==window.google.picker.Action.PICKED)return;
     const picked=data.docs?.[0]?.id;
     if(picked!==folderId)return reject(Error("Choisissez le dossier exact « "+(classCode||"PhysiX")+" ». Aucun accès à un autre dossier n'est demandé."));
     authorizedFolders.delete(folderId);
     try{
       if(!await checkFolder(folderId))throw Error("Google n'a pas permis l'écriture dans le dossier choisi.");
       resolve(folderId);
     }catch(error){reject(error)}
   }).build();
  picker.setVisible(true);
 });
}
async function uploadPdf(file,{classCode='',onProgress}={}){
 if(!accessToken)throw Error("Connectez Google Drive avant de transférer le PDF.");
 if(file.type&&file.type!=="application/pdf")throw Error("Document non PDF.");
 if(!/\.pdf$/i.test(file.name)||file.size<=0)throw Error("Choisissez un PDF valide.");
 const root=await selectRootFolder(classCode);
 const headers={
  "Content-Type":"application/json; charset=UTF-8",
  "X-Upload-Content-Type":"application/pdf",
  "X-Upload-Content-Length":String(file.size)
 };
 const session=await api(UPLOAD,{method:"POST",headers,body:JSON.stringify({
  name:file.name.slice(0,200),mimeType:"application/pdf",parents:[root]
 })});
 const url=session.headers.get("Location");
 if(!url||!url.startsWith("https://"))throw Error("Google n'a pas renvoyé de session d'import. Aucune ressource n'a été liée.");
 let offset=0;
 while(offset<file.size){
  const end=Math.min(offset+CHUNK,file.size);
  const chunk=file.slice(offset,end);
  let result;
  for(let attempt=0;attempt<3;attempt++){
   try{
    result=await api(url,{method:"PUT",headers:{
      "Content-Type":"application/pdf",
      "Content-Range":"bytes "+offset+"-"+(end-1)+"/"+file.size
    },body:chunk});
    break;
   }catch(error){
    if(attempt===2)throw error;
    await new Promise(resolve=>setTimeout(resolve,700*(attempt+1)));
   }
  }
  if(result.status===200||result.status===201){
   const data=await result.json();
   if(!/^[A-Za-z0-9_-]{10,200}$/.test(data.id||""))throw Error("Drive n'a pas confirmé l'identifiant du PDF.");
   onProgress?.(100);
   return {id:data.id,name:data.name||file.name,size:Number(data.size)||file.size};
  }
  if(result.status!==308)throw Error("État inattendu de l'import Google : "+result.status);
  const range=result.headers.get("Range");
  const last=range?.match(/bytes=0-(\d+)/);
  offset=last?Number(last[1])+1:end;
  onProgress?.(Math.round(offset/file.size*100));
 }
 throw Error("Drive n'a pas confirmé la fin du transfert.");
}
async function removePdf(id){
 if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error("Identifiant Google invalide.");
 await api(DRIVE+"/files/"+encodeURIComponent(id),{method:"DELETE"});
}
function openPdf(id){
 if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error("Identifiant Google invalide.");
 // Adresse privée : seul le compte Google autorisé peut l'ouvrir. Ne pas exposer aux élèves.
 window.open("https://drive.google.com/file/d/"+encodeURIComponent(id)+"/view","_blank","noopener,noreferrer");
}
window.physixDrive=Object.freeze({configured,connect,selectRootFolder,uploadPdf,removePdf,openPdf,isConnected:()=>!!accessToken});
})();
