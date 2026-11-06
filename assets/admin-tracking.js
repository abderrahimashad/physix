/* PhysiX — suivi de classe privé, sauvegardé dans Supabase RLS. */
(()=>{
"use strict";
const EVENTS={
 participation:["🙋","Participation"],
 exercise:["✍️","Exercice réalisé"],
 homework:["📘","Devoir à la maison"],
 expose:["🎤","Exposé"],
 notebook:["📒","Cahier à jour"],

 positive:["⭐","Effort / progrès"],
 disturbance:["⚠️","Perturbation du cours"],
 absence:["🚫","Absence"],
 late:["🕒","Retard"],
 note:["📝","Observation"]
};
const TYPES=Object.keys(EVENTS);
const normalize=s=>String(s||"").trim().replace(/\s+/g," ").toLocaleLowerCase("fr");
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const csv=s=>{let t=String(s??"");if(/^[=+@\-\t\r]/.test(t))t="'"+t;return '"'+t.replace(/"/g,'""')+'"';};
const labels=Object.entries(EVENTS);
window.physixTrackingRender=(root,{rows,session,rest})=>{
 const classes=(rows.classes||[]).filter(c=>c.active);
 const area=document.createElement("section");
 area.className="content-section tracking-section";
 area.innerHTML='<div class="track-heading"><div><h3>📊 Suivi des élèves et note d’activité</h3>'+
 '<p>Journal pédagogique privé : une action = un événement daté. Les notes sur 20 sont saisies et validées par le professeur.</p></div>'+
 '<a href="/admin" class="track-back">Mes documents</a></div>'+
 '<div class="track-toolbar"><label>Classe<select id="track-class"></select></label>'+
 '<label>Semestre<select id="track-semester"><option value="1">Semestre 1</option><option value="2">Semestre 2</option></select></label>'+
 '<label>Date<input id="track-date" type="date"></label></div>'+
 '<div class="track-note" id="track-status" role="status" aria-live="polite"></div>'+
 '<details class="track-roster"><summary>➕ Ajouter des élèves à la liste</summary>'+
 '<form id="track-add-form"><label>Noms des élèves (un par ligne, maximum 60)<textarea id="track-names" rows="5" maxlength="8000" placeholder="Nom Prénom\nNom Prénom"></textarea></label>'+
 '<button type="submit">Enregistrer les noms dans cette classe</button></form>'+
 '<small>Les noms sont conservés dans la base privée de PhysiX. N’entrez pas de données supplémentaires sur les élèves.</small></details>'+
 '<div class="track-tools"><label>Rechercher<input id="track-search" type="search" placeholder="Nom de l’élève"></label>'+
 '<button type="button" id="track-export">Exporter le bilan CSV</button></div>'+
 '<div id="track-summary" class="track-summary"></div>'+
 '<div id="track-list" class="track-list"></div>'+
 '<details id="track-history" class="track-history"><summary>Historique des observations et annulation</summary><div id="track-history-list"></div></details>';
 root.append(area);
 const q=s=>area.querySelector(s),status=(text,bad=false)=>{const x=q("#track-status");x.textContent=text;x.classList.toggle("bad",bad)};
 let classroom=classes[0]?.code||"",semester=1,pupils=[],events=[],grades=[],profiles=[],busy=false,loading=false;
 const portraits=new Map();
 const now=new Date();q("#track-date").value=[now.getFullYear(),String(now.getMonth()+1).padStart(2,"0"),String(now.getDate()).padStart(2,"0")].join("-");
 q("#track-class").innerHTML=classes.map(c=>'<option value="'+esc(c.code)+'">'+esc(c.code)+'</option>').join("");
 const key=(p,k)=>events.filter(e=>e.pupil_id===p.id&&e.kind===k).length;
 const grade=p=>grades.find(x=>x.pupil_id===p.id)?.grade??null;
 const ev=(label,n)=>'<span class="track-stat"><strong>'+n+'</strong><small>'+esc(label)+'</small></span>';
 async function load(){
  if(!classroom){status("Ajoutez une classe dans « Mes classes » pour commencer.");q("#track-list").innerHTML="";return}
  if(loading)return;
  loading=true;status("Chargement des données privées…");
  try{
   const base="?select=*&order=full_name.asc&active=eq.true&class_code=eq."+encodeURIComponent(classroom);
   const [a,b,c,d]=await Promise.all([
    rest("pupils",base),
    rest("activity_events","?select=*&class_code=eq."+encodeURIComponent(classroom)+"&semester=eq."+semester+"&order=created_at.desc&limit=1000"),
    rest("activity_grades","?select=*&semester=eq."+semester+"&limit=1000"),
    rest("student_profiles","?select=auth_user_id,pupil_id,avatar_path,phone,display_name&class_code=eq."+encodeURIComponent(classroom)+"&limit=500")
   ]);
   pupils=a;events=b;grades=c.filter(g=>a.some(p=>p.id===g.pupil_id));profiles=d;
   await loadPortraits();
   draw();status((events.length===1000?"⚠ Historique limité aux 1000 événements les plus récents pour ce semestre.":"Données enregistrées et accessibles uniquement au professeur.")+
    " · "+pupils.length+" élève(s).");
  }catch(error){status("Impossible de charger le suivi : "+error.message,true)}
  finally{loading=false}
 }
 async function loadPortraits(){
  for(const url of portraits.values())URL.revokeObjectURL(url);
  portraits.clear();
  for(const p of profiles){
   if(!p.avatar_path)continue;
   try{
    const path=p.avatar_path.split("/").map(encodeURIComponent).join("/");
    const response=await fetch("https://auqzfcucpglrnvwhjamo.supabase.co/storage/v1/object/authenticated/physix-avatars/"+path,{
     headers:{apikey:"sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2",Authorization:"Bearer "+session.token},
     cache:"no-store",referrerPolicy:"no-referrer"});
    if(!response.ok)continue;
    const blob=await response.blob();
    if(blob.size<=2097152&&["image/jpeg","image/png","image/webp"].includes(blob.type))
     portraits.set(p.pupil_id,URL.createObjectURL(blob));
   }catch{/* Portrait indisponible : suivi sans photo. */}
  }
 }
 function draw(){
  const filter=normalize(q("#track-search").value);
  const visible=pupils.filter(p=>normalize(p.full_name).includes(filter));
  const positives=["participation","exercise","homework","expose","notebook","positive"];
  const positiveCount=events.filter(e=>positives.includes(e.kind)).length;
  q("#track-summary").innerHTML=ev("Élèves",pupils.length)+ev("Activités positives enregistrées",positiveCount)+
   ev("Absences",events.filter(e=>e.kind==="absence").length)+ev("Retards",events.filter(e=>e.kind==="late").length);
  q("#track-list").innerHTML=visible.length?visible.map(p=>{
   const actions=labels.map(([k,[icon,name]])=>'<button type="button" class="'+(k==="disturbance"?"track-caution":"")+
    '" data-event="'+esc(k)+'" data-pupil="'+esc(p.id)+'" title="'+esc(name)+'">'+icon+' '+esc(name)+'</button>').join("");
   return '<article class="track-pupil"><div class="track-pupil-head"><div class="track-ident">'+
    (portraits.has(p.id)?'<img class="track-avatar" alt="Photo de '+esc(p.full_name)+'" src="'+esc(portraits.get(p.id))+'">':
    '<span class="track-avatar-empty" aria-hidden="true">👤</span>')+
    '<strong>'+esc(p.full_name)+'</strong></div>'+
    '<span class="track-total">Participation '+key(p,"participation")+' · Exercices '+key(p,"exercise")+
    ' · Devoirs '+key(p,"homework")+' · Absences '+key(p,"absence")+'</span></div>'+
    '<div class="track-actions">'+actions+'</div>'+
    '<div class="track-grade"><label>Note d’activité / 20 (saisie manuelle)<input type="number" min="0" max="20" step="0.25" placeholder="Non noté" value="'+
    (grade(p)===null?"":grade(p))+'" data-grade="'+esc(p.id)+'"></label>'+
    '<button type="button" data-save-grade="'+esc(p.id)+'">Enregistrer la note</button>'+
    '<button type="button" data-code="'+esc(p.id)+'">🔑 Code d’activation</button>'+
    '<button type="button" data-archive="'+esc(p.id)+'" class="track-secondary">Retirer de la liste</button></div></article>';
  }).join(""):'<p class="track-empty">'+(pupils.length?"Aucun élève ne correspond à la recherche.":"Ajoutez les élèves de cette classe pour commencer le suivi.")+'</p>';
  q("#track-history-list").innerHTML=events.length?events.slice(0,80).map(e=>{
   const p=pupils.find(p=>p.id===e.pupil_id);
   return '<div class="track-log"><span>'+esc(e.occurred_on)+" · "+esc(p?.full_name||"Élève retiré")+" · "+
    esc(EVENTS[e.kind]?.[1]||e.kind)+(e.details?" · "+esc(e.details):"")+'</span>'+
    '<button type="button" data-undo="'+esc(e.id)+'">Annuler</button></div>';
  }).join(""):"<p>Aucune activité enregistrée.</p>";
  q("#track-list").querySelectorAll("[data-event]").forEach(button=>button.addEventListener("click",()=>addEvent(button)));
  q("#track-list").querySelectorAll("[data-save-grade]").forEach(button=>button.addEventListener("click",()=>saveGrade(button)));
  q("#track-list").querySelectorAll("[data-archive]").forEach(button=>button.addEventListener("click",()=>archivePupil(button)));
  q("#track-list").querySelectorAll("[data-code]").forEach(button=>button.addEventListener("click",()=>issueCode(button)));
  q("#track-history-list").querySelectorAll("[data-undo]").forEach(button=>button.addEventListener("click",()=>undo(button)));
 }
 async function addEvent(button){
  if(busy)return;
  const pupil=pupils.find(p=>p.id===button.dataset.pupil);
  const kind=button.dataset.event;
  if(!pupil||!TYPES.includes(kind))return;
  const date=q("#track-date").value;
  if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||new Date(date+"T00:00:00")>new Date(Date.now()+86400000))
   return status("Date invalide.",true);
  let details="";
  if(["disturbance","note","positive"].includes(kind)){
   const answer=prompt("Note factuelle facultative (max. 300 caractères) :", "");
   if(answer===null)return;
   details=answer.trim().slice(0,300);
  }
  busy=true;button.disabled=true;
  try{
   const result=await rest("activity_events","","POST",{owner_id:session.ownerId,pupil_id:pupil.id,
    class_code:classroom,semester,kind,occurred_on:date,details});
   if(!Array.isArray(result)||result.length!==1)throw Error("Enregistrement non confirmé.");
   events.unshift(result[0]);draw();status(EVENTS[kind][1]+" enregistré pour "+pupil.full_name+".");
  }catch(error){status(error.message,true)}
  finally{busy=false;button.disabled=false}
 }
 async function issueCode(button){
  if(busy)return;
  const pupil=pupils.find(x=>x.id===button.dataset.code);if(!pupil)return;
  if(!confirm("Créer un nouveau code pour "+pupil.full_name+" ? L'ancien code, s'il existe, ne sera plus utilisable."))return;
  busy=true;button.disabled=true;
  try{
   const response=await fetch("https://auqzfcucpglrnvwhjamo.supabase.co/rest/v1/rpc/physix_issue_activation",{
    method:"POST",headers:{apikey:"sb_publishable_5x4US_lL-yMa5RxlViAL6g_AokDwlx2",
     Authorization:"Bearer "+session.token,"Content-Type":"application/json"},
    body:JSON.stringify({p_pupil_id:pupil.id}),cache:"no-store",referrerPolicy:"no-referrer"});
   if(!response.ok)throw Error("Code non créé ("+response.status+").");
   const code=await response.json();
   if(typeof code!=="string"||!/^[A-F0-9]{24}$/.test(code))throw Error("Code non confirmé.");
   prompt("Code valable 14 jours pour "+pupil.full_name+
    " — à donner en privé à cet élève. Copiez-le maintenant :",code);
   status("Code d’activation généré. Il doit être communiqué de façon privée à l’élève.");
  }catch(e){status(e.message,true)}
  finally{busy=false;button.disabled=false}
 }
 async function saveGrade(button){
  if(busy)return;
  const pupil=pupils.find(p=>p.id===button.dataset.saveGrade);
  if(!pupil)return;
  const input=q('[data-grade="'+pupil.id+'"]'),raw=input.value.trim();
  if(raw==="")return status("Laissez la note vide tant qu'elle n'est pas évaluée. Pour corriger une note, entrez une valeur de 0 à 20.",true);
  const value=Number(raw);
  if(!Number.isFinite(value)||value<0||value>20)return status("La note doit être comprise entre 0 et 20.",true);
  busy=true;button.disabled=true;
  try{
   const existing=grades.find(g=>g.pupil_id===pupil.id);
   const result=existing?
    await rest("activity_grades","?id=eq."+encodeURIComponent(existing.id),"PATCH",{grade:value}):
    await rest("activity_grades","","POST",{owner_id:session.ownerId,pupil_id:pupil.id,semester,grade:value});
   if(!Array.isArray(result)||result.length!==1)throw Error("Note non confirmée.");
   grades=grades.filter(x=>x.pupil_id!==pupil.id).concat(result[0]);
   status("Note de "+pupil.full_name+" : "+value.toLocaleString("fr-FR")+"/20. Saisie par le professeur.");
   draw();
  }catch(error){status(error.message,true)}
  finally{busy=false;button.disabled=false}
 }
 async function undo(button){
  if(busy)return;
  const item=events.find(x=>x.id===button.dataset.undo);
  if(!item||!confirm("Annuler cet événement enregistré le "+item.occurred_on+" ?"))return;
  busy=true;button.disabled=true;
  try{
   const result=await rest("activity_events","?id=eq."+encodeURIComponent(item.id),"DELETE");
   if(!Array.isArray(result)||result.length!==1)throw Error("Suppression non confirmée.");
   events=events.filter(x=>x.id!==item.id);draw();status("Observation annulée.");
  }catch(error){status(error.message,true)}
  finally{busy=false;button.disabled=false}
 }
 async function archivePupil(button){
  if(busy)return;
  const pupil=pupils.find(x=>x.id===button.dataset.archive);
  if(!pupil||!confirm("Retirer "+pupil.full_name+" de la liste active ? Son historique est conservé."))return;
  busy=true;button.disabled=true;
  try{
   const result=await rest("pupils","?id=eq."+encodeURIComponent(pupil.id),"PATCH",{active:false});
   if(!Array.isArray(result)||result.length!==1)throw Error("Modification non confirmée.");
   pupils=pupils.filter(x=>x.id!==pupil.id);draw();status("Élève archivé sans suppression de son historique.");
  }catch(error){status(error.message,true)}
  finally{busy=false;button.disabled=false}
 }
 q("#track-add-form").addEventListener("submit",async e=>{
  e.preventDefault();if(busy)return;
  const names=q("#track-names").value.split(/\r?\n/).map(s=>s.trim().replace(/\s+/g," ")).filter(Boolean);
  const unique=[...new Set(names.map(normalize))];
  if(!classroom||names.length<1||names.length>60||unique.length!==names.length||
   names.some(s=>s.length<2||s.length>120))
   return status("Entrez entre 1 et 60 noms valides et sans doublons.",true);
  if(names.some(s=>pupils.some(p=>normalize(p.full_name)===normalize(s))))
   return status("Un nom existe déjà dans la classe. Retirez le doublon et réessayez.",true);
  busy=true;const button=q("#track-add-form button");button.disabled=true;
  try{
   const records=names.map(full_name=>({owner_id:session.ownerId,class_code:classroom,full_name,active:true}));
   const result=await rest("pupils","","POST",records);
   if(!Array.isArray(result)||result.length!==names.length)throw Error("La liste n'a pas été enregistrée entièrement.");
   q("#track-names").value="";
   await load();status(names.length+" élève(s) ajouté(s) dans "+classroom+".");
  }catch(error){status(error.message,true)}
  finally{busy=false;button.disabled=false}
 });
 q("#track-class").addEventListener("change",e=>{classroom=e.target.value;load()});
 q("#track-semester").addEventListener("change",e=>{semester=Number(e.target.value);load()});
 q("#track-search").addEventListener("input",draw);
 q("#track-export").addEventListener("click",()=>{
  if(!pupils.length)return status("Aucun élève à exporter.",true);
  const order=["participation","exercise","homework","expose","notebook","positive","disturbance","absence","late","note"];
  const lines=[["Élève","Classe","Semestre",...order.map(k=>EVENTS[k][1]),"Note activité /20"].map(csv).join(";")];
  pupils.forEach(p=>lines.push([p.full_name,classroom,String(semester),...order.map(k=>key(p,k)),grade(p)??""].map(csv).join(";")));
  const blob=new Blob(["\ufeff"+lines.join("\r\n")],{type:"text/csv;charset=utf-8"});
  const url=URL.createObjectURL(blob);
  const a=document.createElement("a");a.href=url;a.download="physix-suivi-"+classroom.replace(/[^a-z0-9]/gi,"_")+
   "-S"+semester+".csv";document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  status("Bilan exporté localement. Gardez ce fichier confidentiel.");
 });
 load();
};
})();