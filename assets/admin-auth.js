/* PhysiX — activation du propriétaire uniquement. Aucune donnée élève. Clé publishable (non secrète). */
(()=>{
"use strict";
const SUPABASE_URL="https://auqzfcucpglrnvwhjamo.supabase.co";
const PUBLISHABLE_KEY="sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2";
const HEADERS={"apikey":PUBLISHABLE_KEY,"Content-Type":"application/json"};
const form=document.getElementById("owner-form");
const activation=document.getElementById("activation-form");
const message=document.getElementById("auth-message");
function say(text,kind="info"){message.textContent=text;message.className="auth-message "+kind;message.setAttribute("role","status")}
async function request(path,options={}){
 const response=await fetch(SUPABASE_URL+path,{...options,headers:{...HEADERS,...(options.headers||{})},cache:"no-store",referrerPolicy:"no-referrer"});
 const data=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(data?.msg||data?.error_description||data?.message||"Échec de la requête d’authentification.");
 return data;
}
async function isOwner(token){
 const response=await request("/rest/v1/physix_owners?select=user_id&limit=1",{headers:{"Authorization":"Bearer "+token}});
 return Array.isArray(response)&&response.length===1?response[0].user_id:null;
}
if(form){
 const recovery=form.querySelector("#request-recovery");
 recovery.addEventListener("click",async()=>{
  const email=form.elements.email.value.trim();
  if(!email||!form.elements.email.checkValidity()){say("Indiquez d’abord votre adresse email valide.","error");return}
  recovery.disabled=true;
  try{
   const redirect=location.origin+"/auth-confirm";
   await request("/auth/v1/recover?redirect_to="+encodeURIComponent(redirect),{method:"POST",body:JSON.stringify({email})});
   say("Si ce compte existe, un email de réinitialisation sera envoyé. Ouvrez uniquement le message le plus récent.","success");
  }catch{say("L'envoi du lien a échoué. Vérifiez la configuration de redirection Supabase et réessayez plus tard.","error")}
  finally{recovery.disabled=false}
 });
 form.addEventListener("submit",async event=>{
  event.preventDefault();
  const button=form.querySelector("button[type=submit]");
  const email=form.elements.email.value.trim(),password=form.elements.password.value;
  if(!email||!password)return;
  button.disabled=true;say("Vérification de vos identifiants…");
  let authenticated=false;
  try{
   const session=await request("/auth/v1/token?grant_type=password",{method:"POST",body:JSON.stringify({email,password})});
   if(!session.access_token)throw new Error("Session de connexion manquante.");
   const ownerId=await isOwner(session.access_token);
   if(!ownerId){
    say("Compte reconnu, mais aucun droit propriétaire PhysiX n'est attribué à ce compte.","error");
    return;
   }
   authenticated=true;
   form.reset();
   if(typeof window.physixAdminStart==="function"){
     await window.physixAdminStart(session.access_token,ownerId);
     say("Connexion propriétaire validée. Gestion des fiches sécurisées activée.","success");
   }else say("Compte propriétaire reconnu. Module de gestion indisponible sur cette page.","success");
  }catch(error){
    if(authenticated){say("Compte connecté, mais erreur de chargement de la gestion. Consultez le message sous le formulaire.","error");}
    else{say("Connexion impossible. Vérifiez votre email, votre mot de passe et l’activation du compte.","error")}
  }
  finally{button.disabled=false}
 });
}
if(activation){
 // Le fragment (#access_token=...) reste uniquement dans le navigateur.
 const values=new URLSearchParams(location.hash.slice(1));
 const accessToken=values.get("access_token");
 const type=values.get("type");
 const authError=values.get("error_description")||values.get("error");
 history.replaceState(null,"",location.pathname);
 if(authError){say("Lien expiré ou invalide. Demandez une nouvelle invitation après correction des URL Supabase.","error");activation.hidden=true;return}
 if(!accessToken||!["invite","recovery"].includes(type)){
  say("Aucun lien d'activation valide. Ouvrez le lien le plus récent reçu par email.","error");
  activation.hidden=true;return;
 }
 // Les liens sont à usage unique ; validation serveur avant toute mise à jour.
 let valid=false;
 (async()=>{
  try{
   const owner=await isOwner(accessToken);
   if(!owner)throw new Error("Owner not authorized");
   await request("/auth/v1/user",{headers:{"Authorization":"Bearer "+accessToken}});
   valid=true;
   say("Invitation vérifiée. Choisissez un mot de passe fort pour votre compte propriétaire.","success");
   activation.hidden=false;
  }catch{say("Ce lien n'est plus valide ou n'appartient pas au propriétaire autorisé. Demandez une nouvelle invitation.","error");activation.hidden=true}
 })();
 activation.addEventListener("submit",async event=>{
  event.preventDefault();if(!valid)return;
  const password=activation.elements.password.value,confirm=activation.elements.confirm.value;
  if(password.length<12||password!==confirm){say("Utilisez au moins 12 caractères et confirmez exactement le mot de passe.","error");return}
  const button=activation.querySelector("button[type=submit]");button.disabled=true;
  try{
   await request("/auth/v1/user",{method:"PUT",headers:{"Authorization":"Bearer "+accessToken},body:JSON.stringify({password})});
   valid=false;activation.reset();activation.hidden=true;
   say("Mot de passe configuré. Vous pouvez maintenant ouvrir l'espace Administration et vous connecter.","success");
   document.getElementById("go-admin").hidden=false;
  }catch{say("Impossible de définir le mot de passe. Le lien a peut-être expiré ; demandez une nouvelle invitation.","error")}
  finally{button.disabled=false}
 });
}
})();