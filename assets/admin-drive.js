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
let expiresAt=0,readyPromise=null;
const authorizedFolders=new Set();
const disconnect=()=>{accessToken=null;expiresAt=0;authorizedFolders.clear()};
const isConnected=()=>!!accessToken&&Date.now()<expiresAt;
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
function prepare(){return readyPromise||(readyPromise=scriptReady().catch(error=>{readyPromise=null;throw error}))}
async function api(url,options={}){
 if(!isConnected()){disconnect();throw Error("Session Google expirée. Reconnectez votre Google Drive.")}
 const target=new URL(url);
 if(target.origin!=="https://www.googleapis.com"||target.username||target.password||
   !/^\/(?:upload\/)?drive\/v3\//.test(target.pathname))throw Error("Destination Google Drive non autorisée.");
 let res;
 try{res=await fetch(url,{...options,headers:{...options.headers,"Authorization":"Bearer "+accessToken},cache:"no-store",referrerPolicy:"no-referrer",redirect:"error",signal:AbortSignal.timeout(120000)});}
 catch{throw Object.assign(Error("Connexion Google interrompue. Réessayez depuis cette page."),{retryable:true})}
 if(!res.ok&&res.status!==308){
  if(res.status===401)disconnect();
  throw Object.assign(Error("Google Drive a refusé la requête ("+res.status+")."),{status:res.status,retryable:res.status===429||res.status>=500});
 }
 return res;
}
async function account(){
 const result=await (await api(DRIVE+"/about?fields=user(emailAddress)")).json();
 const email=result.user?.emailAddress?.toLowerCase()||"";
 if(email!==cfg.expectedEmail.toLowerCase()){
  disconnect();
  throw Error("Le compte connecté n'est pas "+cfg.expectedEmail+". Reconnectez-vous avec le bon Gmail.");
 }
 return email;
}
async function connect(){
 if(!configured())throw Error("Google Drive pas encore configuré : identifiant OAuth, clé Picker et numéro du projet Google Cloud manquants.");
 await prepare();
 await new Promise((resolve,reject)=>{
  const client=window.google.accounts.oauth2.initTokenClient({
   client_id:cfg.clientId,scope:SCOPE,include_granted_scopes:false,
   callback:response=>{
    if(response.error||!response.access_token)return reject(Error(response.error_description||response.error||"Autorisation Google annulée."));
    if(!window.google.accounts.oauth2.hasGrantedAllScopes(response,SCOPE))return reject(Error("L'accès aux fichiers PhysiX n'a pas été accordé."));
    accessToken=response.access_token;expiresAt=Date.now()+Number(response.expires_in||3600)*1000-30000;authorizedFolders.clear();resolve();
   },
   error_callback:()=>reject(Error("Connexion Google annulée ou bloquée par le navigateur."))
  });
  client.requestAccessToken({prompt:"select_account"});
 });
 try{return await account()}catch(error){disconnect();throw error}
}
async function checkFolder(folderId){
 if(authorizedFolders.has(folderId))return folderId;
 try{
  const res=await api(DRIVE+"/files/"+encodeURIComponent(folderId)+"?fields=id,name,mimeType,trashed,ownedByMe,permissions(type),capabilities(canAddChildren)");
  const data=await res.json();
  if(data.mimeType!=="application/vnd.google-apps.folder"||data.trashed||!data.ownedByMe||data.capabilities?.canAddChildren!==true||!Array.isArray(data.permissions)||data.permissions.some(p=>p.type!=="user"))throw Error("Choisissez un dossier privé dont vous êtes propriétaire.");
  authorizedFolders.add(folderId);return folderId;
 }catch(error){if(error.status===404)return null;throw error}
}
async function selectRootFolder(classCode=""){
 if(!isConnected())throw Error("Connectez d'abord Google Drive.");
 const folderId=classCode?cfg.classFolders?.[classCode]:cfg.rootFolderId;
 if(!folderId)throw Error("Cette classe n'a pas encore de dossier Drive configuré. Aucun fichier n'a été envoyé.");
 if(await checkFolder(folderId))return folderId;
 await prepare();
 return new Promise((resolve,reject)=>{
  const view=new window.google.picker.DocsView(window.google.picker.ViewId.FOLDERS)
   .setSelectFolderEnabled(true).setIncludeFolders(true);
  const picker=new window.google.picker.PickerBuilder()
   .addView(view).setOAuthToken(accessToken)
   .setDeveloperKey(cfg.pickerApiKey).setAppId(cfg.appId).setOrigin(location.origin)
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
 if(!isConnected())throw Error("Connectez Google Drive avant de transférer le PDF.");
 if(file.type&&file.type!=="application/pdf")throw Error("Document non PDF.");
 if(!/\.pdf$/i.test(file.name)||file.size<=0||file.size>5497558138880||await file.slice(0,5).text()!=="%PDF-")throw Error("Choisissez un PDF valide.");
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
 if(!url)throw Error("Google n'a pas renvoyé de session d'import. Aucune ressource n'a été liée.");
 let offset=0,failures=0,probe=false;
 while(failures<5){
  const end=Math.min(offset+CHUNK,file.size);
  let result;
  try{
    result=await api(url,{method:"PUT",headers:{
      "Content-Type":"application/pdf",
      "Content-Range":probe?"bytes */"+file.size:"bytes "+offset+"-"+(end-1)+"/"+file.size
    },body:probe?new Blob([]):file.slice(offset,end)});
  }catch(error){
   if(!error.retryable)throw error;
   failures++;probe=true;
   await new Promise(resolve=>setTimeout(resolve,Math.min(1000*2**failures,8000)));
   continue;
  }
  if(result.status===200||result.status===201){
   const data=await result.json();
   if(!/^[A-Za-z0-9_-]{10,200}$/.test(data.id||"")||data.mimeType!=="application/pdf"||Number(data.size)!==file.size)throw Error("Drive n'a pas confirmé le PDF complet.");
   onProgress?.(100);
   return {id:data.id,name:data.name||file.name,size:Number(data.size)};
  }
  if(result.status!==308)throw Error("État inattendu de l'import Google : "+result.status);
  const range=result.headers.get("Range");
  const last=range?.match(/bytes=0-(\d+)/);
  const next=last?Number(last[1])+1:0;
  if(next<0||next>file.size)throw Error("Position d'import Google invalide.");
  failures=next>offset?0:failures+1;
  offset=next;probe=offset===file.size;
  onProgress?.(Math.round(offset/file.size*100));
 }
 throw Error("Drive n'a pas confirmé la fin du transfert.");
}
async function removePdf(id){
 if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error("Identifiant Google invalide.");
 const url=DRIVE+"/files/"+encodeURIComponent(id);
 const file=await (await api(url+"?fields=mimeType,ownedByMe,parents")).json();
 const folders=new Set(Object.values(cfg.classFolders||{}));
 if(!file.ownedByMe||file.mimeType!=="application/pdf"||!file.parents?.some(parent=>folders.has(parent)))throw Error("Suppression refusée : PDF extérieur aux dossiers PhysiX.");
 await api(url+"?fields=id,trashed",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({trashed:true})});
}
async function downloadPdf(id,classCode){
 if(!isConnected())throw Error("Reconnectez votre Google Drive.");
 if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error("PDF Google invalide.");
 const folderId=cfg.classFolders?.[classCode];
 if(!folderId)throw Error("Dossier Google Drive de cette classe non configuré.");
 const url=DRIVE+"/files/"+encodeURIComponent(id);
 const meta=await (await api(url+"?fields=id,mimeType,ownedByMe,trashed,parents,size")).json();
 if(!meta.ownedByMe||meta.trashed||meta.mimeType!=="application/pdf"||
  !meta.parents?.includes(folderId))throw Error("Ce PDF n'appartient pas au dossier privé de la classe.");
 if(Number(meta.size)>50*1024*1024)throw Error("Ce fichier dépasse 50 Mo, limite actuelle pour la copie privée destinée aux élèves.");
 const blob=await (await api(url+"?alt=media")).blob();
 if(!blob.size||blob.size>50*1024*1024||await blob.slice(0,5).text()!=="%PDF-")
  throw Error("Le document reçu depuis Google Drive n'est pas un PDF valide.");
 return blob;
}
function openPdf(id){
 if(!/^[A-Za-z0-9_-]{10,200}$/.test(id))throw Error("Identifiant Google invalide.");
 // Adresse privée : seul le compte Google autorisé peut l'ouvrir. Ne pas exposer aux élèves.
 window.open("https://drive.google.com/file/d/"+encodeURIComponent(id)+"/view","_blank","noopener,noreferrer");
}
window.physixDrive=Object.freeze({configured,prepare,connect,disconnect,selectRootFolder,uploadPdf,downloadPdf,removePdf,openPdf,isConnected});
})();
